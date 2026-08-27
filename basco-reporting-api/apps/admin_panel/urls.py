"""
apps/admin_panel/urls.py
-------------------------
URL patterns for the admin panel app.

Mounted at /api/admin/ in config/urls.py, so the full paths are:
  GET    /api/admin/users/
  POST   /api/admin/users/create/
  PATCH  /api/admin/users/<user_id>/update/
  DELETE /api/admin/users/<user_id>/deactivate/
"""

from django.urls import path

from .views import UserCreateView, UserDeactivateView, UserListView, UserUpdateView

app_name = "admin_panel"

urlpatterns = [
    path("users/",                         UserListView.as_view(),       name="admin-user-list"),
    path("users/create/",                  UserCreateView.as_view(),     name="admin-user-create"),
    path("users/<int:user_id>/update/",    UserUpdateView.as_view(),     name="admin-user-update"),
    path("users/<int:user_id>/deactivate/",UserDeactivateView.as_view(), name="admin-user-deactivate"),
]
