from rest_framework.permissions import BasePermission


def _membership(request):
    return getattr(request, "membership", None)


class IsStaff(BasePermission):
    message = "Only team members of this workspace can perform this action."

    def has_permission(self, request, view):
        m = _membership(request)
        return bool(m and m.is_staff_member)


class IsManager(BasePermission):
    message = "Only workspace owners and admins can perform this action."

    def has_permission(self, request, view):
        m = _membership(request)
        return bool(m and m.is_manager)


class IsRequester(BasePermission):
    message = "Only requesters can perform this action."

    def has_permission(self, request, view):
        m = _membership(request)
        return bool(m and not m.is_staff_member)


class IsMember(BasePermission):
    def has_permission(self, request, view):
        return _membership(request) is not None
