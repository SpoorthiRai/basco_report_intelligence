"""
apps/accounts/models.py
------------------------
Custom User model for BASCO Intelligence Portal.

email is the unique login identifier (not username).
Each user has exactly one role (RSM, RMM, ADMIN) which controls
what data they can see in the reporting layer.
"""

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    Platform user.

    Role semantics:
      RSM  — Regional Sales Manager.  retailer_ids holds the retailer IDs
             this RSM is responsible for.  country is unused.
      RMM  — Regional Marketing Manager.  country holds the country this
             RMM manages.  retailer_ids is unused.
      ADMIN — Full access.  retailer_ids and country are unused.
    """

    class Role(models.TextChoices):
        RSM = "RSM", "Regional Sales Manager"
        RMM = "RMM", "Regional Marketing Manager"
        ADMIN = "ADMIN", "Administrator"

    # ------------------------------------------------------------------
    # Identity fields
    # ------------------------------------------------------------------

    email = models.EmailField(
        unique=True,
        verbose_name="Email address",
        help_text="Used as the login username.",
    )
    full_name = models.CharField(max_length=150, verbose_name="Full name")

    # ------------------------------------------------------------------
    # Role & scope fields
    # ------------------------------------------------------------------

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        verbose_name="Role",
    )

    retailer_ids = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Retailer IDs",
        help_text=(
            "RSM only: list of retailer identifier strings this RSM is "
            "responsible for.  Leave empty for RMM and Admin."
        ),
    )

    country = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Country",
        help_text=(
            "RMM only: the country this RMM manages.  "
            "Leave empty for RSM, Regional Leads, and Admin."
        ),
    )

    region = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Region",
        help_text=(
            "RMM / Regional Leads: the geographic region (e.g. EMEA, APJ, LATAM, AMER) "
            "this user is responsible for. Leave empty for country-specific RMM or Admin."
        ),
    )

    # ------------------------------------------------------------------
    # Status & timestamps
    # ------------------------------------------------------------------

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(
        default=False,
        help_text="Required by Django admin — grants access to /admin/.",
    )
    date_joined = models.DateTimeField(auto_now_add=True)

    # last_login is inherited from AbstractBaseUser (null=True, blank=True).
    # Django's authentication backend sets it automatically on each login.

    # ------------------------------------------------------------------
    # Manager & auth config
    # ------------------------------------------------------------------

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "role"]

    class Meta:
        db_table = "accounts_user"
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["full_name"]

    def __str__(self) -> str:
        return f"{self.full_name} <{self.email}> [{self.role}]"

    def get_full_name(self) -> str:
        return self.full_name

    def get_short_name(self) -> str:
        return self.full_name.split()[0] if self.full_name else self.email
