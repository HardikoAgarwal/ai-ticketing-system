from django.urls import path

from .views import AuthorSummaryView, BookDetailView, BookListView

urlpatterns = [
    path("books/", BookListView.as_view(), name="book-list"),
    path("books/<int:pk>/", BookDetailView.as_view(), name="book-detail"),
    path("me/summary/", AuthorSummaryView.as_view(), name="author-summary"),
]
