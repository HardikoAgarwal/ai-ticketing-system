from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    message = "Only BookLeaf team members can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsAuthor(BasePermission):
    message = "Only authors can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_author)
