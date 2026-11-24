from django.contrib import admin

from .models import AIDraft, AIRequestLog

admin.site.register([AIDraft, AIRequestLog])
