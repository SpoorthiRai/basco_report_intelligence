"""
config/wsgi.py
--------------
WSGI entry-point for production servers (gunicorn, uWSGI, etc.).
Defaults to local settings — override via DJANGO_SETTINGS_MODULE env var
before starting the process in production:

    DJANGO_SETTINGS_MODULE=config.settings.production gunicorn config.wsgi
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

application = get_wsgi_application()
