"""
config/settings/base.py
-----------------------
Settings shared across ALL environments (local, staging, production).
Do not put environment-specific values here.
Sensitive credentials are loaded from environment variables via python-decouple.
"""

from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # project root

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------

SECRET_KEY = config("SECRET_KEY")

# ALLOWED_HOSTS is overridden per environment; base leaves it empty.
ALLOWED_HOSTS = []

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.accounts",
    "apps.reports",
    "apps.admin_panel",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",          # must be as high as possible
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ---------------------------------------------------------------------------
# URL / WSGI
# ---------------------------------------------------------------------------

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
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

# ---------------------------------------------------------------------------
# Databases
# Two separate SQL Server connections:
#   'default'   → BASCO_REPORTING_AUTH  (Django-managed: migrations, sessions, users)
#   'warehouse' → BLUE_BASCO            (read-only reporting queries, never migrated)
#
# Backend: mssql-django  (wraps pyodbc + ODBC Driver 17 for SQL Server)
# All credentials loaded from environment variables — nothing is hardcoded.
# ---------------------------------------------------------------------------

import pyodbc

available_drivers = pyodbc.drivers() if hasattr(pyodbc, 'drivers') else []
if "ODBC Driver 18 for SQL Server" in available_drivers:
    DEFAULT_DB_DRIVER = "ODBC Driver 18 for SQL Server"
elif "ODBC Driver 17 for SQL Server" in available_drivers:
    DEFAULT_DB_DRIVER = "ODBC Driver 17 for SQL Server"
else:
    DEFAULT_DB_DRIVER = "ODBC Driver 18 for SQL Server"

DB_DRIVER = config("DB_DRIVER", default=DEFAULT_DB_DRIVER)

DATABASES = {
    # ------------------------------------------------------------------
    # PRIMARY / AUTH DATABASE
    # Django writes its own tables here (auth_user, django_session, etc.)
    # Run all migrations against this connection only.
    # ------------------------------------------------------------------
    "default": {
        "ENGINE": "mssql",
        "NAME": config("AUTH_DB_NAME", default="BASCO_REPORTING_AUTH"),
        "USER": config("AUTH_DB_USER"),
        "PASSWORD": config("AUTH_DB_PASS"),
        "HOST": config("AUTH_DB_SERVER"),
        "PORT": config("AUTH_DB_PORT", default="1433"),
        "OPTIONS": {
            "driver": DB_DRIVER,
            "extra_params": "TrustServerCertificate=yes;",
        },
    },

    # ------------------------------------------------------------------
    # WAREHOUSE / REPORTING DATABASE
    # Raw SQL reporting queries only. Django ORM is never used here.
    # Migrations must NEVER be run against this connection.
    # Use core.db.get_warehouse_connection() for ad-hoc pyodbc queries.
    # ------------------------------------------------------------------
    "warehouse": {
        "ENGINE": "mssql",
        "NAME": config("WAREHOUSE_DB_NAME", default="BLUE_BASCO"),
        "USER": config("WAREHOUSE_DB_USER"),
        "PASSWORD": config("WAREHOUSE_DB_PASS"),
        "HOST": config("WAREHOUSE_DB_SERVER"),
        "PORT": config("WAREHOUSE_DB_PORT", default="1433"),
        "OPTIONS": {
            "driver": DB_DRIVER,
            "extra_params": "TrustServerCertificate=yes;",
        },
        "TEST": {
            # Prevent Django test runner from creating a test DB here.
            "NAME": None,
        },
    },
}

# Prevent Django from running migrations on the warehouse DB.
DATABASE_ROUTERS = ["core.routers.WarehouseReadOnlyRouter"]

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Custom user model
# ---------------------------------------------------------------------------

AUTH_USER_MODEL = "accounts.User"

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.JSONParser",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# ---------------------------------------------------------------------------
# drf-spectacular (Swagger / OpenAPI)
# ---------------------------------------------------------------------------

SPECTACULAR_SETTINGS = {
    "TITLE": "BASCO Intelligence Portal API",
    "DESCRIPTION": (
        "REST API for the BASCO Intelligence Portal.\n\n"
        "## How to authenticate\n"
        "1. Call `POST /api/auth/login/` with your email + password\n"
        "2. Copy the `access` token from the response\n"
        "3. Click the **Authorize 🔒** button at the top of this page\n"
        "4. In the **BearerAuth** field enter: `Bearer <your_access_token>`\n"
        "5. Click **Authorize** — all protected endpoints will now work\n\n"
        "**Token lifetimes:** access = 15 min · refresh = 7 days"
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    # --- JWT Bearer security scheme ---
    "SECURITY": [{"BearerAuth": []}],
    "SECURITY_DEFINITIONS": {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your JWT access token: Bearer <token>",
        }
    },
    "SWAGGER_UI_SETTINGS": {
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "filter": True,
    },
}

# ---------------------------------------------------------------------------
# Simple JWT
# ---------------------------------------------------------------------------

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("ACCESS_TOKEN_LIFETIME_MINUTES", default=15, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    # Set to False — we are not adding djangorestframework-simplejwt[blacklist].
    # Rotate refresh tokens on use but do not blacklist old ones.
    "BLACKLIST_AFTER_ROTATION": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

CORS_ALLOW_ALL_ORIGINS = config("CORS_ALLOW_ALL_ORIGINS", default=False, cast=bool)

CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173",
    cast=Csv(),
)

CORS_ALLOW_CREDENTIALS = True
