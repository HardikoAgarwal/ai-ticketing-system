from django.contrib import admin

from .models import Book


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("book_code", "title", "author", "stage", "total_copies_sold", "royalty_pending")
    list_filter = ("stage", "print_partner")
    search_fields = ("book_code", "title", "isbn", "author__user__full_name")
