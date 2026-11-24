from django.contrib import admin

from .models import Macro, Ticket, TicketMessage

admin.site.register([Ticket, TicketMessage, Macro])
