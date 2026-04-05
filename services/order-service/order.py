import os
import re
from decimal import Decimal
from functools import lru_cache
from typing import Any
from urllib.parse import quote_plus

from dotenv import load_dotenv
from flask import Flask, request
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

load_dotenv("../.env")

app = Flask(__name__)

DB_HOST = os.getenv("ORDER_DB_HOST")
DB_PORT = os.getenv("ORDER_DB_PORT", "5432")
DB_NAME = os.getenv("ORDER_DB_NAME", "orders")
DB_USER = os.getenv("ORDER_DB_USER")
DB_PASSWORD = os.getenv("ORDER_DB_PASSWORD")

COLUMN_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
ALLOWED_COLUMNS = {
	"user_id",
	"listing_id",
	"status",
	"total_paid",
	"point_id",
	"payment_id",
	"qty",
}
KEY_ALIASES = {
	"userId": "user_id",
	"listingId": "listing_id",
	"totalPaid": "total_paid",
	"pointId": "point_id",
	"paymentId": "payment_id",
}


def _database_url() -> str:
	explicit_url = os.getenv("DATABASE_URL")
	if explicit_url:
		return explicit_url

	missing = [
		key
		for key, value in {
			"ORDER_DB_HOST": DB_HOST,
			"ORDER_DB_USER": DB_USER,
			"ORDER_DB_PASSWORD": DB_PASSWORD,
		}.items()
		if not value
	]
	if missing:
		raise RuntimeError(f"Missing required DB env vars: {', '.join(missing)}")

	return (
		f"postgresql+psycopg://{DB_USER}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
	)


@lru_cache(maxsize=1)
def _db_engine() -> Engine:
	return create_engine(_database_url(), pool_pre_ping=True)


def _normalize_input(payload: dict[str, Any]) -> dict[str, Any]:
	normalized: dict[str, Any] = {}
	for key, value in payload.items():
		mapped_key = KEY_ALIASES.get(key, key)
		if not COLUMN_NAME_PATTERN.match(mapped_key):
			raise ValueError(f"Invalid column name: {mapped_key}")
		if mapped_key not in ALLOWED_COLUMNS:
			raise ValueError(f"Unsupported field: {mapped_key}")
		normalized[mapped_key] = value
	return normalized


def _serialize_row(row: dict[str, Any]) -> dict[str, Any]:
	total_paid = row.get("total_paid")
	if isinstance(total_paid, Decimal):
		total_paid = float(total_paid)

	created_at = row.get("created_at")
	created_at_value = created_at.isoformat() if created_at else None

	return {
		"id": row.get("id"),
		"userId": row.get("user_id"),
		"listingId": row.get("listing_id"),
		"status": row.get("status"),
		"totalPaid": total_paid,
		"pointId": row.get("point_id"),
		"paymentId": row.get("payment_id"),
		"qty": row.get("qty"),
		"createdAt": created_at_value,
	}


@app.get("/health")
def health_check() -> tuple[dict[str, str], int]:
	return {"status": "ok"}, 200


@app.get("/")
def list_orders() -> tuple[dict[str, Any], int]:
	limit = request.args.get("limit", default=10, type=int)
	safe_limit = max(1, min(limit, 100))

	try:
		with _db_engine().connect() as connection:
			rows = connection.execute(
				text("SELECT * FROM orders ORDER BY id DESC LIMIT :limit"),
				{"limit": safe_limit},
			).mappings().all()
			return {
				"count": len(rows),
				"items": [_serialize_row(dict(row)) for row in rows],
			}, 200
	except SQLAlchemyError as error:
		return {"error": f"Failed to query orders: {error}"}, 500


@app.get("/<int:order_id>")
def get_order(order_id: int) -> tuple[dict[str, Any], int]:
	try:
		with _db_engine().connect() as connection:
			row = connection.execute(
				text("SELECT * FROM orders WHERE id = :id"),
				{"id": order_id},
			).mappings().first()
			if not row:
				return {"error": "Order not found"}, 404
			return _serialize_row(dict(row)), 200
	except SQLAlchemyError as error:
		return {"error": f"Failed to fetch order: {error}"}, 500


