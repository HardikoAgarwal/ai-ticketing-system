from .base import *  # noqa: F401,F403

DEBUG = False
CELERY_TASK_ALWAYS_EAGER = True
OPENAI_API_KEY = "test-key"
AI_ENABLED = True
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
