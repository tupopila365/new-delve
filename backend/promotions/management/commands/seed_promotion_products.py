from django.core.management.base import BaseCommand

from promotions.product_seed import seed_promotion_products


class Command(BaseCommand):
    help = "Create missing promotion packages (does not overwrite existing admin-managed packages)."

    def handle(self, *args, **options):
        created = seed_promotion_products()
        self.stdout.write(self.style.SUCCESS(f"Created {created} promotion package(s)."))
