from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class Role(models.TextChoices):
    OWNER = "OWNER", "Owner"
    ADMIN = "ADMIN", "Admin"
    AGENT = "AGENT", "Agent"
    REQUESTER = "REQUESTER", "Requester"


STAFF_ROLES = (Role.OWNER, Role.ADMIN, Role.AGENT)
MANAGER_ROLES = (Role.OWNER, Role.ADMIN)

DEFAULT_SLA_HOURS = {"CRITICAL": 4, "HIGH": 24, "MEDIUM": 48, "LOW": 72}


def default_sla_hours() -> dict:
    return dict(DEFAULT_SLA_HOURS)


class Workspace(models.Model):
    """A tenant. Every other domain table hangs off one of these."""

    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=60, unique=True)
    template = models.CharField(max_length=30, blank=True, help_text="Demo template key, if seeded from one")
    tagline = models.CharField(max_length=200, blank=True)
    agent_title = models.CharField(max_length=80, default="Support Team", help_text="Sign-off name for replies")
    tone = models.TextField(blank=True, help_text="Tone and style guidelines injected into AI drafts")
    sla_hours = models.JSONField(default=default_sla_hours)
    ai_enabled = models.BooleanField(default=True)
    is_demo = models.BooleanField(default=False, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    ticket_counter = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name

    @staticmethod
    def unique_slug(name: str) -> str:
        base = slugify(name)[:48] or "workspace"
        slug, n = base, 1
        while Workspace.objects.filter(slug=slug).exists():
            n += 1
            slug = f"{base}-{n}"
        return slug

    def sla_for(self, priority: str) -> timedelta:
        hours = self.sla_hours.get(priority) or DEFAULT_SLA_HOURS[priority]
        return timedelta(hours=hours)


class Membership(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.REQUESTER, db_index=True)
    company = models.CharField(max_length=120, blank=True)
    profile = models.JSONField(default=dict, blank=True, help_text="Free-form facts about a requester (plan, tier, region...)")
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["workspace", "user"], name="uniq_membership")]

    def __str__(self):
        return f"{self.user.email} @ {self.workspace.slug} ({self.role})"

    @property
    def is_staff_member(self) -> bool:
        return self.role in STAFF_ROLES

    @property
    def is_manager(self) -> bool:
        return self.role in MANAGER_ROLES


class Category(models.Model):
    """Workspace-defined ticket categories; `keywords` feed the rule-based fallback classifier."""

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="categories")
    key = models.SlugField(max_length=40)
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=300, blank=True, help_text="Shown to the AI classifier")
    keywords = models.JSONField(default=dict, blank=True, help_text='{"refund": 3, "invoice": 2}')
    is_default = models.BooleanField(default=False, help_text="Fallback when nothing matches")
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("position", "name")
        constraints = [models.UniqueConstraint(fields=["workspace", "key"], name="uniq_category_key")]

    def __str__(self):
        return f"{self.workspace.slug}:{self.key}"


class Record(models.Model):
    """A customer-owned thing a ticket can be about (order, subscription, device, booking...).

    `data` holds the facts; they are rendered into a deterministic fact sheet so the AI
    never has to compute or guess them.
    """

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="records")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="records")
    kind = models.CharField(max_length=40, help_text="e.g. Order, Subscription, Device")
    reference = models.CharField(max_length=60, blank=True)
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=60, blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.kind}: {self.title}"


class Invite(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="invites")
    email = models.EmailField()
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.AGENT)
    token = models.CharField(max_length=64, unique=True)
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
