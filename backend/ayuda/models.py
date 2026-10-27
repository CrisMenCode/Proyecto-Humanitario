"""Django descubre los modelos; su implementación vive en el adaptador."""

from ayuda.adapters.outbound.persistence.models import (
    Analysis,
    Campaign,
    CollectionPoint,
    OutboxEvent,
    Supply,
    Volunteer,
)

__all__ = [
    "Analysis",
    "Campaign",
    "CollectionPoint",
    "OutboxEvent",
    "Supply",
    "Volunteer",
]
