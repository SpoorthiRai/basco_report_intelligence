"""
apps/accounts/views.py
-----------------------
Three auth endpoints:
  POST /api/auth/login/          → LoginView
  POST /api/auth/token/refresh/  → simplejwt TokenRefreshView (wired in urls.py)
  GET  /api/auth/me/             → MeView
"""

from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer
from rest_framework import serializers as drf_serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import LoginSerializer, UserSerializer


class LoginView(APIView):
    """
    POST /api/auth/login/

    Authenticates a user with email + password and returns a JWT access token,
    refresh token, and the user's profile data.

    Permission: open (AllowAny) — this is the entry point for all users.
    """

    permission_classes = [AllowAny]
    authentication_classes = []  # no auth required to log in

    @extend_schema(
        summary="Login",
        description="Authenticate with email + password. Returns JWT access/refresh tokens and user profile.",
        request=LoginSerializer,
        responses={
            200: inline_serializer(
                name="LoginResponse",
                fields={
                    "access":  drf_serializers.CharField(help_text="Short-lived JWT access token (15 min)"),
                    "refresh": drf_serializers.CharField(help_text="Long-lived JWT refresh token (7 days)"),
                    "user":    UserSerializer(),
                },
            ),
            401: OpenApiResponse(description="Invalid email or password."),
        },
        tags=["Auth"],
    )
    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )

        if not serializer.is_valid():
            # LoginSerializer raises a ValidationError with a 'detail' key on
            # auth failure, so surface it directly as HTTP 401.
            errors = serializer.errors
            detail = errors.get("detail") or errors.get("non_field_errors") or errors
            return Response(
                {"detail": detail[0] if isinstance(detail, list) else detail},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user: User = serializer.validated_data["user"]

        # Generate JWT tokens for the authenticated user.
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """
    GET /api/auth/me/

    Returns the profile of the currently authenticated user.
    Requires a valid JWT access token in the Authorization header:
        Authorization: Bearer <access_token>

    Permission: IsAuthenticated (inherited from global DRF default, but set
    explicitly here for clarity and future-proofing).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Current user profile",
        description="Returns the profile of the authenticated user. Requires `Bearer <access_token>` in the Authorization header.",
        responses={
            200: UserSerializer,
            401: OpenApiResponse(description="Authentication credentials were not provided or are invalid."),
        },
        tags=["Auth"],
    )
    def get(self, request: Request) -> Response:
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
