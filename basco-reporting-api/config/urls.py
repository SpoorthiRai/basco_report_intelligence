"""
config/urls.py
--------------
Root URL configuration for BASCO Intelligence Portal API.
App-level URL includes will be added here as each app is built out.
"""

from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # Django admin (retain for superuser management)
    path("admin/", admin.site.urls),

    # OpenAPI schema + Swagger UI + ReDoc
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/",   SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/",  SpectacularRedocView.as_view(url_name="schema"),   name="redoc"),

    # App endpoints:
    path("api/auth/",    include("apps.accounts.urls")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/admin/",   include("apps.admin_panel.urls")),
]
