from rest_framework import serializers

from .models import Book, ProductionStage
from .royalty import royalty_notes


class BookSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source="status_label", read_only=True)
    is_published = serializers.BooleanField(read_only=True)
    stage_index = serializers.IntegerField(read_only=True)
    stage_count = serializers.SerializerMethodField()
    royalty_notes = serializers.SerializerMethodField()
    author_name = serializers.CharField(source="author.user.full_name", read_only=True)
    author_code = serializers.CharField(source="author.author_code", read_only=True)

    class Meta:
        model = Book
        fields = (
            "id",
            "book_code",
            "title",
            "isbn",
            "genre",
            "publication_date",
            "stage",
            "status",
            "is_published",
            "stage_index",
            "stage_count",
            "mrp",
            "author_royalty_per_copy",
            "total_copies_sold",
            "total_royalty_earned",
            "royalty_paid",
            "royalty_pending",
            "last_royalty_payout_date",
            "print_partner",
            "available_on",
            "royalty_notes",
            "author_name",
            "author_code",
        )
        read_only_fields = fields

    def get_stage_count(self, _obj) -> int:
        return len(ProductionStage.ordered())

    def get_royalty_notes(self, obj) -> dict:
        return royalty_notes(obj)


class BookBriefSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source="status_label", read_only=True)

    class Meta:
        model = Book
        fields = ("id", "book_code", "title", "status", "is_published")
        read_only_fields = fields
