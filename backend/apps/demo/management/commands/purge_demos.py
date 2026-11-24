from django.core.management.base import BaseCommand

from apps.jobs.runner import purge_old
from apps.workspaces.services import purge_expired_demos


class Command(BaseCommand):
    help = "Delete expired demo workspaces (and their demo users) and old finished jobs."

    def handle(self, *args, **options):
        demos = purge_expired_demos()
        jobs = purge_old()
        self.stdout.write(self.style.SUCCESS(f"Purged {demos} demo workspace(s) and {jobs} old job(s)."))
