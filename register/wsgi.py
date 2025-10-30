"""WSGI config for the authentication portal."""
from __future__ import annotations

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "register.settings")

application = get_wsgi_application()
