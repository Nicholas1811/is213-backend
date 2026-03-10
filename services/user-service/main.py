import os
import re
from functools import lru_cache
from typing import Any
from urllib.parse import quote_plus
from uuid import UUID, uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
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
KEYCLOAK_EVENT_SECRET = os.getenv("KEYCLOAK_EVENT_SECRET")

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


@lru_cache(maxsize=1)
def _users_table_columns() -> set[str]:
    with _db_engine().connect() as connection:
        rows = connection.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'users'
                """
            )
        ).scalars().all()
    return set(rows)


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


def _parse_uuid(value: Any) -> str | None:
    if not value:
        return None
    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError):
        return None


def _extract_keycloak_registration_payload(event: dict[str, Any]) -> dict[str, Any] | None:
    event_type = str(event.get("type", "")).upper()
    if event_type != "REGISTER":
        return None

    details = event.get("details") if isinstance(event.get("details"), dict) else {}

    keycloak_id = _parse_uuid(
        event.get("userId")
        or event.get("user_id")
        or event.get("keycloak_id")
        or details.get("user_id")
        or details.get("keycloak_id")
        or details.get("sub")
        or event.get("id")
    )
    if not keycloak_id:
        raise HTTPException(status_code=400, detail="Keycloak event missing a valid user UUID")

    payload: dict[str, Any] = {"keycloak_id": keycloak_id}

    field_candidates = {
        "username": [event.get("username"), details.get("username")],
        "email": [event.get("email"), details.get("email")],
        "first_name": [event.get("firstName"), details.get("first_name"), details.get("given_name")],
        "last_name": [event.get("lastName"), details.get("last_name"), details.get("family_name")],
    }

    for field, values in field_candidates.items():
        chosen = next((value for value in values if value not in (None, "")), None)
        if chosen is not None:
            payload[field] = chosen

    first_name = payload.get("first_name")
    last_name = payload.get("last_name")
    if first_name or last_name:
        payload["full_name"] = " ".join(part for part in [first_name, last_name] if part)

    # Remove transient fields that are useful for deriving full_name but may not exist in DB schema.
    payload.pop("first_name", None)
    payload.pop("last_name", None)

    return payload


def _ensure_keycloak_secret(secret: str | None) -> None:
    if not KEYCLOAK_EVENT_SECRET:
        return
    if secret != KEYCLOAK_EVENT_SECRET:
        raise HTTPException(status_code=401, detail="Invalid Keycloak event secret")


def _filter_to_users_columns(data: dict[str, Any]) -> dict[str, Any]:
    allowed_columns = _users_table_columns()
    return {key: value for key, value in data.items() if key in allowed_columns}


def _apply_keycloak_bootstrap_defaults(data: dict[str, Any]) -> dict[str, Any]:
    payload = dict(data)
    users_columns = _users_table_columns()

    if "full_name" in users_columns and not payload.get("full_name"):
        email = payload.get("email")
        if isinstance(email, str) and email.strip():
            payload["full_name"] = email.split("@", 1)[0]
        else:
            payload["full_name"] = "New User"

    if "status" in users_columns and not payload.get("status"):
        payload["status"] = "ACTIVE"

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


@app.post("/events/keycloak")
def on_keycloak_event(
    payload: dict[str, Any],
    x_keycloak_event_secret: str | None = Header(default=None),
) -> dict[str, Any]:
    _ensure_keycloak_secret(x_keycloak_event_secret)

    registration_payload = _extract_keycloak_registration_payload(payload)
    if registration_payload is None:
        return {"status": "ignored", "reason": "Only REGISTER events are processed"}

    registration_payload = _filter_to_users_columns(registration_payload)
    registration_payload = _apply_keycloak_bootstrap_defaults(registration_payload)
    if "keycloak_id" not in registration_payload:
        raise HTTPException(status_code=500, detail="users table must include keycloak_id column")

    # Keep internal user_id separate from keycloak_id when the table expects it.
    if "user_id" in _users_table_columns() and "user_id" not in registration_payload:
        registration_payload["user_id"] = str(uuid4())

    keycloak_id = registration_payload["keycloak_id"]
    update_payload = {key: value for key, value in registration_payload.items() if key != "keycloak_id"}

    try:
        with _db_engine().begin() as connection:
            existing_user = connection.execute(
                text("SELECT * FROM users WHERE keycloak_id = :keycloak_id"),
                {"keycloak_id": keycloak_id},
            ).mappings().first()

            if existing_user:
                if update_payload:
                    set_clause = ", ".join(f"{key} = :{key}" for key in update_payload)
                    params = {**update_payload, "keycloak_id": keycloak_id}
                    updated_row = connection.execute(
                        text(f"UPDATE users SET {set_clause} WHERE keycloak_id = :keycloak_id RETURNING *"),
                        params,
                    ).mappings().one()
                    return {"status": "updated", "user": dict(updated_row)}
                return {"status": "exists", "user": dict(existing_user)}

            columns = ", ".join(registration_payload.keys())
            value_bindings = ", ".join(f":{key}" for key in registration_payload)
            created_row = connection.execute(
                text(f"INSERT INTO users ({columns}) VALUES ({value_bindings}) RETURNING *"),
                registration_payload,
            ).mappings().one()
            return {"status": "created", "user": dict(created_row)}
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Failed to process Keycloak event: {error}") from error


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
