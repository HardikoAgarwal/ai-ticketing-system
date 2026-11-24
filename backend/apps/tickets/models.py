from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.workspaces.models import Category, Record, Workspace


class TicketStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    RESOLVED = "RESOLVED", "Resolved"
    CLOSED = "CLOSED", "Closed"


class TicketPriority(models.TextChoices):
    CRITICAL = "CRITICAL", "Critical"
    HIGH = "HIGH", "High"
    MEDIUM = "MEDIUM", "Medium"
    LOW = "LOW", "Low"


PRIORITY_RANK = {
    TicketPriority.CRITICAL: 0,
    TicketPriority.HIGH: 1,
    TicketPriority.MEDIUM: 2,
    TicketPriority.LOW: 3,
}
SLA_AT_RISK_FRACTION = 0.25


class Sentiment(models.TextChoices):
    NEGATIVE = "NEGATIVE", "Negative"
    NEUTRAL = "NEUTRAL", "Neutral"
    POSITIVE = "POSITIVE", "Positive"


class ClassificationSource(models.TextChoices):
    AI = "AI", "AI"
    FALLBACK = "FALLBACK", "Rule-based fallback"
    STAFF = "STAFF", "Set by staff"


class AIStatus(models.TextChoices):
    IDLE = "IDLE", "Not started"
    PENDING = "PENDING", "Pending"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"
    DISABLED = "DISABLED", "Disabled"


class Ticket(models.Model):
    ACTIVE_STATUSES = (TicketStatus.OPEN, TicketStatus.IN_PROGRESS)

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="tickets")
    number = models.PositiveIntegerField()
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tickets")
    record = models.ForeignKey(Record, on_delete=models.SET_NULL, null=True, blank=True, related_name="tickets")
    subject = models.CharField(max_length=150)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=TicketStatus.choices, default=TicketStatus.OPEN, db_index=True)

    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="tickets")
    category_source = models.CharField(
        max_length=10, choices=ClassificationSource.choices, default=ClassificationSource.FALLBACK
    )
    ai_category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    priority = models.CharField(max_length=10, choices=TicketPriority.choices, default=TicketPriority.MEDIUM)
    priority_rank = models.PositiveSmallIntegerField(default=PRIORITY_RANK[TicketPriority.MEDIUM], db_index=True)
    priority_source = models.CharField(
        max_length=10, choices=ClassificationSource.choices, default=ClassificationSource.FALLBACK
    )
    ai_priority = models.CharField(max_length=10, choices=TicketPriority.choices, blank=True)
    ai_confidence = models.FloatField(null=True, blank=True)
    ai_reasoning = models.TextField(blank=True)
    sentiment = models.CharField(max_length=10, choices=Sentiment.choices, blank=True)
    ai_summary = models.TextField(blank=True)
    embedding = models.JSONField(null=True, blank=True, editable=False)
    ai_status = models.CharField(max_length=10, choices=AIStatus.choices, default=AIStatus.PENDING)
    ai_error = models.CharField(max_length=255, blank=True)
    ai_draft_status = models.CharField(max_length=10, choices=AIStatus.choices, default=AIStatus.PENDING)

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tickets"
    )

    sla_due_at = models.DateTimeField(null=True, blank=True)
    first_response_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    last_staff_reply_at = models.DateTimeField(null=True, blank=True)
    last_requester_activity_at = models.DateTimeField(null=True, blank=True)
    requester_last_seen_at = models.DateTimeField(null=True, blank=True)
    staff_last_seen_at = models.DateTimeField(null=True, blank=True)
    csat_score = models.PositiveSmallIntegerField(null=True, blank=True)
    csat_comment = models.CharField(max_length=500, blank=True)

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("priority_rank", "created_at")
        constraints = [models.UniqueConstraint(fields=["workspace", "number"], name="uniq_ticket_number")]
        indexes = [
            models.Index(fields=["workspace", "status", "priority_rank", "created_at"]),
            models.Index(fields=["workspace", "requester", "created_at"]),
        ]

    def __str__(self):
        return f"{self.reference} - {self.subject}"

    @property
    def reference(self) -> str:
        return f"TKT-{self.number:04d}" if self.number else "TKT-NEW"

    @property
    def is_active(self) -> bool:
        return self.status in self.ACTIVE_STATUSES

    def set_priority(self, priority: str) -> None:
        self.priority = priority
        self.priority_rank = PRIORITY_RANK[priority]
        self.sla_due_at = self.created_at + self.workspace.sla_for(priority)

    @property
    def sla_state(self) -> str:
        """First-response SLA: met | breached | overdue | at_risk | on_track | none."""
        if not self.sla_due_at:
            return "none"
        if self.first_response_at:
            return "met" if self.first_response_at <= self.sla_due_at else "breached"
        if not self.is_active:
            return "none"
        now = timezone.now()
        if now > self.sla_due_at:
            return "overdue"
        window = (self.sla_due_at - self.created_at).total_seconds()
        remaining = (self.sla_due_at - now).total_seconds()
        return "at_risk" if window and remaining / window <= SLA_AT_RISK_FRACTION else "on_track"


class MessageKind(models.TextChoices):
    REPLY = "REPLY", "Reply"
    NOTE = "NOTE", "Internal note"
    SYSTEM = "SYSTEM", "System"


class TicketMessage(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    kind = models.CharField(max_length=10, choices=MessageKind.choices, default=MessageKind.REPLY)
    body = models.TextField()
    ai_draft = models.ForeignKey("ai.AIDraft", on_delete=models.SET_NULL, null=True, blank=True)
    ai_draft_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("created_at",)

    @property
    def is_internal(self) -> bool:
        return self.kind == MessageKind.NOTE


def attachment_upload_to(instance, filename):
    return f"attachments/ws_{instance.ticket.workspace_id}/ticket_{instance.ticket_id}/{filename}"


class Attachment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="attachments")
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    file = models.FileField(upload_to=attachment_upload_to)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    created_at = models.DateTimeField(default=timezone.now)


class ActivityAction(models.TextChoices):
    CREATED = "CREATED", "Ticket created"
    AI_CLASSIFIED = "AI_CLASSIFIED", "AI triaged"
    AI_FAILED = "AI_FAILED", "AI unavailable"
    STATUS_CHANGED = "STATUS_CHANGED", "Status changed"
    CATEGORY_CHANGED = "CATEGORY_CHANGED", "Category changed"
    PRIORITY_CHANGED = "PRIORITY_CHANGED", "Priority changed"
    ASSIGNED = "ASSIGNED", "Assignment changed"
    REPLIED = "REPLIED", "Reply sent"
    NOTE_ADDED = "NOTE_ADDED", "Internal note added"
    REQUESTER_REPLIED = "REQUESTER_REPLIED", "Requester replied"
    REQUESTER_CONFIRMED = "REQUESTER_CONFIRMED", "Requester confirmed resolution"
    REQUESTER_REOPENED = "REQUESTER_REOPENED", "Requester reopened"
    CSAT_RECEIVED = "CSAT_RECEIVED", "Satisfaction rating received"


class TicketActivity(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="activities")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=30, choices=ActivityAction.choices)
    from_value = models.CharField(max_length=100, blank=True)
    to_value = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("created_at",)
        verbose_name_plural = "ticket activities"


class Macro(models.Model):
    """Canned reply that staff can insert into the composer."""

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="macros")
    title = models.CharField(max_length=80)
    body = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("title",)
