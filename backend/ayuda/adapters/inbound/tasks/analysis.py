import logging
from celery import shared_task
from ayuda.adapters.outbound.persistence.models import Analysis
from ayuda.adapters.outbound.persistence.repositories import DjangoAnalysisRepository
from ayuda.composition import analysis_processor
from ayuda.domain.rules import DomainError, RetryableAnalysisError

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=2,
    acks_late=True,
    reject_on_worker_lost=True,
    soft_time_limit=65,
    time_limit=75,
)
def process_analysis(self, analysis_id):
    repository = DjangoAnalysisRepository()
    try:
        provider = Analysis.objects.values_list("proveedor", flat=True).get(
            pk=analysis_id
        )
        analysis_processor(provider).execute(analysis_id)
    except Analysis.DoesNotExist:
        return
    except RetryableAnalysisError as error:
        if self.request.retries >= self.max_retries:
            repository.fail(
                analysis_id,
                "El proveedor no respondió después de tres intentos. Puedes volver a solicitar el análisis.",
            )
            return
        repository.retry(analysis_id)
        raise self.retry(exc=error, countdown=5 * 2**self.request.retries)
    except DomainError as error:
        repository.fail(analysis_id, error.message)
    except Exception:
        # No persistir respuestas del proveedor, prompts ni claves en el error público.
        logger.exception("Error procesando el análisis %s", analysis_id)
        repository.fail(
            analysis_id,
            "No se pudo completar el análisis. Revisa la configuración y vuelve a intentarlo.",
        )
