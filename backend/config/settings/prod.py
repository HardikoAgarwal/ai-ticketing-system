import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403
from .base import ALLOWED_HOSTS, SECRET_KEY, env_bool

DEBUG = False

if SECRET_KEY.startswith("dev-insecure"):
    raise ImproperlyConfigured("SECRET_KEY must be set in production")

# Platform-provided hostnames (Render, Railway, Koyeb, Fly) are added automatically; anything else
# goes in ALLOWED_HOSTS.
for _var in ("RENDER_EXTERNAL_HOSTNAME", "RAILWAY_PUBLIC_DOMAIN", "KOYEB_PUBLIC_DOMAIN", "FLY_APP_NAME"):
    if _host := os.environ.get(_var):
        ALLOWED_HOSTS = [*ALLOWED_HOSTS, f"{_host}.fly.dev" if _var == "FLY_APP_NAME" else _host]

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
SECURE_REDIRECT_EXEMPT = [r"^health/$"]
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {"django.request": {"level": "WARNING"}},
}
