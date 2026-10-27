import time
from django.core.management.base import BaseCommand
from django.utils import timezone
from ayuda.adapters.outbound.messaging.publisher import CeleryEventPublisher
from ayuda.adapters.outbound.persistence.models import OutboxEvent
from ayuda.adapters.outbound.persistence.repositories import DjangoAnalysisRepository
from ayuda.domain.rules import AnalysisRequested


class Command(BaseCommand):
    help = "Publica la outbox en Redis. --watch revisa pendientes cada 2 segundos. Ejecutar un único dispatcher."

    def add_arguments(self, parser):
        parser.add_argument("--watch", action="store_true")

    def handle(self, *args, **options):
        publisher = CeleryEventPublisher()
        try:
            while True:
                DjangoAnalysisRepository().recover_stuck()
                for event in OutboxEvent.objects.filter(
                    published_at__isnull=True
                ).order_by("created_at")[:50]:
                    try:
                        publisher.publish(AnalysisRequested(str(event.analysis_id)))
                    except Exception:
                        self.stderr.write(
                            "Redis no está disponible. El evento sigue guardado y se reintentará."
                        )
                        break
                    OutboxEvent.objects.filter(pk=event.pk).update(
                        published_at=timezone.now()
                    )
                    self.stdout.write(
                        f"Publicado {event.event_type}: {event.analysis_id}"
                    )
                if not options["watch"]:
                    break
                time.sleep(2)
        except KeyboardInterrupt:
            self.stdout.write(
                "Dispatcher detenido. Los pendientes permanecen en la base de datos."
            )
