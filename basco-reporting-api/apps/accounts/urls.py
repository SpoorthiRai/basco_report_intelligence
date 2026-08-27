"""
apps/accounts/urls.py
---------------------
URL patterns for the accounts app.

Mounted at /api/auth/ in config/urls.py, so the full paths are:
  POST /api/auth/login/
  POST /api/auth/token/refresh/
  GET  /api/auth/me/
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, MeView

app_name = "accounts"

urlpatterns = [
    # Login — returns access token, refresh token, and user profile
    path("login/", LoginView.as_view(), name="login"),

    # Token refresh — simplejwt built-in, no custom logic needed
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # Authenticated user profile
    path("me/", MeView.as_view(), name="me"),
]
