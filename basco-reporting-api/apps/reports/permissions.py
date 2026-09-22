"""Reporting endpoint permissions. ADMIN, RMM, and RSM all share the same reports."""

from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class IsAnyReportingRole(BasePermission):
    """Allow RSM, RMM, and ADMIN. Row-level filtering is applied in the view."""

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
