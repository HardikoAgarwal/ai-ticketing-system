#!/usr/bin/env bash
# Single-container entrypoint: migrate, then serve HTTP + WebSockets with Daphne.
# Background jobs (AI pipeline, embeddings) run on an in-process thread pool and are durable in
# Postgres, so there is no worker process, broker or Redis to run.
set -euo pipefail

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}"

python manage.py migrate --noinput
python manage.py purge_demos || true

exec daphne -b 0.0.0.0 -p "${PORT:-8000}" --proxy-headers config.asgi:application
