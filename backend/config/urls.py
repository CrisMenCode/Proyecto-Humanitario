from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from ayuda.adapters.inbound.http.views import (
    AnalysisViewSet,
    CampaignViewSet,
    CollectionPointViewSet,
    DashboardView,
    SupplyViewSet,
    VolunteerViewSet,
)

router = DefaultRouter(use_regex_path=False)
for prefix, viewset in [
    ("campanas", CampaignViewSet),
    ("voluntarios", VolunteerViewSet),
    ("insumos", SupplyViewSet),
    ("puntos-acopio", CollectionPointViewSet),
    ("analisis", AnalysisViewSet),
]:
    router.register(prefix, viewset, basename=prefix)

urlpatterns = [
    path("api/v1/dashboard/", DashboardView.as_view()),
    path("api/v1/", include(router.urls)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"
    ),
]
