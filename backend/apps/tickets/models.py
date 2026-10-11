from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.accounts.models import AuthorProfile
from apps.catalog.models import Book


class TicketStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    RESOLVED = "RESOLVED", "Resolved"
    CLOSED = "CLOSED", "Closed"


class TicketCategory(models.TextChoices):
    ROYALTY_PAYMENTS = "ROYALTY_PAYMENTS", "Royalty & Payments"
    ISBN_METADATA = "ISBN_METADATA", "ISBN & Metadata Issues"
    PRINTING_QUALITY = "PRINTING_QUALITY", "Printing & Quality"
    DISTRIBUTION = "DISTRIBUTION", "Distribution & Availability"
    BOOK_STATUS = "BOOK_STATUS", "Book Status & Production Updates"
    GENERAL = "GENERAL", "General Inquiry"


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

# First-response SLA targets (hours) per priority.
SLA_HOURS = {
    TicketPriority.CRITICAL: 4,
    TicketPriority.HIGH: 24,
    TicketPriority.MEDIUM: 48,
    TicketPriority.LOW: 72,
}
SLA_AT_RISK_FRACTION = 0.25


class ClassificationSource(models.TextChoices):
    AI = "AI", "AI"
    FALLBACK = "FALLBACK", "Rule-based fallback"
    ADMIN = "ADMIN", "Set by admin"


class AIStatus(models.TextChoices):
    IDLE = "IDLE", "Not started"
    PENDING = "PENDING", "Pending"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"
    DISABLED = "DISABLED", "Disabled"


class Ticket(models.Model):
    ACTIVE_STATUSES = (TicketStatus.OPEN, TicketStatus.IN_PROGRESS)

    author = models.ForeignKey(AuthorProfile, on_delete=models.CASCADE, related_name="tickets")
    book = models.ForeignKey(Book, on_delete=models.SET_NULL, null=True, blank=True, related_name="tickets")
    subject = models.CharField(max_length=150)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=TicketStatus.choices, default=TicketStatus.OPEN, db_index=True)

    category = models.CharField(max_length=30, choices=TicketCategory.choices, default=TicketCategory.GENERAL)
    category_source = models.CharField(
        max_length=10, choices=ClassificationSource.choices, default=ClassificationSource.FALLBACK
    )
    ai_category = models.CharField(max_length=30, choices=TicketCategory.choices, blank=True)
    priority = models.CharField(max_length=10, choices=TicketPriority.choices, default=TicketPriority.MEDIUM)
    priority_rank = models.PositiveSmallIntegerField(default=PRIORITY_RANK[TicketPriority.MEDIUM], db_index=True)
    priority_source = models.CharField(
        max_length=10, choices=ClassificationSource.choices, default=ClassificationSource.FALLBACK
    )
    ai_priority = models.CharField(max_length=10, choices=TicketPriority.choices, blank=True)
    ai_confidence = models.FloatField(null=True, blank=True)
    ai_reasoning = models.TextField(blank=True)
    ai_status = models.CharField(max_length=10, choices=AIStatus.choices, default=AIStatus.PENDING)
    ai_error = models.CharField(max_length=255, blank=True)
    ai_draft_status = models.CharField(max_length=10, choices=AIStatus.choices, default=AIStatus.PENDING)

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets",
        limit_choices_to={"role": "ADMIN"},
    )

    sla_due_at = models.DateTimeField(null=True, blank=True)
    first_response_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    last_admin_reply_at = models.DateTimeField(null=True, blank=True)
    last_author_activity_at = models.DateTimeField(null=True, blank=True)
    author_last_seen_at = models.DateTimeField(null=True, blank=True)
    admin_last_seen_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("priority_rank", "created_at")
        indexes = [
            models.Index(fields=["status", "priority_rank", "created_at"]),
            models.Index(fields=["author", "created_at"]),
        ]

    def __str__(self):
        return f"{self.reference} - {self.subject}"

    @property
    def reference(self) -> str:
        return f"TKT-{self.pk:04d}" if self.pk else "TKT-NEW"

    @property
    def is_active(self) -> bool:
        return self.status in self.ACTIVE_STATUSES

    def set_priority(self, priority: str) -> None:
        self.priority = priority
        self.priority_rank = PRIORITY_RANK[priority]
        self.sla_due_at = self.created_at + timedelta(hours=SLA_HOURS[priority])

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
    return f"attachments/ticket_{instance.ticket_id}/{filename}"


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
    AI_CLASSIFIED = "AI_CLASSIFIED", "AI classified"
    AI_FAILED = "AI_FAILED", "AI unavailable"
    STATUS_CHANGED = "STATUS_CHANGED", "Status changed"
    CATEGORY_CHANGED = "CATEGORY_CHANGED", "Category changed"
    PRIORITY_CHANGED = "PRIORITY_CHANGED", "Priority changed"
    ASSIGNED = "ASSIGNED", "Assignment changed"
    REPLIED = "REPLIED", "Reply sent"
    NOTE_ADDED = "NOTE_ADDED", "Internal note added"
    AUTHOR_REPLIED = "AUTHOR_REPLIED", "Author replied"
    AUTHOR_CONFIRMED = "AUTHOR_CONFIRMED", "Author confirmed resolution"
    AUTHOR_REOPENED = "AUTHOR_REOPENED", "Author reopened"


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
