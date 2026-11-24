from rest_framework import serializers

from apps.workspaces.models import Category

from .models import Article


class ArticleListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", default=None, read_only=True)
    excerpt = serializers.SerializerMethodField()
    indexed = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = ("id", "title", "category", "category_name", "is_published", "is_internal", "excerpt", "indexed", "updated_at")

    def get_excerpt(self, obj) -> str:
        return obj.body[:160] + ("…" if len(obj.body) > 160 else "")

    def get_indexed(self, obj) -> bool:
        chunks = list(obj.chunks.all())
        return bool(chunks) and all(c.embedding for c in chunks)


class ArticleSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Article
        fields = ("id", "title", "body", "category", "is_published", "is_internal", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at")

    def validate_category(self, category):
        request = self.context["request"]
        if category and category.workspace_id != request.workspace.id:
            raise serializers.ValidationError("Unknown category.")
        return category
