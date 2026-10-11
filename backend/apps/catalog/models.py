from django.db import models

from apps.accounts.models import AuthorProfile


class ProductionStage(models.TextChoices):
    """Ordered production pipeline from the BookLeaf Knowledge Base."""

    MANUSCRIPT_RECEIVED = "MANUSCRIPT_RECEIVED", "Manuscript Received"
    EDITING = "EDITING", "Editing"
    COVER_DESIGN = "COVER_DESIGN", "Cover Design"
    TYPESETTING = "TYPESETTING", "Typesetting"
    PROOFREADING = "PROOFREADING", "Proofreading"
    ISBN_ASSIGNMENT = "ISBN_ASSIGNMENT", "ISBN Assignment"
    PRINTING = "PRINTING", "Printing"
    DISTRIBUTION_SETUP = "DISTRIBUTION_SETUP", "Distribution Setup"
    PUBLISHED = "PUBLISHED", "Published & Live"

    @classmethod
    def ordered(cls) -> list[str]:
        return [choice.value for choice in cls]


class Book(models.Model):
    author = models.ForeignKey(AuthorProfile, on_delete=models.CASCADE, related_name="books")
    book_code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=255)
    isbn = models.CharField(max_length=32, blank=True)
    genre = models.CharField(max_length=120, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    stage = models.CharField(max_length=30, choices=ProductionStage.choices, default=ProductionStage.MANUSCRIPT_RECEIVED)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    author_royalty_per_copy = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_copies_sold = models.PositiveIntegerField(default=0)
    total_royalty_earned = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    royalty_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    royalty_pending = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    last_royalty_payout_date = models.DateField(null=True, blank=True)
    print_partner = models.CharField(max_length=80, blank=True)
    available_on = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ("-publication_date", "title")

    def __str__(self):
        return f"{self.book_code} - {self.title}"

    @property
    def is_published(self) -> bool:
        return self.stage == ProductionStage.PUBLISHED

    @property
    def status_label(self) -> str:
        if self.is_published:
            return ProductionStage.PUBLISHED.label
        return f"In Production - {self.get_stage_display()}"

    @property
    def stage_index(self) -> int:
        return ProductionStage.ordered().index(self.stage)