@app.post("/")
def create_order() -> tuple[dict[str, Any], int]:
	payload = request.get_json(silent=True)
	if not isinstance(payload, dict) or not payload:
		return {"error": "Request body must be a non-empty JSON object"}, 400

	try:
		normalized = _normalize_input(payload)
		normalized.setdefault("status", "PENDING")
		normalized.setdefault("total_paid", 0)
		normalized.setdefault("qty", 1)

		columns = ", ".join(normalized.keys())
		value_bindings = ", ".join(f":{key}" for key in normalized)
		query = text(
			f"INSERT INTO orders ({columns}) VALUES ({value_bindings}) RETURNING *"
		)

		with _db_engine().begin() as connection:
			print("Success case.")
			row = connection.execute(query, normalized).mappings().one()
			return _serialize_row(dict(row)), 201
	except ValueError as error:
		return {"error": str(error)}, 400
	except SQLAlchemyError as error:
		return {"error": f"Failed to create order: {error}"}, 500


@app.put("/<int:order_id>")
def update_order(order_id: int) -> tuple[dict[str, Any], int]:
	payload = request.get_json(silent=True)
	if not isinstance(payload, dict) or not payload:
		return {"error": "Request body must be a non-empty JSON object"}, 400

	try:
		normalized = _normalize_input(payload)
		if not normalized:
			return {"error": "No valid fields provided"}, 400

		set_clause = ", ".join(f"{key} = :{key}" for key in normalized)
		query = text(f"UPDATE orders SET {set_clause} WHERE id = :id RETURNING *")
		params = {**normalized, "id": order_id}

		with _db_engine().begin() as connection:
			row = connection.execute(query, params).mappings().first()
			if not row:
				return {"error": "Order not found"}, 404
			return _serialize_row(dict(row)), 200
	except ValueError as error:
		return {"error": str(error)}, 400
	except SQLAlchemyError as error:
		return {"error": f"Failed to update order: {error}"}, 500


@app.put("/cancel/<int:order_id>")
def update_order_status(order_id: int) -> tuple[dict[str, str], int]:
	try:
		with _db_engine().begin() as connection:
			# Step 1: Select the data so we know what to publish
			select_result = connection.execute(
				text("SELECT * FROM orders WHERE id = :id"),
				{"id": order_id},
			)
			row = select_result.mappings().first()
			if not row:
				return {"error": "Order not found"}, 404

			# Step 2: Publish to refund service first
			from producer import publish_to_refund
			publish_to_refund(order_id, row.listing_id, row.user_id, row.point_id, row.payment_id, row.qty)


			# Step 3: Perform the update
			connection.execute(
				text("UPDATE orders SET status = 'REFUND' WHERE id = :id"),
				{"id": order_id},
			)

			return {"status": "cancelled"}, 200	
	except Exception as e:
		return {"error": f"Failed to cancel order: {e}"}, 500

@app.get("/user/<string:user_id>")
def get_orders_by_user(user_id: str) -> tuple[dict[str, Any], int]:
	limit = request.args.get("limit", default=10, type=int)
	safe_limit = max(1, min(limit, 100))

	try:
		with _db_engine().connect() as connection:
			rows = connection.execute(
				text("""
					 SELECT * FROM orders
					 WHERE user_id = :user_id
					 ORDER BY id DESC
						 LIMIT :limit
					 """),
				{"user_id": user_id, "limit": safe_limit},
			).mappings().all()

			return {
				"userId": user_id,
				"items": [_serialize_row(dict(row)) for row in rows],
			}, 200

	except SQLAlchemyError as error:
		return {"error": f"Failed to query user orders: {error}"}, 500

@app.delete("/<int:order_id>")
def delete_order(order_id: int) -> tuple[dict[str, str], int]:
	try:
		with _db_engine().begin() as connection:
			result = connection.execute(
				text("DELETE FROM orders WHERE id = :id"),
				{"id": order_id},
			)
			if result.rowcount == 0:
				return {"error": "Order not found"}, 404
			return {"status": "deleted"}, 200
	except SQLAlchemyError as error:
		return {"error": f"Failed to delete order: {error}"}, 500


if __name__ == "__main__":
	app.run(host="0.0.0.0", port=8080, debug=True)
