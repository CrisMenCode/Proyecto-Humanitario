from django.conf import settings
from django.http import HttpResponse
from django.db.models import F
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from ayuda.application.use_cases import RequestAnalysis
from ayuda.composition import resource_service
from ayuda.adapters.outbound.persistence.models import (
    Campaign,
    CollectionPoint,
    Supply,
    Volunteer,
)
from ayuda.adapters.outbound.persistence.repositories import DjangoAnalysisRepository
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


@extend_schema_view(list=extend_schema(responses=paginated(CampaignSerializer)))
class CampaignViewSet(CrudViewSet):
    kind = "campanas"
    serializer_class = CampaignSerializer

    @extend_schema(
        request=None,
        responses={
            200: AnalysisSerializer,
            202: AnalysisSerializer,
            404: ErrorSerializer,
        },
        description="Persiste análisis y evento outbox sin llamar al proveedor ni al broker. Devuelve 200 si reutiliza un análisis completado de la misma revisión.",
    )
    @action(detail=True, methods=["post"], url_path="analisis")
    def request_analysis(self, request, pk=None):
        data, created = RequestAnalysis(DjangoAnalysisRepository()).execute(pk)
        code = 202 if created or data["estado"] in {"pendiente", "procesando"} else 200
        return Response(AnalysisSerializer(data).data, status=code)

    @extend_schema(
        responses=AnalysisSerializer(allow_null=True),
        description="Último análisis o null si la campaña no tiene solicitudes.",
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


@extend_schema_view(list=extend_schema(responses=paginated(VolunteerSerializer)))
class VolunteerViewSet(CrudViewSet):
    kind = "voluntarios"
    serializer_class = VolunteerSerializer


@extend_schema_view(list=extend_schema(responses=paginated(CollectionPointSerializer)))
class CollectionPointViewSet(CrudViewSet):
    kind = "puntos-acopio"
    serializer_class = CollectionPointSerializer


@extend_schema_view(list=extend_schema(responses=paginated(SupplySerializer)))
class SupplyViewSet(CrudViewSet):
    kind = "insumos"
    serializer_class = SupplySerializer


class AnalysisViewSet(viewsets.GenericViewSet):
    serializer_class = AnalysisSerializer
    lookup_value_converter = "uuid"

    def retrieve(self, request, pk=None):
        return Response(AnalysisSerializer(DjangoAnalysisRepository().get(pk)).data)


class DashboardView(APIView):
    @extend_schema(responses=DashboardSerializer)
    def get(self, request):
        return Response(
            {
                "campanas_activas": Campaign.objects.filter(estado="activa").count(),
                "voluntarios_activos": Volunteer.objects.filter(
                    activo=True, campana__estado="activa"
                ).count(),
                "necesidades_pendientes": Supply.objects.filter(
                    campana__estado="activa",
                    cantidad_recibida__lt=F("cantidad_requerida"),
                ).count(),
                "puntos_activos": CollectionPoint.objects.filter(
                    activo=True, campana__estado="activa"
                ).count(),
                "proveedor_ia": settings.AI_PROVIDER,
            }
        )
