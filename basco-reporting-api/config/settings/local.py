"""
config/settings/local.py
------------------------
Local development overrides.
Used by default via manage.py (DJANGO_SETTINGS_MODULE=config.settings.local).
Never use this file in production.
"""

from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

# In local dev, show full SQL errors and enable Django's debug toolbar if added later.
# Emails are printed to the console instead of being sent.
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
