"""
apps/admin_panel/permissions.py
---------------------------------
Custom DRF permission class restricting access to ADMIN-role users only.
RSM and RMM must never reach admin panel endpoints, even with a valid JWT.
"""

from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class IsAdminRole(BasePermission):
    """
    Allows access only to users with role ADMIN.
    RSM and RMM are denied even if they carry a valid JWT access token.
    """

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )
