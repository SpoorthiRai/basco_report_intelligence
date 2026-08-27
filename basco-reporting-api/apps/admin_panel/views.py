"""
apps/admin_panel/views.py
--------------------------
Four ADMIN-only endpoints for portal user management.

All views require:
  - IsAuthenticated  — valid JWT access token
  - IsAdminRole      — request.user.role == ADMIN

Endpoints:
  GET    /api/admin/users/                    → list all users
  POST   /api/admin/users/create/             → create a new user
  PATCH  /api/admin/users/<user_id>/update/   → partial update a user
  DELETE /api/admin/users/<user_id>/deactivate/ → soft-deactivate a user
"""

from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User

from .permissions import IsAdminRole
from .serializers import UserCreateSerializer, UserListSerializer, UserUpdateSerializer


# ---------------------------------------------------------------------------
# List users
# ---------------------------------------------------------------------------

class UserListView(APIView):
    """
    GET /api/admin/users/

    Returns all portal users ordered by date_joined descending.
    Only ADMIN users can reach this endpoint.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(
        summary="List all users",
        description="Returns a list of all portal users ordered by most recently joined. **ADMIN only.**",
        responses={
            200: UserListSerializer(many=True),
            403: OpenApiResponse(description="ADMIN role required."),
        },
        tags=["Admin — User Management"],
    )
    def get(self, request: Request) -> Response:
        users = User.objects.all().order_by("-date_joined")
        serializer = UserListSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Create user
# ---------------------------------------------------------------------------

class UserCreateView(APIView):
    """
    POST /api/admin/users/create/

    Creates a new portal user with a hashed password.
    Only ADMIN users can reach this endpoint.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(
        summary="Create a new user",
        description=(
            "Creates a new portal user.\n\n"
            "**Validation rules:**\n"
            "- RSM → `retailer_ids` must not be empty\n"
            "- RMM → `country` must not be empty\n"
            "- ADMIN → `retailer_ids` and `country` are auto-cleared\n\n"
            "**ADMIN only.**"
        ),
        request=UserCreateSerializer,
        responses={
            201: UserListSerializer,
            400: OpenApiResponse(description="Validation error."),
            403: OpenApiResponse(description="ADMIN role required."),
        },
        tags=["Admin — User Management"],
    )
    def post(self, request: Request) -> Response:
        serializer = UserCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        return Response(
            UserListSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# Update user
# ---------------------------------------------------------------------------

class UserUpdateView(APIView):
    """
    PATCH /api/admin/users/<user_id>/update/

    Applies a partial update to an existing user.
    Only ADMIN users can reach this endpoint.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(
        summary="Update a user",
        description=(
            "Partially updates an existing portal user. All fields are optional.\n\n"
            "Same role/field validation rules as create apply when changing role.\n\n"
            "**ADMIN only.**"
        ),
        parameters=[
            OpenApiParameter("user_id", OpenApiTypes.INT, OpenApiParameter.PATH, description="ID of the user to update"),
        ],
        request=UserUpdateSerializer,
        responses={
            200: UserListSerializer,
            400: OpenApiResponse(description="Validation error."),
            403: OpenApiResponse(description="ADMIN role required."),
            404: OpenApiResponse(description="User not found."),
        },
        tags=["Admin — User Management"],
    )
    def patch(self, request: Request, user_id: int) -> Response:
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updated_user = serializer.save()
        return Response(
            UserListSerializer(updated_user).data,
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Deactivate user (soft delete)
# ---------------------------------------------------------------------------

class UserDeactivateView(APIView):
    """
    DELETE /api/admin/users/<user_id>/deactivate/

    Soft-deactivates a user by setting is_active = False.
    Does NOT hard delete the record.
    An admin cannot deactivate their own account.
    Only ADMIN users can reach this endpoint.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(
        summary="Deactivate a user",
        description=(
            "Soft-deactivates a portal user (`is_active = False`). The record is **not** deleted.\n\n"
            "An admin cannot deactivate their own account.\n\n"
            "**ADMIN only.**"
        ),
        parameters=[
            OpenApiParameter("user_id", OpenApiTypes.INT, OpenApiParameter.PATH, description="ID of the user to deactivate"),
        ],
        responses={
            200: OpenApiResponse(description="User deactivated successfully."),
            400: OpenApiResponse(description="Cannot deactivate own account."),
            403: OpenApiResponse(description="ADMIN role required."),
            404: OpenApiResponse(description="User not found."),
        },
        tags=["Admin — User Management"],
    )
    def delete(self, request: Request, user_id: int) -> Response:
        # Prevent self-deactivation
        if request.user.id == user_id:
            return Response(
                {"detail": "You cannot deactivate your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user.is_active = False
        user.save(update_fields=["is_active"])

        return Response(
            {"detail": "User deactivated successfully."},
            status=status.HTTP_200_OK,
        )
