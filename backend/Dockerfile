FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
# collectstatic needs a SECRET_KEY but no database.
RUN SECRET_KEY=build-only DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py collectstatic --noinput \
    && useradd --create-home app && chown -R app /app
USER app

ENV PORT=8000
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD python -c "import urllib.request,os;urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"8000\")}/health/')" || exit 1
CMD ["bash", "start.sh"]
