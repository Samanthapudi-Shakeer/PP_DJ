"""Django settings for the standalone authentication portal."""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "django-insecure-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "on").lower() in {"on", "true", "1"}

_raw_allowed_hosts = os.environ.get("DJANGO_ALLOWED_HOSTS")
if _raw_allowed_hosts:
    ALLOWED_HOSTS = [host.strip() for host in _raw_allowed_hosts.split(",") if host.strip()]
else:
    ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "register.apps.RegisterConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "register.middleware.SimpleCORSMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "register.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "register" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "register.wsgi.application"
ASGI_APPLICATION = "register.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("DJANGO_DATABASE", str(BASE_DIR / "register.db.sqlite3")),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = os.environ.get("DJANGO_STATIC_ROOT")
STATICFILES_DIRS = [BASE_DIR / "register" / "static"] if (BASE_DIR / "register" / "static").exists() else []

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SESSION_TOKEN_MAX_AGE = int(os.environ.get("SESSION_TOKEN_MAX_AGE", 60 * 60))
REACT_APP_BASE_URL = os.environ.get("REACT_APP_BASE_URL")
REACT_LOGIN_REDIRECT_URL = os.environ.get("REACT_LOGIN_REDIRECT_URL")

_raw_cors_allowed = os.environ.get("DJANGO_CORS_ALLOWED_ORIGINS")
if _raw_cors_allowed:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in _raw_cors_allowed.split(",") if origin.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

CORS_ALLOW_ALL_ORIGINS = os.environ.get("DJANGO_CORS_ALLOW_ALL_ORIGINS", "false").lower() in {
    "1",
    "true",
    "yes",
    "on",
}

CORS_ALLOW_CREDENTIALS = os.environ.get("DJANGO_CORS_ALLOW_CREDENTIALS", "true").lower() in {"1", "true", "yes", "on"}
CORS_ALLOWED_HEADERS = [
    header.strip()
    for header in os.environ.get(
        "DJANGO_CORS_ALLOWED_HEADERS",
        "Authorization,Content-Type,X-CSRFToken",
    ).split(",")
    if header.strip()
]
CORS_ALLOWED_METHODS = [
    method.strip().upper()
    for method in os.environ.get(
        "DJANGO_CORS_ALLOWED_METHODS",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    ).split(",")
    if method.strip()
]
CORS_MAX_AGE = int(os.environ.get("DJANGO_CORS_MAX_AGE", 86400))
