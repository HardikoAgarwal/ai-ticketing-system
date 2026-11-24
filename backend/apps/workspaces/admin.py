from django.contrib import admin

from .models import Category, Invite, Membership, Record, Workspace

admin.site.register([Workspace, Membership, Category, Record, Invite])
