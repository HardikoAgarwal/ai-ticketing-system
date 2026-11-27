import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-secret-key-change-me")
DEBUG = env_bool("DEBUG", False)
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "drf_spectacular",
    "corsheaders",
    "channels",
    "storages",
    # Local
    "apps.accounts",
    "apps.workspaces",
    "apps.tickets",
    "apps.kb",
    "apps.ai",
    "apps.jobs",
    "apps.realtime",
    "apps.analytics",
    "apps.demo",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("DATABASE_URL", "postgres://localhost:5432/helpdesk"),
        conn_max_age=60,
    )
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Storage: local filesystem in dev, S3-compatible (Supabase Storage / AWS S3 / R2 / B2) when configured ---
USE_S3 = bool(os.environ.get("AWS_STORAGE_BUCKET_NAME"))
if USE_S3:
    AWS_STORAGE_BUCKET_NAME = os.environ["AWS_STORAGE_BUCKET_NAME"]
    AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
    AWS_S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL") or None
    AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "auto")
    # Supabase requires path-style URLs (endpoint/bucket/key) rather than bucket subdomains.
    AWS_S3_ADDRESSING_STYLE = os.environ.get("AWS_S3_ADDRESSING_STYLE", "auto")
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = True
    AWS_QUERYSTRING_EXPIRE = 300
    AWS_S3_FILE_OVERWRITE = False
    STORAGES = {
        "default": {"BACKEND": "storages.backends.s3.S3Storage"},
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }
else:
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
    }

ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
ATTACHMENT_ALLOWED_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
}
ATTACHMENT_MAX_FILES = 3

# --- Inbound email webhook (disabled unless a shared secret is set) ---
INBOUND_EMAIL_SECRET = os.environ.get("INBOUND_EMAIL_SECRET", "")

# --- Demo sandbox ---
DEMO_TTL_HOURS = int(os.environ.get("DEMO_TTL_HOURS", "24"))
DEMO_MAX_ACTIVE = int(os.environ.get("DEMO_MAX_ACTIVE", "200"))
DEMO_START_THROTTLE = os.environ.get("DEMO_START_THROTTLE", "10/hour")

# --- REST framework ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework_simplejwt.authentication.JWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "common.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "ticket_create": "20/hour",
        "ai_regenerate": "30/hour",
        "login": "20/min",
        "demo_start": DEMO_START_THROTTLE,
        "register": "10/hour",
        "workspace_request": "5/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Helpdesk AI API",
    "DESCRIPTION": (
        "Multi-workspace helpdesk with AI triage and knowledge-grounded drafts. "
        "Authenticate via POST /api/v1/auth/login/ (or start a sandbox with POST /api/v1/demo/start/) "
        "and pass `Authorization: Bearer <access>`. Workspace resources live under /api/v1/w/<slug>/."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "TicketPriorityEnum": "apps.tickets.models.TicketPriority",
        "TicketStatusEnum": "apps.tickets.models.TicketStatus",
        "AIStatusEnum": "apps.tickets.models.AIStatus",
        "ClassificationSourceEnum": "apps.tickets.models.ClassificationSource",
        "MessageKindEnum": "apps.tickets.models.MessageKind",
        "RoleEnum": "apps.workspaces.models.Role",
    },
}

# --- CORS ---
CORS_ALLOWED_ORIGINS = [
    origin.rstrip("/") for origin in env_list("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
]
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# --- Realtime / jobs / cache ---
# Single-process deployment: in-memory channel layer, a Postgres-backed job table with an
# in-process thread pool, and a local-memory cache. No Redis, no Celery.
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
JOBS_EAGER = env_bool("JOBS_EAGER", False)
JOBS_MAX_WORKERS = int(os.environ.get("JOBS_MAX_WORKERS", "4"))
JOBS_MAX_ATTEMPTS = 4

# --- AI ---
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
AI_ENABLED = env_bool("AI_ENABLED", True) and bool(OPENAI_API_KEY)
# Any OpenAI-compatible endpoint (e.g. Gemini, Groq); empty means api.openai.com.
AI_BASE_URL = os.environ.get("AI_BASE_URL") or None
AI_MODEL = os.environ.get("AI_MODEL", "gpt-4o-mini")
# For thinking models (e.g. Gemini): "none" stops hidden reasoning from eating the small token caps.
AI_REASONING_EFFORT = os.environ.get("AI_REASONING_EFFORT", "")
AI_TIMEOUT_SECONDS = float(os.environ.get("AI_TIMEOUT_SECONDS", "20"))
AI_CIRCUIT_FAILURE_THRESHOLD = int(os.environ.get("AI_CIRCUIT_FAILURE_THRESHOLD", "5"))
AI_CIRCUIT_COOLDOWN_SECONDS = int(os.environ.get("AI_CIRCUIT_COOLDOWN_SECONDS", "300"))
# USD per 1M tokens, used for cost estimates in the AI usage log.
AI_PRICE_INPUT_PER_M = float(os.environ.get("AI_PRICE_INPUT_PER_M", "0.15"))
AI_PRICE_OUTPUT_PER_M = float(os.environ.get("AI_PRICE_OUTPUT_PER_M", "0.60"))
AI_EMBED_MODEL = os.environ.get("AI_EMBED_MODEL", "gemini-embedding-001")
AI_EMBED_DIMENSIONS = int(os.environ.get("AI_EMBED_DIMENSIONS", "768"))
# Free-tier protection: hard daily caps on live LLM calls (successful + failed), globally and per workspace.
AI_DAILY_CALL_CAP = int(os.environ.get("AI_DAILY_CALL_CAP", "400"))
AI_WORKSPACE_DAILY_CAP = int(os.environ.get("AI_WORKSPACE_DAILY_CAP", "40"))

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"simple": {"format": "[{levelname}] {name}: {message}", "style": "{"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "simple"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {"django.db.backends": {"level": "WARNING"}},
}
