"""Workspace provisioning shared by signup and the demo sandbox."""

import secrets

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User

from .models import Category, Membership, Role, Workspace

DEFAULT_CATEGORIES = [
    {"key": "billing", "name": "Billing & Payments", "description": "Charges, invoices, refunds, plans and payment problems.",
     "keywords": {"invoice": 3, "refund": 3, "charge": 3, "billing": 3, "payment": 2, "subscription": 1, "price": 1}},
    {"key": "technical", "name": "Technical Issue", "description": "Bugs, errors, outages, things that stopped working.",
     "keywords": {"error": 3, "bug": 3, "crash": 3, "broken": 2, "not working": 3, "outage": 3, "slow": 1, "fail": 2}},
    {"key": "account", "name": "Account & Access", "description": "Login, password, permissions, profile and account changes.",
     "keywords": {"login": 3, "password": 3, "access": 2, "account": 1, "permission": 2, "invite": 2}},
    {"key": "how_to", "name": "How-to & Guidance", "description": "Questions about how to use the product or service.",
     "keywords": {"how do": 3, "how to": 3, "guide": 2, "tutorial": 2, "where can": 2, "setup": 1}},
    {"key": "general", "name": "General", "description": "Anything else, feedback and feature requests.", "is_default": True,
     "keywords": {"feedback": 2, "suggest": 2, "feature": 1}},
]


@transaction.atomic
def create_workspace(*, name: str, owner: User | None = None, categories=None, **fields) -> Workspace:
    workspace = Workspace.objects.create(name=name, slug=Workspace.unique_slug(name), **fields)
    for i, spec in enumerate(categories or DEFAULT_CATEGORIES):
        Category.objects.create(workspace=workspace, position=i, **spec)
    if owner:
        Membership.objects.create(workspace=workspace, user=owner, role=Role.OWNER)
    return workspace


def new_invite_token() -> str:
    return secrets.token_urlsafe(24)


def purge_expired_demos() -> int:
    """Delete expired demo workspaces and the demo users that belonged only to them."""
    expired = Workspace.objects.filter(is_demo=True, expires_at__lt=timezone.now())
    user_ids = list(Membership.objects.filter(workspace__in=expired).values_list("user_id", flat=True))
    count = expired.count()
    expired.delete()
    User.objects.filter(pk__in=user_ids, is_demo=True, memberships__isnull=True).delete()
    return count
