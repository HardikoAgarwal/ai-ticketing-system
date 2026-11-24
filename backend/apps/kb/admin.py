from django.contrib import admin

from .models import Article, Chunk

admin.site.register([Article, Chunk])
