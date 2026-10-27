"""Punto de composición: conecta los puertos con sus adaptadores."""

from django.conf import settings
from django.db import transaction
from ayuda.application.use_cases import ProcessAnalysis, ResourceService
from ayuda.adapters.outbound.persistence.repositories import (
    DjangoAnalysisRepository,
    DjangoResourceRepository,
)
from ayuda.adapters.outbound.ai.analyzers import DemoAnalyzer, OpenAIAnalyzer
from ayuda.domain.rules import DomainError


def resource_service(kind):
    return ResourceService(
        DjangoResourceRepository(kind),
        DjangoResourceRepository("campanas"),
        DjangoResourceRepository("puntos-acopio"),
        transaction.atomic,
    )


def analysis_processor(provider):
    if provider == "demo":
        analyzer = DemoAnalyzer()
    elif provider == "openai":
        analyzer = OpenAIAnalyzer(settings.OPENAI_API_KEY, settings.OPENAI_MODEL)
    else:
        raise DomainError("AI_PROVIDER debe ser demo u openai.")
    return ProcessAnalysis(DjangoAnalysisRepository(), analyzer)
