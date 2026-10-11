from django.db.models import Count, Q, Sum
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAuthor

from .models import Book, ProductionStage
from .royalty import MIN_PAYOUT_THRESHOLD, next_payout_window
from .serializers import BookSerializer


def books_visible_to(user):
    qs = Book.objects.select_related("author__user")
    if user.is_admin:
        return qs
    return qs.filter(author__user=user)


@extend_schema(tags=["Books"], summary="List books (authors see only their own; admins see all, filter by ?author=AUTH001)")
class BookListView(generics.ListAPIView):
    serializer_class = BookSerializer
    pagination_class = None
    search_fields = ("title", "isbn", "book_code")
    ordering_fields = ("publication_date", "title", "total_copies_sold", "royalty_pending")

    def get_queryset(self):
        qs = books_visible_to(self.request.user)
        author_code = self.request.query_params.get("author")
        if author_code and self.request.user.is_admin:
            qs = qs.filter(author__author_code=author_code)
        return qs


@extend_schema(tags=["Books"], summary="Book detail")
class BookDetailView(generics.RetrieveAPIView):
    serializer_class = BookSerializer

    def get_queryset(self):
        return books_visible_to(self.request.user)


@extend_schema(
    tags=["Books"],
    summary="Author dashboard summary (totals, next payout window, ticket counts)",
    responses=inline_serializer(
        "AuthorSummary",
        fields={
            "books_published": serializers.IntegerField(),
            "books_in_production": serializers.IntegerField(),
            "total_copies_sold": serializers.IntegerField(),
            "total_royalty_earned": serializers.DecimalField(max_digits=12, decimal_places=2),
            "total_royalty_paid": serializers.DecimalField(max_digits=12, decimal_places=2),
            "total_royalty_pending": serializers.DecimalField(max_digits=12, decimal_places=2),
            "min_payout_threshold": serializers.DecimalField(max_digits=12, decimal_places=2),
            "next_payout": serializers.DictField(),
            "active_tickets": serializers.IntegerField(),
            "unread_tickets": serializers.IntegerField(),
        },
    ),
)
class AuthorSummaryView(APIView):
    permission_classes = (IsAuthor,)

    def get(self, request):
        from apps.tickets.models import Ticket
        from apps.tickets.selectors import unread_for_author_q

        books = Book.objects.filter(author__user=request.user)
        totals = books.aggregate(
            published=Count("id", filter=Q(stage=ProductionStage.PUBLISHED)),
            in_production=Count("id", filter=~Q(stage=ProductionStage.PUBLISHED)),
            copies=Sum("total_copies_sold"),
            earned=Sum("total_royalty_earned"),
            paid=Sum("royalty_paid"),
            pending=Sum("royalty_pending"),
        )
        tickets = Ticket.objects.filter(author__user=request.user)
        window = next_payout_window()
        return Response(
            {
                "books_published": totals["published"] or 0,
                "books_in_production": totals["in_production"] or 0,
                "total_copies_sold": totals["copies"] or 0,
                "total_royalty_earned": totals["earned"] or 0,
                "total_royalty_paid": totals["paid"] or 0,
                "total_royalty_pending": totals["pending"] or 0,
                "min_payout_threshold": MIN_PAYOUT_THRESHOLD,
                "next_payout": {
                    "quarter": window.quarter_label,
                    "quarter_end": window.quarter_end,
                    "payout_by": window.payout_by,
                },
                "active_tickets": tickets.filter(status__in=Ticket.ACTIVE_STATUSES).count(),
                "unread_tickets": tickets.filter(unread_for_author_q()).count(),
            }
        )
