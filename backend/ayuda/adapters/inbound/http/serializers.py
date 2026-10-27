from rest_framework import serializers


class ListQuerySerializer(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=12)
    search = serializers.CharField(
        required=False, default="", allow_blank=True, max_length=150
    )
    campana = serializers.IntegerField(min_value=1, required=False)


class CampaignSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    nombre = serializers.CharField(max_length=150)
    descripcion = serializers.CharField()
    municipio = serializers.CharField(max_length=100)
    fecha_inicio = serializers.DateField()
    fecha_fin = serializers.DateField()
    estado = serializers.ChoiceField(
        choices=["borrador", "activa", "finalizada"], default="activa"
    )
    familias_objetivo = serializers.IntegerField(min_value=1)
    revision = serializers.IntegerField(read_only=True)
    creada_en = serializers.DateTimeField(read_only=True)
    actualizada_en = serializers.DateTimeField(read_only=True)
    voluntarios_activos = serializers.IntegerField(read_only=True)
    total_insumos = serializers.IntegerField(read_only=True)
    necesidades_pendientes = serializers.IntegerField(read_only=True)
    cobertura = serializers.FloatField(read_only=True)


class RelatedSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    campana = serializers.IntegerField(min_value=1)
    campana_nombre = serializers.CharField(read_only=True)
    nombre = serializers.CharField(max_length=150)


class VolunteerSerializer(RelatedSerializer):
    habilidades = serializers.CharField(max_length=250)
    disponibilidad = serializers.CharField(max_length=150)
    rol = serializers.CharField(max_length=100)
    activo = serializers.BooleanField(default=True)


class CollectionPointSerializer(RelatedSerializer):
    direccion = serializers.CharField(max_length=200)
    horario = serializers.CharField(max_length=150)
    activo = serializers.BooleanField(default=True)


class SupplySerializer(RelatedSerializer):
    punto_acopio = serializers.IntegerField(min_value=1)
    punto_nombre = serializers.CharField(read_only=True)
    categoria = serializers.ChoiceField(
        choices=["agua", "alimentos", "higiene", "abrigo", "otros"]
    )
    unidad = serializers.CharField(max_length=30)
    cantidad_requerida = serializers.IntegerField(min_value=1)
    cantidad_recibida = serializers.IntegerField(min_value=0, default=0)
    urgencia = serializers.ChoiceField(
        choices=["alta", "media", "baja"], default="media"
    )
    faltante = serializers.IntegerField(read_only=True)
    cobertura = serializers.FloatField(read_only=True)


class PrioritySerializer(serializers.Serializer):
    insumo_id = serializers.IntegerField()
    nivel = serializers.ChoiceField(choices=["alta", "media", "baja"])
    motivo = serializers.CharField()
    accion = serializers.CharField()


class AnalysisResultSerializer(serializers.Serializer):
    resumen = serializers.CharField()
    prioridades = PrioritySerializer(many=True)
    recomendaciones = serializers.ListField(child=serializers.CharField())
    datos_faltantes = serializers.ListField(child=serializers.CharField())


class AnalysisSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    campana = serializers.IntegerField(read_only=True)
    estado = serializers.ChoiceField(
        choices=["pendiente", "procesando", "completado", "fallido"], read_only=True
    )
    revision = serializers.IntegerField(read_only=True)
    proveedor = serializers.CharField(read_only=True)
    resultado = AnalysisResultSerializer(read_only=True, allow_null=True)
    error = serializers.CharField(read_only=True)
    intentos = serializers.IntegerField(read_only=True)
    creado_en = serializers.DateTimeField(read_only=True)
    terminado_en = serializers.DateTimeField(read_only=True, allow_null=True)
    desactualizado = serializers.BooleanField(read_only=True)


class DashboardSerializer(serializers.Serializer):
    campanas_activas = serializers.IntegerField()
    voluntarios_activos = serializers.IntegerField()
    necesidades_pendientes = serializers.IntegerField()
    puntos_activos = serializers.IntegerField()
    proveedor_ia = serializers.CharField()


class ErrorSerializer(serializers.Serializer):
    message = serializers.CharField()
    fields = serializers.DictField()


def paginated(serializer):
    from drf_spectacular.utils import inline_serializer

    return inline_serializer(
        name=f"{serializer.__name__}Page",
        fields={
            "count": serializers.IntegerField(),
            "page": serializers.IntegerField(),
            "page_size": serializers.IntegerField(),
            "results": serializer(many=True),
        },
    )
