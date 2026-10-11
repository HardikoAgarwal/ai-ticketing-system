from datetime import date
from decimal import Decimal

import pytest
from django.core.management import call_command

from apps.accounts.models import User
from apps.ai.fallback import classify
from apps.catalog.models import Book
from apps.catalog.royalty import is_below_threshold, next_payout_window
from apps.tickets.models import Ticket


@pytest.mark.parametrize(
    "subject,description,category,priority",
    [
        ("Royalty not received", "I haven't received my royalty payment for 6 months.", "ROYALTY_PAYMENTS", "CRITICAL"),
        ("ISBN mismatch", "The ISBN on Amazon is different from my printed copy.", "ISBN_METADATA", "HIGH"),
        ("Book still in cover design", "When will my book move past cover design stage?", "BOOK_STATUS", "MEDIUM"),
        ("Print quality", "Author copies arrived with blurry images and misaligned pages.", "PRINTING_QUALITY", "HIGH"),
        ("Not on Flipkart", "My book is not available on Flipkart yet.", "DISTRIBUTION", "MEDIUM"),
        ("Update bio", "How do I update my author bio on the website?", "GENERAL", "LOW"),
    ],
)
def test_fallback_classifier_on_brief_examples(subject, description, category, priority):
    result = classify(subject, description)
    assert (result.category, result.priority) == (category, priority)


@pytest.mark.parametrize(
    "today,expected",
    [(date(2026, 10, 11), date(2026, 11, 14)), (date(2026, 2, 1), date(2026, 2, 14)), (date(2026, 5, 20), date(2026, 8, 14))],
)
def test_next_payout_window(today, expected):
    window = next_payout_window(today)
    assert window.payout_by == expected
    assert window.payout_by >= today


def test_payout_threshold():
    assert is_below_threshold(Decimal("999.99"))
    assert not is_below_threshold(Decimal("1000"))


@pytest.mark.django_db
def test_seed_is_idempotent_and_covers_sample_data():
    call_command("seed_bookleaf", "--with-sample-tickets", verbosity=0)
    call_command("seed_bookleaf", "--with-sample-tickets", verbosity=0)
    assert User.objects.filter(role=User.Role.AUTHOR).count() == 10
    assert User.objects.filter(role=User.Role.ADMIN).count() == 3
    assert Book.objects.count() == 18
    assert Ticket.objects.count() == 9
    unpublished = Book.objects.exclude(stage="PUBLISHED")
    assert unpublished.exists() and all(b.isbn in ("", None) or b.total_copies_sold == 0 for b in unpublished)
