"""Lightweight CORS handling for the authentication API."""
from __future__ import annotations

from typing import Iterable

from django.conf import settings
from django.http import HttpResponse
from django.utils.cache import patch_vary_headers


class SimpleCORSMiddleware:
    """Attach CORS headers for trusted frontend origins.

    The middleware intentionally keeps the surface minimal so the project does
    not depend on third-party packages while still enabling the React frontend
    to talk to the Django authentication endpoints.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        allowed_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", ())
        self.allowed_origins = tuple(
            self._normalise_origin(value) for value in allowed_origins if value
        )
        self.allow_all = getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False)
        self.allow_credentials = getattr(settings, "CORS_ALLOW_CREDENTIALS", True)
        self.allowed_headers = tuple(getattr(settings, "CORS_ALLOWED_HEADERS", ()))
        self.allowed_methods = tuple(getattr(settings, "CORS_ALLOWED_METHODS", ("GET", "OPTIONS")))
        self.max_age = getattr(settings, "CORS_MAX_AGE", 0)

    def __call__(self, request):
        origin = self._get_origin(request)
        is_allowed = self._origin_is_allowed(origin)

        if request.method == "OPTIONS" and is_allowed:
            response = HttpResponse(status=200)
            response["Content-Length"] = "0"
        else:
            response = self.get_response(request)

        if is_allowed:
            self._apply_headers(request, response, origin)

        return response

    def _origin_is_allowed(self, origin: str | None) -> bool:
        if not origin:
            return False
        if self.allow_all or "*" in self.allowed_origins:
            return True
        normalised = self._normalise_origin(origin)
        return normalised in self.allowed_origins

    def _apply_headers(self, request, response: HttpResponse, origin: str) -> None:
        if self.allow_all or "*" in self.allowed_origins:
            response["Access-Control-Allow-Origin"] = (
                "*" if not self.allow_credentials else origin
            )
        else:
            response["Access-Control-Allow-Origin"] = origin
        if self.allow_credentials:
            response["Access-Control-Allow-Credentials"] = "true"

        request_headers = self._requested_headers(request)
        if request_headers:
            response["Access-Control-Allow-Headers"] = request_headers
        else:
            self._set_csv_header(
                response, "Access-Control-Allow-Headers", self.allowed_headers
            )
        self._set_csv_header(response, "Access-Control-Allow-Methods", self.allowed_methods)
        if self.max_age:
            response["Access-Control-Max-Age"] = str(int(self.max_age))
        patch_vary_headers(response, ("Origin",))

    @staticmethod
    def _set_csv_header(response: HttpResponse, header: str, values: Iterable[str]) -> None:
        if not values:
            return
        response[header] = ", ".join(sorted(dict.fromkeys(v for v in values if v)))

    @staticmethod
    def _get_origin(request) -> str | None:
        headers = getattr(request, "headers", None)
        if headers:
            origin = headers.get("Origin")
            if origin:
                return origin
        return request.META.get("HTTP_ORIGIN")

    @staticmethod
    def _requested_headers(request) -> str | None:
        headers = getattr(request, "headers", None)
        if headers:
            requested = headers.get("Access-Control-Request-Headers")
            if requested:
                return requested
        return request.META.get("HTTP_ACCESS_CONTROL_REQUEST_HEADERS")

    @staticmethod
    def _normalise_origin(origin: str | None) -> str | None:
        if not origin:
            return None
        origin = origin.strip().rstrip("/")
        if not origin:
            return None
        if "://" not in origin:
            return origin
        scheme, rest = origin.split("://", 1)
        scheme = scheme.lower()
        host_port = rest.split("/", 1)[0]
        return f"{scheme}://{host_port}"
