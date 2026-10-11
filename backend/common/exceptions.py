"""Consistent API error envelope: {"error": {"code", "message", "details"}}."""

import logging

from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


class DomainError(exceptions.APIException):
    """Business-rule violation (e.g. invalid status transition)."""

    status_code = status.HTTP_409_CONFLICT
    default_code = "conflict"
    default_detail = "This action conflicts with the current state of the resource."

    def __init__(self, message: str, code: str | None = None, status_code: int | None = None):
        super().__init__(detail=message, code=code or self.default_code)
        if status_code:
            self.status_code = status_code


def _first_message(details) -> str:
    if isinstance(details, list) and details:
        return _first_message(details[0])
    if isinstance(details, dict) and details:
        key, value = next(iter(details.items()))
        message = _first_message(value)
        return message if key in ("non_field_errors", "detail") else f"{key}: {message}"
    return str(details)


def api_exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        exc = exceptions.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
    elif isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = exceptions.PermissionDenied()

    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API error", exc_info=exc)
        return Response(
            {"error": {"code": "server_error", "message": "Something went wrong on our side. Please try again.", "details": None}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, exceptions.ValidationError):
        payload = {
            "code": "validation_error",
            "message": _first_message(response.data),
            "details": response.data,
        }
    else:
        detail = response.data.get("detail", response.data) if isinstance(response.data, dict) else response.data
        codes = exc.get_codes() if hasattr(exc, "get_codes") else None
        payload = {
            "code": codes if isinstance(codes, str) else getattr(exc, "default_code", "error"),
            "message": str(detail),
            "details": None,
        }

    response.data = {"error": payload}
    return response
