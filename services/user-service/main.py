import os
import re
from functools import lru_cache
from typing import Any
from urllib.parse import quote_plus
from uuid import UUID

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

load_dotenv()

app = FastAPI(title="User Service")

# DB connection settings for existing RDS Postgres.
DB_HOST = os.getenv("USER_DB_HOST")
DB_PORT = os.getenv("USER_DB_PORT", "5432")
DB_NAME = os.getenv("USER_DB_NAME", "users")
DB_USER = os.getenv("USER_DB_USER")
DB_PASSWORD = os.getenv("USER_DB_PASSWORD")

# Limit dynamic payload keys to valid SQL identifier names.
COLUMN_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _database_url() -> str:
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        return explicit_url

    missing = [
        key
        for key, value in {
            "USER_DB_HOST": DB_HOST,
            "USER_DB_USER": DB_USER,
            "USER_DB_PASSWORD": DB_PASSWORD,
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


def _validated_payload(data: dict[str, Any], *, allow_user_id: bool = True) -> dict[str, Any]:
    if not isinstance(data, dict) or not data:
        raise HTTPException(status_code=400, detail="Request body must be a non-empty JSON object")

    payload: dict[str, Any] = {}
    for key, value in data.items():
        if not COLUMN_NAME_PATTERN.match(key):
            raise HTTPException(status_code=400, detail=f"Invalid column name: {key}")
        if not allow_user_id and key == "user_id":
            continue
        payload[key] = value

    if not payload:
        raise HTTPException(status_code=400, detail="No valid fields provided")

    return payload


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def list_users(limit: int = 10) -> dict:
    safe_limit = max(1, min(limit, 100))
    try:
        with _db_engine().connect() as connection:
            rows = connection.execute(
                text("SELECT * FROM users LIMIT :limit"),
                {"limit": safe_limit},
            ).mappings().all()
            return {"count": len(rows), "items": [dict(row) for row in rows]}
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Failed to query users: {error}") from error


@app.get("/{user_id}")
def get_user(user_id: UUID) -> dict:
    try:
        with _db_engine().connect() as connection:
            row = connection.execute(
                text("SELECT * FROM users WHERE user_id = :user_id"),
                {"user_id": str(user_id)},
            ).mappings().first()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            return dict(row)
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {error}") from error


@app.post("/")
def create_user(payload: dict[str, Any]) -> dict:
    validated_payload = _validated_payload(payload, allow_user_id=True)

    columns = ", ".join(validated_payload.keys())
    value_bindings = ", ".join(f":{key}" for key in validated_payload)
    query = text(f"INSERT INTO users ({columns}) VALUES ({value_bindings}) RETURNING *")

    try:
        with _db_engine().begin() as connection:
            row = connection.execute(query, validated_payload).mappings().one()
            return dict(row)
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {error}") from error


@app.put("/{user_id}")
def update_user(user_id: UUID, payload: dict[str, Any]) -> dict:
    validated_payload = _validated_payload(payload, allow_user_id=False)

    set_clause = ", ".join(f"{key} = :{key}" for key in validated_payload)
    query = text(f"UPDATE users SET {set_clause} WHERE user_id = :user_id RETURNING *")
    params = {**validated_payload, "user_id": str(user_id)}

    try:
        with _db_engine().begin() as connection:
            row = connection.execute(query, params).mappings().first()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            return dict(row)
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Failed to update user: {error}") from error


@app.delete("/{user_id}")
def delete_user(user_id: UUID) -> dict[str, str]:
    try:
        with _db_engine().begin() as connection:
            result = connection.execute(
                text("DELETE FROM users WHERE user_id = :user_id"),
                {"user_id": str(user_id)},
            )
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="User not found")
            return {"status": "deleted"}
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {error}") from error
