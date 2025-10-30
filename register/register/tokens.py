"""Utilities for issuing and validating signed session tokens.

The project previously relied on Django's session cookies that are only
understandable by the Django application itself. In order to allow the
standalone React frontend to trust a login performed via the Django
"register" portal we expose a compact JWT compatible token. The token is
signed using the project's ``SECRET_KEY`` and contains an expiration claim so
that the React application can keep relying on its existing JWT based session
management helpers.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Any, Dict

from django.conf import settings


JWT_HEADER = {"alg": "HS256", "typ": "JWT"}
DEFAULT_TOKEN_TTL = getattr(settings, "SESSION_TOKEN_MAX_AGE", 60 * 60)  # 1 hour


class TokenError(Exception):
    """Base exception for token issues."""


class InvalidToken(TokenError):
    """Raised when a token cannot be decoded or signature validation fails."""


class ExpiredToken(TokenError):
    """Raised when a token is valid but expired."""


@dataclass
class DecodedToken:
    payload: Dict[str, Any]
    issued_at: int
    expires_at: int


def _urlsafe_b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _urlsafe_b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _json_dumps(data: Dict[str, Any]) -> str:
    return json.dumps(data, separators=(",", ":"), sort_keys=True)


def _sign(message: str) -> bytes:
    secret = settings.SECRET_KEY
    if not secret:
        raise InvalidToken("SECRET_KEY is not configured")
    return hmac.new(secret.encode("utf-8"), message.encode("ascii"), hashlib.sha256).digest()


def issue_session_token(payload: Dict[str, Any], expires_in: int | None = None) -> str:
    """Return a signed JWT compatible token for ``payload``.

    ``payload`` must contain JSON serialisable data.  ``exp`` and ``iat``
    claims are automatically injected so that consumers that rely on the JWT
    specification (like the React application) continue to work.
    """

    ttl = expires_in if expires_in is not None else DEFAULT_TOKEN_TTL
    now = int(time.time())
    token_payload = dict(payload)
    token_payload.setdefault("iat", now)
    token_payload["exp"] = now + ttl

    header_segment = _urlsafe_b64encode(_json_dumps(JWT_HEADER).encode("utf-8"))
    payload_segment = _urlsafe_b64encode(_json_dumps(token_payload).encode("utf-8"))
    signing_input = f"{header_segment}.{payload_segment}"
    signature_segment = _urlsafe_b64encode(_sign(signing_input))
    return f"{signing_input}.{signature_segment}"


def decode_session_token(token: str, *, leeway: int = 0) -> DecodedToken:
    """Decode ``token`` and return its payload.

    ``leeway`` can be used to allow a small grace period when checking the
    expiration time.
    """

    if not token:
        raise InvalidToken("No token provided")

    parts = token.split(".")
    if len(parts) != 3:
        raise InvalidToken("Token must consist of header, payload and signature")

    header_segment, payload_segment, signature_segment = parts

    try:
        header_data = json.loads(_urlsafe_b64decode(header_segment))
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        raise InvalidToken("Unable to decode token header") from exc

    if header_data.get("alg") != JWT_HEADER["alg"] or header_data.get("typ") != JWT_HEADER["typ"]:
        raise InvalidToken("Unsupported token header")

    try:
        payload_bytes = _urlsafe_b64decode(payload_segment)
        payload_data = json.loads(payload_bytes)
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        raise InvalidToken("Unable to decode token payload") from exc

    expected_signature = _sign(f"{header_segment}.{payload_segment}")
    try:
        actual_signature = _urlsafe_b64decode(signature_segment)
    except (ValueError, TypeError) as exc:
        raise InvalidToken("Unable to decode token signature") from exc

    if not hmac.compare_digest(actual_signature, expected_signature):
        raise InvalidToken("Token signature mismatch")

    now = int(time.time())
    exp = payload_data.get("exp")
    if exp is None:
        raise InvalidToken("Token payload missing expiration claim")
    if now > int(exp) + int(leeway):
        raise ExpiredToken("Token has expired")

    issued_at = int(payload_data.get("iat", now))
    return DecodedToken(payload=payload_data, issued_at=issued_at, expires_at=int(exp))


__all__ = [
    "DecodedToken",
    "ExpiredToken",
    "InvalidToken",
    "TokenError",
    "decode_session_token",
    "issue_session_token",
]
