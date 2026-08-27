"""
apps/accounts/serializers.py
-----------------------------
Request/response shapes for the three auth endpoints.

UserSerializer  — read-only, used for /me/ and nested in login response.
LoginSerializer — validates credentials, returns tokens + user data.
"""

from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema_serializer, OpenApiExample
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """
    Read-only representation of a User.
    Returned by both /login/ and /me/.
    """

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "role",
            "retailer_ids",
            "country",
            "region",
        ]
        read_only_fields = fields


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "RSM login",
            value={"email": "rsm@basco.com", "password": "Test@1234"},
            request_only=True,
        ),
    ]
)
class LoginSerializer(serializers.Serializer):
    """
    Validates email + password credentials.

    On success, returns the raw validated data dict; the view is responsible
    for generating tokens and building the final response payload.
    """

    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs: dict) -> dict:
        email = attrs.get("email", "").lower().strip()
        password = attrs.get("password", "")

        user = authenticate(
            request=self.context.get("request"),
            username=email,  # Django's authenticate() maps to USERNAME_FIELD
            password=password,
        )

        if user is None:
            raise serializers.ValidationError(
                {"detail": "Invalid email or password."},
                code="authentication_failed",
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "This account has been deactivated."},
                code="account_inactive",
            )

        attrs["user"] = user
        return attrs
