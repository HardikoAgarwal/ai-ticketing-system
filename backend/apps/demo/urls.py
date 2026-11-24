from django.urls import path

from .views import DemoStartView, DemoTemplatesView

urlpatterns = [
    path("templates/", DemoTemplatesView.as_view(), name="demo-templates"),
    path("start/", DemoStartView.as_view(), name="demo-start"),
]
