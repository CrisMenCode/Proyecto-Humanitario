import uuid
from django.core.validators import MinValueValidator
from django.db import models


class Campaign(models.Model):
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField()
    municipio = models.CharField(max_length=100)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    estado = models.CharField(
        max_length=15,
        choices=[
            ("borrador", "Borrador"),
            ("activa", "Activa"),
            ("finalizada", "Finalizada"),
        ],
        default="activa",
    )
    familias_objetivo = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    revision = models.PositiveIntegerField(default=1)
    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(fecha_fin__gte=models.F("fecha_inicio")),
                name="campaign_dates_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(familias_objetivo__gte=1),
                name="campaign_families_positive",
            ),
        ]


class CollectionPoint(models.Model):
    campana = models.ForeignKey(
        Campaign, on_delete=models.PROTECT, related_name="puntos"
    )
    nombre = models.CharField(max_length=150)
    direccion = models.CharField(max_length=200)
    horario = models.CharField(max_length=150)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["-id"]


class Volunteer(models.Model):
    campana = models.ForeignKey(
        Campaign, on_delete=models.PROTECT, related_name="voluntarios"
    )
    nombre = models.CharField(max_length=150)
    habilidades = models.CharField(max_length=250)
    disponibilidad = models.CharField(max_length=150)
    rol = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["-id"]


class Supply(models.Model):
    campana = models.ForeignKey(
        Campaign, on_delete=models.PROTECT, related_name="insumos"
    )
    punto_acopio = models.ForeignKey(
        CollectionPoint, on_delete=models.PROTECT, related_name="insumos"
    )
    nombre = models.CharField(max_length=150)
    categoria = models.CharField(
        max_length=20,
        choices=[
            ("agua", "Agua"),
            ("alimentos", "Alimentos"),
            ("higiene", "Higiene"),
            ("abrigo", "Abrigo"),
            ("otros", "Otros"),
        ],
    )
    unidad = models.CharField(max_length=30)
    cantidad_requerida = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    cantidad_recibida = models.PositiveIntegerField(default=0)
    urgencia = models.CharField(
        max_length=10,
        choices=[("alta", "Alta"), ("media", "Media"), ("baja", "Baja")],
        default="media",
    )

    class Meta:
        ordering = ["-id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(cantidad_requerida__gte=1),
                name="supply_required_positive",
            ),
            models.UniqueConstraint(
                fields=["campana", "punto_acopio", "nombre", "unidad"],
                name="unique_supply_need",
            ),
        ]


class Analysis(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campana = models.ForeignKey(
        Campaign, on_delete=models.PROTECT, related_name="analisis"
    )
    estado = models.CharField(max_length=15, default="pendiente")
    revision = models.PositiveIntegerField()
    proveedor = models.CharField(max_length=20)
    snapshot = models.JSONField()
    resultado = models.JSONField(null=True, blank=True)
    error = models.CharField(max_length=300, blank=True)
    intentos = models.PositiveSmallIntegerField(default=0)
    creado_en = models.DateTimeField(auto_now_add=True)
    iniciado_en = models.DateTimeField(null=True)
    terminado_en = models.DateTimeField(null=True)

    class Meta:
        ordering = ["-creado_en"]


class OutboxEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis = models.OneToOneField(Analysis, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=80, default="AnalisisCampanaSolicitado")
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True)
