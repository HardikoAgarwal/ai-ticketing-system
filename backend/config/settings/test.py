from .base import *  # noqa: F401,F403

DEBUG = False
CELERY_TASK_ALWAYS_EAGER = True
OPENAI_API_KEY = "test-key"
AI_ENABLED = True
AI_BASE_URL = None
AI_MODEL = "gpt-4o-mini"
AI_REASONING_EFFORT = ""
AI_PRICE_INPUT_PER_M = 0.15
AI_PRICE_OUTPUT_PER_M = 0.60
USE_S3 = False
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {  # noqa: F405
    "ticket_create": "1000/hour",
    "ai_regenerate": "1000/hour",
    "login": "1000/min",
}}
