"""Reglas puras: este módulo no depende de Django ni de proveedores externos."""

from dataclasses import dataclass
from typing import Any


class DomainError(Exception):
    def __init__(self, message: str, fields: dict | None = None):
        self.message = message
        self.fields = fields or {}
        super().__init__(message)


class NotFound(DomainError):
    pass


class Conflict(DomainError):
    pass


class RetryableAnalysisError(Exception):
    pass


@dataclass(frozen=True)
class AnalysisRequested:
    analysis_id: str
    event_type: str = "AnalisisCampanaSolicitado"


@dataclass(frozen=True)
class Page:
    items: list[dict[str, Any]]
    total: int
    page: int
    page_size: int


def validate_resource(kind: str, data: dict) -> None:
    if kind == "campanas":
        if data["fecha_fin"] < data["fecha_inicio"]:
            raise DomainError(
                "La fecha final debe ser posterior o igual a la inicial.",
                {"fecha_fin": ["Revisa el rango de fechas."]},
            )
        if data["familias_objetivo"] < 1:
            raise DomainError("La campaña debe atender al menos una familia.")
    if kind == "insumos":
        if data["cantidad_requerida"] <= 0 or data["cantidad_recibida"] < 0:
            raise DomainError(
                "La meta debe ser positiva y lo recibido no puede ser negativo."
            )


def calculate_supply(data: dict) -> dict:
    required = data["cantidad_requerida"]
    received = data["cantidad_recibida"]
    return {
        "faltante": max(0, required - received),
        "cobertura": round(min(100, received / required * 100), 1) if required else 0,
    }
