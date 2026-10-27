from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.db.models import Count, F, Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone

from ayuda.adapters.outbound.persistence.models import (
    Analysis,
    Campaign,
    CollectionPoint,
    OutboxEvent,
    Supply,
    Volunteer,
)
from ayuda.domain.rules import Conflict, NotFound, Page, calculate_supply

MODELS = {
    "campanas": Campaign,
    "voluntarios": Volunteer,
    "puntos-acopio": CollectionPoint,
    "insumos": Supply,
}


class DjangoResourceRepository:
    def __init__(self, kind):
        self.kind = kind
        self.model = MODELS[kind]

    def _queryset(self):
        qs = self.model.objects.all().order_by("-id")
        if self.kind == "campanas":
            return qs.annotate(
                voluntarios_activos=Count(
                    "voluntarios", filter=Q(voluntarios__activo=True), distinct=True
                ),
                total_insumos=Count("insumos", distinct=True),
                metas_cubiertas=Count(
                    "insumos",
                    filter=Q(
                        insumos__cantidad_recibida__gte=F("insumos__cantidad_requerida")
                    ),
                    distinct=True,
                ),
            )
        return qs.select_related(
            "campana", *(["punto_acopio"] if self.kind == "insumos" else [])
        )

    def _record(self, obj):
        data = {
            field.name: getattr(obj, field.attname) for field in self.model._meta.fields
        }
        if self.kind == "campanas":
            data.update(
                voluntarios_activos=obj.voluntarios_activos,
                total_insumos=obj.total_insumos,
                necesidades_pendientes=obj.total_insumos - obj.metas_cubiertas,
                cobertura=round(obj.metas_cubiertas / obj.total_insumos * 100)
                if obj.total_insumos
                else 0,
            )
        else:
            data["campana_nombre"] = obj.campana.nombre
        if self.kind == "insumos":
            data["punto_nombre"] = obj.punto_acopio.nombre
            data.update(calculate_supply(data))
        return data

    def get(self, resource_id):
        try:
            return self._record(self._queryset().get(pk=resource_id))
        except self.model.DoesNotExist:
            raise NotFound("No se encontró el registro solicitado.") from None

    def list(self, *, page=1, page_size=12, search="", campaign=None):
        qs = self._queryset()
        if search:
            qs = qs.filter(nombre__icontains=search)
        if campaign is not None:
            qs = (
                qs.filter(pk=campaign)
                if self.kind == "campanas"
                else qs.filter(campana_id=campaign)
            )
        total = qs.count()
        start = (page - 1) * page_size
        return Page(
            [self._record(obj) for obj in qs[start : start + page_size]],
            total,
            page,
            page_size,
        )

    def _write_data(self, data):
        return {
            f"{key}_id" if key in {"campana", "punto_acopio"} else key: value
            for key, value in data.items()
        }

    def create(self, data):
        obj = self.model.objects.create(**self._write_data(data))
        return self.get(obj.pk)

    def update(self, resource_id, data):
        if self.kind == "puntos-acopio" and "campana" in data:
            point = CollectionPoint.objects.get(pk=resource_id)
            if point.campana_id != data["campana"] and point.insumos.exists():
                raise Conflict(
                    "Este punto tiene insumos. No puedes cambiar su campaña hasta reasignarlos."
                )
        self.model.objects.filter(pk=resource_id).update(**self._write_data(data))
        return self.get(resource_id)

    def delete(self, resource_id):
        try:
            self.model.objects.get(pk=resource_id).delete()
        except ProtectedError:
            raise Conflict(
                "El registro tiene relaciones activas o análisis históricos. Elimina o reasigna sus dependencias; también puedes finalizar la campaña."
            ) from None

    def touch_campaigns(self, campaign_ids):
        Campaign.objects.filter(pk__in=campaign_ids).update(
            revision=F("revision") + 1, actualizada_en=timezone.now()
        )


