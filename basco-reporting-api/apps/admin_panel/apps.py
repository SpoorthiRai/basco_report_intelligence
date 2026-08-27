"""
apps/admin_panel/apps.py
-------------------------
AppConfig for the admin_panel Django application.
"""

from django.apps import AppConfig


class AdminPanelConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.admin_panel"
    label = "admin_panel"
    verbose_name = "Admin Panel"
