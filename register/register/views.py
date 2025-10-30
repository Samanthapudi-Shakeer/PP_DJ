from __future__ import annotations

import os
import socket
from datetime import datetime
from typing import Dict, Optional
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from django.conf import settings
from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_GET
from ldap3 import SAFE_SYNC, Connection, Server

from .forms import CustomAuthForm
from .models import LogsData, Permissions, Users
from .serializers import build_session_payload, serialize_user_session
from .tokens import ExpiredToken, InvalidToken, decode_session_token, issue_session_token

LDAP_SERVER = Server("toshiba-tsip.com")
DEFAULT_DOMAIN = "@toshiba-tsip.com"
SPECIAL_USER_MAPPINGS = {
    "yuji.kyoya@toshiba.co.jp": "yuji.kyoya@toshiba.co.jp",
    "adminstrator": "adminstrator",
    "nithyax": "nithyax",
}


def _record_login(username: str) -> None:
    now = datetime.now()
    try:
        ip_address = socket.gethostbyname(socket.gethostname())
    except OSError:
        ip_address = "0.0.0.0"

    history = LogsData(
        username=username,
        Date=now.strftime("%d-%m-%Y"),
        Month=now.month,
        IPAddress=ip_address,
    )
    history.save()


def _lookup_role(username: str) -> Optional[str]:
    return Permissions.objects.filter(username__exact=username).values_list("roles", flat=True).first()


def _canonical_username(raw_username: str, directory_email: Optional[str]) -> str:
    if raw_username in SPECIAL_USER_MAPPINGS:
        return SPECIAL_USER_MAPPINGS[raw_username]

    candidate = (directory_email or raw_username or "").lower()
    if "@" not in candidate:
        candidate = f"{candidate}{DEFAULT_DOMAIN}"
    return candidate


def _authenticate_user(username: str, password: str) -> Optional[Dict[str, str]]:
    ldap_username = username if "@" in username else f"{username}{DEFAULT_DOMAIN}"
    directory_email: Optional[str] = None
    authenticated = False

    try:
        conn = Connection(LDAP_SERVER, ldap_username, password, client_strategy=SAFE_SYNC, auto_bind=True)
        search_filter = f"(&(objectClass=user)(sAMAccountName={username}))"
        entries = conn.extend.standard.paged_search(
            "dc=toshiba-tsip,dc=com",
            search_filter,
            attributes=["department", "mail"],
            paged_size=5,
            generator=False,
        )
        for entry in entries:
            attributes = entry.get("attributes") or {}
            mail_attr = attributes.get("mail")
            if mail_attr:
                directory_email = str(mail_attr).lower()
                break
        authenticated = True
        _record_login(username)
    except Exception:
        user_record = Users.objects.filter(username=username, password=password).first()
        if user_record:
            authenticated = True
            directory_email = user_record.username.lower()
    finally:
        try:
            if "conn" in locals():
                conn.unbind()
        except Exception:
            pass

    if not authenticated:
        return None

    canonical = _canonical_username(username, directory_email)
    display_name = canonical.split("@")[0]
    role = _lookup_role(username)
    effective_role = role or "user"

    return {
        "email": canonical,
        "username": display_name,
        "display_name": display_name,
        "role": effective_role,
        "assigned_role": role,
        "source_username": username,
    }


def _store_session(request, user_info: Dict[str, str]) -> None:
    request.session["username"] = user_info["email"]
    request.session["username1"] = user_info["username"]
    request.session["role"] = user_info.get("role")

    assigned_role = user_info.get("assigned_role")
    if assigned_role:
        request.session[assigned_role] = assigned_role


def _build_react_redirect(token: str) -> str:
    candidate = (
        getattr(settings, "REACT_LOGIN_REDIRECT_URL", None)
        or os.environ.get("REACT_LOGIN_REDIRECT_URL")
        or getattr(settings, "REACT_APP_BASE_URL", None)
    )

    if candidate:
        candidate = candidate.rstrip("/")
        if not candidate.endswith("/login"):
            candidate = f"{candidate}/login"
    else:
        candidate = "http://localhost:3000/login"

    parsed = urlparse(candidate)
    query = dict(parse_qsl(parsed.query))
    query["sessionToken"] = token
    new_query = urlencode(query)
    return urlunparse(parsed._replace(query=new_query))


def _extract_token_from_request(request) -> Optional[str]:
    token = request.GET.get("token") or request.GET.get("sessionToken")
    if token:
        return token

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1]
    return None


def login(request):
    form = CustomAuthForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        username = form.cleaned_data.get("username")
        password = form.cleaned_data.get("password")
        user_info = _authenticate_user(username, password)

        if not user_info:
            messages.info(request, "Invalid User Credentials")
        else:
            _store_session(request, user_info)
            payload = build_session_payload(user_info)
            token = issue_session_token(payload)
            request.session["session_token"] = token
            return redirect(_build_react_redirect(token))

    return render(request, "registration/login.html", {"form": form})


def logout(request):
    request.session.flush()
    return redirect("/login")


@require_GET
def validate_session_token(request):
    token = _extract_token_from_request(request)
    if not token:
        return JsonResponse({"detail": "Session token is required."}, status=400)

    try:
        decoded = decode_session_token(token)
    except ExpiredToken:
        return JsonResponse({"detail": "Session token has expired."}, status=401)
    except InvalidToken:
        return JsonResponse({"detail": "Session token is invalid."}, status=401)

    user_payload = serialize_user_session(decoded.payload)
    response_data = {
        "access_token": token,
        "user": user_payload,
        "issued_at": decoded.issued_at,
        "expires_at": decoded.expires_at,
    }
    return JsonResponse(response_data)
