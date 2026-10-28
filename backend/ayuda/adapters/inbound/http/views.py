from django.conf import settings
from django.db.models import F
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from ayuda.adapters.outbound.persistence.models import (
    Campaign,
    CollectionPoint,
    Supply,
    Volunteer,
)
from ayuda.adapters.outbound.persistence.repositories import DjangoAnalysisRepository
from ayuda.application.use_cases import RequestAnalysis
from ayuda.composition import resource_service

from .serializers import (
    AnalysisSerializer,
    CampaignSerializer,
    CollectionPointSerializer,
    DashboardSerializer,
    ErrorSerializer,
    ListQuerySerializer,
    SupplySerializer,
    VolunteerSerializer,
    paginated,
)


class CrudViewSet(viewsets.GenericViewSet):
    kind = ""
    lookup_value_converter = "int"

    @property
    def service(self):
        return resource_service(self.kind)

    @extend_schema(parameters=[ListQuerySerializer])
    def list(self, request):
        query = ListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        filters = query.validated_data
        filters["campaign"] = filters.pop("campana", None)
        page = self.service.list(**filters)
        return Response(
            {
                "count": page.total,
                "page": page.page,
                "page_size": page.page_size,
                "results": self.get_serializer(page.items, many=True).data,
            }
        )

    def retrieve(self, request, pk=None):
        return Response(self.get_serializer(self.service.get(pk)).data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = self.service.save(serializer.validated_data)
        return Response(
            self.get_serializer(record).data, status=status.HTTP_201_CREATED
        )

    def update(self, request, pk=None, partial=False):
        self.service.get(pk)
        serializer = self.get_serializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.get_serializer(self.service.save(serializer.validated_data, pk)).data
        )

    def partial_update(self, request, pk=None):
        return self.update(request, pk, partial=True)

    def destroy(self, request, pk=None):
        self.service.delete(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Campañas"])
@extend_schema_view(
    list=extend_schema(
        summary="Listar campañas",
        description="Devuelve las campañas con paginación, búsqueda y filtros.",
        responses=paginated(CampaignSerializer),
    ),
    retrieve=extend_schema(summary="Consultar campaña"),
    create=extend_schema(summary="Crear campaña"),
    update=extend_schema(summary="Actualizar campaña completa"),
    partial_update=extend_schema(summary="Actualizar parcialmente una campaña"),
    destroy=extend_schema(summary="Eliminar campaña"),
)
class CampaignViewSet(CrudViewSet):
    kind = "campanas"
    serializer_class = CampaignSerializer

    @extend_schema(
        summary="Solicitar análisis de campaña",
        description=(
            "Crea una solicitud de análisis y devuelve el resultado "
            "pendiente o completado."
        ),
        request=None,
        responses={
            200: AnalysisSerializer,
            202: AnalysisSerializer,
            404: ErrorSerializer,
        },
    )
    @action(detail=True, methods=["post"], url_path="analisis")
    def request_analysis(self, request, pk=None):
        data, created = RequestAnalysis(
            DjangoAnalysisRepository()
        ).execute(pk)
        code = (
            202
            if created or data["estado"] in {"pendiente", "procesando"}
            else 200
        )
        return Response(AnalysisSerializer(data).data, status=code)

    @extend_schema(
        summary="Consultar último análisis",
        description="Devuelve el último análisis de una campaña o null.",
        responses=AnalysisSerializer(allow_null=True),
    )
    @action(detail=True, methods=["get"], url_path="ultimo-analisis")
    def latest_analysis(self, request, pk=None):
        self.service.get(pk)
        data = DjangoAnalysisRepository().latest(pk)

        return (
            Response(AnalysisSerializer(data).data)
            if data
            else HttpResponse("null", content_type="application/json")
        )


@extend_schema(tags=["Voluntarios"])
@extend_schema_view(
    list=extend_schema(
        summary="Listar voluntarios",
        description=(
            "Devuelve los voluntarios con paginación, búsqueda y filtro por campaña."
        ),
        responses=paginated(VolunteerSerializer),
    ),
    retrieve=extend_schema(
        summary="Consultar voluntario",
        description="Devuelve la información de un voluntario por su identificador.",
    ),
    create=extend_schema(
        summary="Crear voluntario",
        description="Registra un nuevo voluntario asociado a una campaña.",
    ),
    update=extend_schema(
        summary="Actualizar voluntario",
        description="Reemplaza todos los datos de un voluntario existente.",
    ),
    partial_update=extend_schema(
        summary="Editar voluntario",
        description="Modifica uno o varios datos de un voluntario existente.",
    ),
    destroy=extend_schema(
        summary="Eliminar voluntario",
        description="Elimina un voluntario por su identificador.",
    ),
)
class VolunteerViewSet(CrudViewSet):
    kind = "voluntarios"
    serializer_class = VolunteerSerializer


@extend_schema(tags=["Puntos de acopio"])
@extend_schema_view(
    list=extend_schema(
        summary="Listar puntos de acopio",
        description=(
            "Devuelve los puntos de acopio con paginación, búsqueda y filtro "
            "por campaña."
        ),
        responses=paginated(CollectionPointSerializer),
    ),
    retrieve=extend_schema(
        summary="Consultar punto de acopio",
        description="Devuelve la información de un punto de acopio por su identificador.",
    ),
    create=extend_schema(
        summary="Crear punto de acopio",
        description="Registra un nuevo punto de acopio asociado a una campaña.",
    ),
    update=extend_schema(
        summary="Actualizar punto de acopio",
        description=(
            "Reemplaza todos los datos de un punto de acopio. La campaña no puede "
            "cambiarse mientras el punto tenga insumos asociados."
        ),
    ),
    partial_update=extend_schema(
        summary="Editar punto de acopio",
        description=(
            "Modifica uno o varios datos de un punto de acopio. La campaña no puede "
            "cambiarse mientras el punto tenga insumos asociados."
        ),
    ),
    destroy=extend_schema(
        summary="Eliminar punto de acopio",
        description="Elimina un punto de acopio si no tiene insumos asociados.",
    ),
)
class CollectionPointViewSet(CrudViewSet):
    kind = "puntos-acopio"
    serializer_class = CollectionPointSerializer


@extend_schema(tags=["Insumos"])
@extend_schema_view(
    list=extend_schema(
        summary="Listar insumos",
        description=(
            "Devuelve los insumos con paginación, búsqueda y filtro por campaña."
        ),
        responses=paginated(SupplySerializer),
    ),
    retrieve=extend_schema(
        summary="Consultar insumo",
        description="Devuelve la información de un insumo por su identificador.",
    ),
    create=extend_schema(
        summary="Crear insumo",
        description=(
            "Registra un nuevo insumo requerido por una campaña y lo asocia a un "
            "punto de acopio de la misma campaña."
        ),
    ),
    update=extend_schema(
        summary="Actualizar insumo",
        description="Reemplaza todos los datos de un insumo existente.",
    ),
    partial_update=extend_schema(
        summary="Editar insumo",
        description="Modifica uno o varios datos de un insumo existente.",
    ),
    destroy=extend_schema(
        summary="Eliminar insumo",
        description="Elimina un insumo por su identificador.",
    ),
)
class SupplyViewSet(CrudViewSet):
    kind = "insumos"
    serializer_class = SupplySerializer


@extend_schema(tags=["Análisis"])
class AnalysisViewSet(viewsets.GenericViewSet):
    serializer_class = AnalysisSerializer
    lookup_value_converter = "uuid"

    @extend_schema(summary="Consultar análisis")
    def retrieve(self, request, pk=None):
        return Response(
            AnalysisSerializer(
                DjangoAnalysisRepository().get(pk)
            ).data
        )


class DashboardView(APIView):
    @extend_schema(
        tags=["Dashboard"],
        summary="Consultar indicadores generales",
        description="Devuelve los indicadores actuales de las campañas.",
        responses=DashboardSerializer,
    )
    def get(self, request):
        return Response(
            {
                "campanas_activas": Campaign.objects.filter(
                    estado="activa"
                ).count(),
                "voluntarios_activos": Volunteer.objects.filter(
                    activo=True,
                    campana__estado="activa",
                ).count(),
                "necesidades_pendientes": Supply.objects.filter(
                    campana__estado="activa",
                    cantidad_recibida__lt=F("cantidad_requerida"),
                ).count(),
                "puntos_activos": CollectionPoint.objects.filter(
                    activo=True,
                    campana__estado="activa",
                ).count(),
                "proveedor_ia": settings.AI_PROVIDER,
            }
        )
