"""
config/settings/production.py
------------------------------
Production overrides.
Switch to this file by setting:
    DJANGO_SETTINGS_MODULE=config.settings.production
in your server environment or process manager (e.g. gunicorn, systemd).
"""

from decouple import config, Csv

from .base import *  # noqa: F401, F403

DEBUG = False

# ALLOWED_HOSTS must be explicitly set in the production .env
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default=".run.app,.a.run.app,.onrender.com,localhost,127.0.0.1,*", cast=Csv())

# WhiteNoise production static files compression and caching
# ---------------------------------------------------------------------------
# CORS for Vercel / Cloud Run
# ---------------------------------------------------------------------------

CORS_ALLOW_ALL_ORIGINS = config("CORS_ALLOW_ALL_ORIGINS", default=True, cast=bool)
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Security hardening
# ---------------------------------------------------------------------------

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
