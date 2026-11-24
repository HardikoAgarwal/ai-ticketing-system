from django.db import models
from django.utils import timezone

from apps.workspaces.models import Category, Workspace


class Article(models.Model):
    """A knowledge-base article. Chunks of it are embedded for retrieval-augmented drafts."""

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="articles")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="articles")
    title = models.CharField(max_length=200)
    body = models.TextField()
    is_published = models.BooleanField(default=True)
    is_internal = models.BooleanField(default=False, help_text="Staff-only: never shown to requesters or suggested to them")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("title",)

    def __str__(self):
        return self.title


class Chunk(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="chunks")
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="chunks")
    position = models.PositiveSmallIntegerField(default=0)
    text = models.TextField()
    embedding = models.JSONField(null=True, blank=True, editable=False)

    class Meta:
        ordering = ("article_id", "position")
