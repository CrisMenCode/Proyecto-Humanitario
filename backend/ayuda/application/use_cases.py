from ayuda.application.ports import (
    AnalysisRepository,
    CampaignAnalyzer,
    ResourceRepository,
    UnitOfWork,
)
from ayuda.domain.rules import DomainError, NotFound, validate_resource


class ResourceService:
    def __init__(
        self,
        repository: ResourceRepository,
        campaigns: ResourceRepository,
        points: ResourceRepository,
        unit_of_work: UnitOfWork,
    ):
        self.repository = repository
        self.campaigns = campaigns
        self.points = points
        self.unit_of_work = unit_of_work

    def list(self, **filters):
        return self.repository.list(**filters)

    def get(self, resource_id):
        return self.repository.get(resource_id)

    def _validate(self, data):
        validate_resource(self.repository.kind, data)
        try:
            if self.repository.kind != "campanas":
                self.campaigns.get(data["campana"])
            if self.repository.kind == "insumos":
                point = self.points.get(data["punto_acopio"])
                if point["campana"] != data["campana"]:
                    raise DomainError(
                        "El punto de acopio debe pertenecer a la misma campaña.",
                        {"punto_acopio": ["Selecciona un punto de esta campaña."]},
                    )
        except NotFound:
            raise DomainError(
                "La campaña o el punto de acopio indicado no existe."
            ) from None

    def save(self, data, resource_id=None):
        with self.unit_of_work():
            old = self.get(resource_id) if resource_id else None
            merged = {**(old or {}), **data}
            self._validate(merged)
            result = (
                self.repository.update(resource_id, data)
                if old
                else self.repository.create(data)
            )
            campaign_ids = (
                {result["id"]}
                if self.repository.kind == "campanas"
                else {result["campana"]}
            )
            if old and self.repository.kind != "campanas":
                campaign_ids.add(old["campana"])
            self.repository.touch_campaigns(campaign_ids)
            return self.get(result["id"])

    def delete(self, resource_id):
        with self.unit_of_work():
            old = self.get(resource_id)
            self.repository.delete(resource_id)
            if self.repository.kind != "campanas":
                self.repository.touch_campaigns({old["campana"]})


class RequestAnalysis:
    def __init__(self, repository: AnalysisRepository):
        self.repository = repository

    def execute(self, campaign_id):
        # El adaptador persiste solicitud y evento en una sola transacción.
        return self.repository.request(campaign_id)


class ProcessAnalysis:
    def __init__(self, repository: AnalysisRepository, analyzer: CampaignAnalyzer):
        self.repository = repository
        self.analyzer = analyzer

    def execute(self, analysis_id):
        snapshot = self.repository.claim(analysis_id)
        if snapshot is None:
            return
        result = self.analyzer.analyze(snapshot)
        expected = {item["id"] for item in snapshot["insumos"] if item["faltante"] > 0}
        priorities = result.get("prioridades", [])
        actual = [item.get("insumo_id") for item in priorities]
        if len(actual) != len(set(actual)) or set(actual) != expected:
            raise DomainError(
                "El análisis no corresponde a las necesidades pendientes de esta campaña."
            )
        self.repository.complete(analysis_id, result)