class DjangoAnalysisRepository:
    def _record(self, obj):
        return {
            "id": str(obj.pk),
            "campana": obj.campana_id,
            "estado": obj.estado,
            "revision": obj.revision,
            "proveedor": obj.proveedor,
            "resultado": obj.resultado,
            "error": obj.error,
            "intentos": obj.intentos,
            "creado_en": obj.creado_en,
            "terminado_en": obj.terminado_en,
            "desactualizado": obj.revision != obj.campana.revision,
        }

    def get(self, analysis_id):
        try:
            return self._record(
                Analysis.objects.select_related("campana").get(pk=analysis_id)
            )
        except Analysis.DoesNotExist:
            raise NotFound("No se encontró este análisis.") from None

    def latest(self, campaign_id):
        obj = (
            Analysis.objects.select_related("campana")
            .filter(campana_id=campaign_id)
            .first()
        )
        return self._record(obj) if obj else None

    def request(self, campaign_id):
        with transaction.atomic():
            try:
                campaign = Campaign.objects.select_for_update().get(pk=campaign_id)
            except Campaign.DoesNotExist:
                raise NotFound("No se encontró la campaña.") from None
            # Deduplicación por versión: no se cobra dos veces por doble clic.
            existing = (
                Analysis.objects.select_related("campana")
                .filter(campana=campaign, revision=campaign.revision)
                .exclude(estado="fallido")
                .first()
            )
            if existing:
                return self._record(existing), False
            snapshot = {
                "campana": {
                    "id": campaign.pk,
                    "nombre": campaign.nombre,
                    "descripcion": campaign.descripcion,
                    "municipio": campaign.municipio,
                    "fecha_fin": campaign.fecha_fin.isoformat(),
                    "estado": campaign.estado,
                    "familias_objetivo": campaign.familias_objetivo,
                    "revision": campaign.revision,
                },
                "insumos": DjangoResourceRepository("insumos")
                .list(page_size=10000, campaign=campaign_id)
                .items,
                # No se envían nombres ni contactos de voluntarios al proveedor.
                "voluntarios_disponibles": list(
                    campaign.voluntarios.filter(activo=True).values(
                        "habilidades", "disponibilidad", "rol"
                    )
                ),
                "puntos": list(
                    campaign.puntos.values("id", "nombre", "horario", "activo")
                ),
            }
            obj = Analysis.objects.create(
                campana=campaign,
                revision=campaign.revision,
                proveedor=settings.AI_PROVIDER,
                snapshot=snapshot,
            )
            OutboxEvent.objects.create(analysis=obj)
            return self._record(obj), True

    def claim(self, analysis_id):
        with transaction.atomic():
            obj = Analysis.objects.select_for_update().get(pk=analysis_id)
            if obj.estado != "pendiente":
                return None
            obj.estado = "procesando"
            obj.iniciado_en = timezone.now()
            obj.intentos += 1
            obj.save(update_fields=["estado", "iniciado_en", "intentos"])
            return obj.snapshot

    def complete(self, analysis_id, result):
        Analysis.objects.filter(pk=analysis_id).update(
            estado="completado", resultado=result, error="", terminado_en=timezone.now()
        )

    def fail(self, analysis_id, message):
        Analysis.objects.filter(pk=analysis_id).update(
            estado="fallido", error=message[:300], terminado_en=timezone.now()
        )

    def retry(self, analysis_id):
        Analysis.objects.filter(pk=analysis_id).update(
            estado="pendiente",
            error="El proveedor está temporalmente ocupado. Reintentando.",
        )

    def recover_stuck(self):
        # Una tarea terminada abruptamente se recupera después de vencer su lease.
        with transaction.atomic():
            stale = list(
                Analysis.objects.filter(
                    estado="procesando",
                    iniciado_en__lt=timezone.now() - timedelta(minutes=3),
                ).values_list("id", flat=True)
            )
            Analysis.objects.filter(pk__in=stale, intentos__gte=3).update(
                estado="fallido",
                error="Se agotaron los intentos del worker.",
                terminado_en=timezone.now(),
            )
            retry_ids = list(
                Analysis.objects.filter(pk__in=stale, intentos__lt=3).values_list(
                    "id", flat=True
                )
            )
            Analysis.objects.filter(pk__in=retry_ids).update(estado="pendiente")
            OutboxEvent.objects.filter(analysis_id__in=retry_ids).update(
                published_at=None
            )
