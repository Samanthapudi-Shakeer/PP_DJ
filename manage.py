#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "register.settings")

    if len(sys.argv) >= 2 and sys.argv[1] == "runserver":
        has_address_argument = any(arg for arg in sys.argv[2:] if not arg.startswith("-"))
        if not has_address_argument:
            default_host = os.environ.get("DJANGO_RUNSERVER_HOST", "0.0.0.0")
            default_port = os.environ.get("DJANGO_RUNSERVER_PORT", "9000")
            default_address = os.environ.get(
                "DJANGO_RUNSERVER_ADDRESS", f"{default_host}:{default_port}"
            )
            sys.argv.append(default_address)
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and available on your "
            "PYTHONPATH environment variable? Did you forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
