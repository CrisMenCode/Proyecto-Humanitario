# Punto de descubrimiento de Celery. La tarea está en el adaptador de entrada.
from ayuda.adapters.inbound.tasks.analysis import process_analysis

__all__ = ["process_analysis"]
