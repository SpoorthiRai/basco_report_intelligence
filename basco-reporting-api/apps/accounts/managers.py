"""
apps/accounts/managers.py
--------------------------
Custom manager for the BASCO User model.

Handles user creation logic separately from the model so that
the model stays focused on field definitions only.
"""

from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    """
    Manager for the custom User model where email is the unique identifier
    instead of username.
    """

    def _create_user(self, email: str, password: str, **extra_fields):
        """Shared logic for create_user and create_superuser."""
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str = None, **extra_fields):
        """
        Create and return a regular (non-staff) user.

        Callers must pass full_name and role via extra_fields:
            User.objects.create_user(
                email="user@example.com",
                password="secret",
                full_name="Jane Smith",
                role=User.Role.RSM,
            )
        """
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str = None, **extra_fields):
        """
        Create and return a superuser (is_staff=True, is_superuser=True, role=ADMIN).
        Used by `manage.py createsuperuser`.
        """
        from apps.accounts.models import User  # local import to avoid circular deps

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email, password, **extra_fields)
