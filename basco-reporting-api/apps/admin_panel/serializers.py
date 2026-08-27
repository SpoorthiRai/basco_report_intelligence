"""
apps/admin_panel/serializers.py
---------------------------------
Request/response serializers for the admin user-management endpoints.

UserListSerializer   — read-only, returned by list, create, and update endpoints.
UserCreateSerializer — validates and creates a new user with a hashed password.
UserUpdateSerializer — validates and applies a partial update to an existing user.
"""

from rest_framework import serializers

from apps.accounts.models import User


# ---------------------------------------------------------------------------
# Read-only response serializer
# ---------------------------------------------------------------------------

class UserListSerializer(serializers.ModelSerializer):
    """
    Full read-only representation of a User.
    Returned by GET /api/admin/users/ and as confirmation after create/update.
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
            "is_active",
            "date_joined",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Create serializer
# ---------------------------------------------------------------------------

class UserCreateSerializer(serializers.Serializer):
    """
    Validates input for creating a new portal user.

    Validation rules:
      - RSM   → retailer_ids must not be empty
      - RMM   → country or region must not be empty
      - ADMIN → retailer_ids, country, and region are ignored (reset to [] and '')
    """

    email        = serializers.EmailField()
    full_name    = serializers.CharField(max_length=150)
    password     = serializers.CharField(write_only=True, style={"input_type": "password"})
    role         = serializers.ChoiceField(choices=User.Role.choices)
    retailer_ids = serializers.JSONField(default=list)
    country      = serializers.CharField(max_length=100, default="", allow_blank=True)
    region       = serializers.CharField(max_length=100, default="", allow_blank=True)

    def validate_email(self, value: str) -> str:
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs: dict) -> dict:
        role = attrs.get("role")
        retailer_ids = attrs.get("retailer_ids") or []
        country = attrs.get("country", "").strip()
        region = attrs.get("region", "").strip()

        if role == User.Role.RSM and not retailer_ids:
            raise serializers.ValidationError(
                {"retailer_ids": "RSM users must have at least one retailer ID."}
            )
        if role == User.Role.RMM and not country and not region:
            raise serializers.ValidationError(
                {"country": "RMM users must have either a country or a region assigned."}
            )
        if role == User.Role.ADMIN:
            attrs["retailer_ids"] = []
            attrs["country"] = ""
            attrs["region"] = ""

        return attrs

    def create(self, validated_data: dict) -> User:
        """Create the user with a properly hashed password."""
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


# ---------------------------------------------------------------------------
# Update serializer
# ---------------------------------------------------------------------------

class UserUpdateSerializer(serializers.Serializer):
    """
    Validates input for a partial update to an existing user.
    All fields are optional — only supplied fields are modified.

    Same role/field validation rules as UserCreateSerializer apply
    when role is being changed.
    """

    full_name    = serializers.CharField(max_length=150, required=False)
    role         = serializers.ChoiceField(choices=User.Role.choices, required=False)
    retailer_ids = serializers.JSONField(required=False)
    country      = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    region       = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    is_active    = serializers.BooleanField(required=False)

    def validate(self, attrs: dict) -> dict:
        # Resolve effective role: supplied in this request or current on the instance
        instance: User = self.instance
        role = attrs.get("role", instance.role if instance else None)

        if role:
            retailer_ids = attrs.get(
                "retailer_ids",
                instance.retailer_ids if instance else [],
            )
            country = attrs.get(
                "country",
                instance.country if instance else "",
            )
            region = attrs.get(
                "region",
                instance.region if instance else "",
            )

            if role == User.Role.RSM and not retailer_ids:
                raise serializers.ValidationError(
                    {"retailer_ids": "RSM users must have at least one retailer ID."}
                )
            if role == User.Role.RMM and not (country or "").strip() and not (region or "").strip():
                raise serializers.ValidationError(
                    {"country": "RMM users must have either a country or a region assigned."}
                )
            if role == User.Role.ADMIN:
                attrs["retailer_ids"] = []
                attrs["country"] = ""
                attrs["region"] = ""

        return attrs

    def update(self, instance: User, validated_data: dict) -> User:
        """Apply only the supplied fields to the instance."""
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance
