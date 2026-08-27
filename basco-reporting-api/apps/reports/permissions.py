"""
apps/reports/permissions.py
----------------------------
Custom DRF permission classes for role-based access control on reporting endpoints.

All three permission classes grant access to ADMIN unconditionally so that
admin users can always reach every report.
"""

from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class IsRSM(BasePermission):
    """
    Allows access only to users with role RSM or ADMIN.
    Used on endpoints that are RSM-specific (e.g. retailer-level data).
    """

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.RSM, User.Role.ADMIN)
        )


class IsRMM(BasePermission):
    """
    Allows access only to users with role RMM or ADMIN.
    Used on endpoints that are RMM-specific (e.g. country-level data).
    """

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.RMM, User.Role.ADMIN)
        )


class IsAnyReportingRole(BasePermission):
    """
    Allows access to RSM, RMM, and ADMIN.
    Used on shared reporting endpoints that all roles can reach,
    with row-level filtering applied in the view layer.
    """

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (
                User.Role.RSM,
                User.Role.RMM,
                User.Role.ADMIN,
            )
        )
