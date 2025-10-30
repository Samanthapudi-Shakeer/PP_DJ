"""Serialisation helpers for exposing session information to external clients."""
from __future__ import annotations

from typing import Any, Dict
from uuid import uuid4

DEFAULT_ROLE = "user"


def build_session_payload(user_info: Dict[str, Any], *, session_id: str | None = None) -> Dict[str, Any]:
    """Return the payload that will be embedded inside the issued JWT."""

    payload = {
        "sid": session_id or str(uuid4()),
        "email": user_info.get("email"),
        "username": user_info.get("username"),
        "role": user_info.get("role") or DEFAULT_ROLE,
        "display_name": user_info.get("display_name") or user_info.get("username"),
    }
    # Remove keys with ``None`` values to keep the payload concise.
    return {key: value for key, value in payload.items() if value is not None}


def serialize_user_session(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a decoded JWT payload into the structure expected by the frontend."""

    return {
        "email": payload.get("email"),
        "username": payload.get("username"),
        "display_name": payload.get("display_name") or payload.get("username"),
        "role": payload.get("role") or DEFAULT_ROLE,
        "session_id": payload.get("sid"),
    }


__all__ = ["build_session_payload", "serialize_user_session"]
