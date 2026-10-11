#!/usr/bin/env bash
# Single-container entrypoint (Render free tier): migrate, then run the Celery worker
# in the background and the ASGI server (HTTP + WebSockets) in the foreground.
set -euo pipefail

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}"

python manage.py migrate --noinput

if [[ "${SEED_ON_START:-false}" == "true" ]]; then
  python manage.py seed_bookleaf --with-sample-tickets
fi

# Thread pool: AI calls are I/O-bound, and threads keep memory well under 512 MB.
celery -A config worker --pool=threads --concurrency="${CELERY_CONCURRENCY:-4}" --loglevel=INFO &
CELERY_PID=$!
trap 'kill -TERM "$CELERY_PID" 2>/dev/null || true' EXIT TERM INT

daphne -b 0.0.0.0 -p "${PORT:-8000}" --proxy-headers config.asgi:application
