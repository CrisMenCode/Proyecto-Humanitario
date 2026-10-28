from datetime import date, timedelta
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APITestCase

from ayuda.adapters.outbound.ai.analyzers import DemoAnalyzer
from ayuda.adapters.outbound.persistence.models import (
    Analysis,
    Campaign,
    CollectionPoint,
    OutboxEvent,
    Supply,
)
from ayuda.adapters.outbound.persistence.repositories import DjangoAnalysisRepository
from ayuda.application.use_cases import ProcessAnalysis
from ayuda.domain.rules import DomainError


class ApiTests(APITestCase):
    def setUp(self):
        self.campaign_data = {
            "nombre": "Campaña prueba",
            "descripcion": "Ayuda comunitaria",
            "municipio": "Popayán",
            "fecha_inicio": date.today().isoformat(),
            "fecha_fin": (date.today() + timedelta(days=10)).isoformat(),
            "familias_objetivo": 30,
            "estado": "activa",
        }
        self.campaign = Campaign.objects.create(**self.campaign_data)
        self.point = CollectionPoint.objects.create(
            campana=self.campaign,
            nombre="Centro",
            direccion="Calle de ejemplo",
            horario="8 a 17",
        )
        self.supply_data = {
            "campana": self.campaign.pk,
            "punto_acopio": self.point.pk,
            "nombre": "Agua",
            "categoria": "agua",
            "unidad": "litros",
            "cantidad_requerida": 100,
            "cantidad_recibida": 20,
            "urgencia": "alta",
        }

    def test_all_four_resources_support_complete_crud(self):
        cases = {
            "campanas": {**self.campaign_data, "nombre": "Campaña independiente"},
            "voluntarios": {
                "campana": self.campaign.pk,
                "nombre": "Persona de prueba",
                "habilidades": "Logística",
                "disponibilidad": "Mañana",
                "rol": "Recepción",
            },
            "puntos-acopio": {
                "campana": self.campaign.pk,
                "nombre": "Punto independiente",
                "direccion": "Dirección",
                "horario": "9 a 12",
            },
            "insumos": self.supply_data,
        }
        for kind, body in cases.items():
            with self.subTest(kind=kind):
                base = f"/api/v1/{kind}/"
                created = self.client.post(base, body, format="json")
                self.assertEqual(created.status_code, 201, created.data)
                url = f"{base}{created.data['id']}/"
                self.assertEqual(self.client.get(url).status_code, 200)
                self.assertEqual(self.client.get(base).status_code, 200)
                self.assertEqual(
                    self.client.patch(
                        url, {"nombre": "Actualizado"}, format="json"
                    ).status_code,
                    200,
                )
                self.assertEqual(
                    self.client.put(
                        url, {**body, "nombre": "Reemplazado"}, format="json"
                    ).status_code,
                    200,
                )
                self.assertEqual(self.client.delete(url).status_code, 204)
                self.assertEqual(self.client.get(url).status_code, 404)

    def test_date_validation_applies_to_partial_updates(self):
        response = self.client.patch(
            f"/api/v1/campanas/{self.campaign.pk}/",
            {"fecha_fin": "2000-01-01"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("fecha_fin", response.data["fields"])

    def test_supply_must_use_point_from_its_campaign(self):
        other = Campaign.objects.create(**{**self.campaign_data, "nombre": "Otra"})
        result = self.client.post(
            "/api/v1/insumos/", {**self.supply_data, "campana": other.pk}, format="json"
        )
        self.assertEqual(result.status_code, 400)
        self.assertFalse(Supply.objects.exists())

    def test_invalid_foreign_keys_are_client_errors(self):
        result = self.client.post(
            "/api/v1/insumos/", {**self.supply_data, "campana": 999999}, format="json"
        )
        self.assertEqual(result.status_code, 400)

    def test_supply_quantities_and_duplicate_validation(self):
        for field, value in [("cantidad_requerida", 0), ("cantidad_recibida", -1)]:
            self.assertEqual(
                self.client.post(
                    "/api/v1/insumos/",
                    {**self.supply_data, field: value},
                    format="json",
                ).status_code,
                400,
            )
        self.assertEqual(
            self.client.post(
                "/api/v1/insumos/", self.supply_data, format="json"
            ).status_code,
            201,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/insumos/", self.supply_data, format="json"
            ).status_code,
            409,
        )

    def test_protected_delete_and_point_reassignment(self):
        self.client.post("/api/v1/insumos/", self.supply_data, format="json")
        self.assertEqual(
            self.client.delete(f"/api/v1/campanas/{self.campaign.pk}/").status_code, 409
        )
        self.assertEqual(
            self.client.delete(f"/api/v1/puntos-acopio/{self.point.pk}/").status_code,
            409,
        )
        other = Campaign.objects.create(**{**self.campaign_data, "nombre": "Otra"})
        self.assertEqual(
            self.client.patch(
                f"/api/v1/puntos-acopio/{self.point.pk}/",
                {"campana": other.pk},
                format="json",
            ).status_code,
            409,
        )

    def test_filter_search_and_pagination(self):
        for index in range(15):
            Campaign.objects.create(
                **{**self.campaign_data, "nombre": f"Ejemplo {index}"}
            )
        result = self.client.get("/api/v1/campanas/?page=2&page_size=5&search=Ejemplo")
        self.assertEqual(result.data["count"], 15)
        self.assertEqual(len(result.data["results"]), 5)
        self.assertEqual(self.client.get("/api/v1/campanas/?page=0").status_code, 400)
        self.assertEqual(
            self.client.get("/api/v1/insumos/?campana=abc").status_code, 400
        )

    def test_campaign_without_analysis_returns_valid_json_null(self):
        response = self.client.get(
            f"/api/v1/campanas/{self.campaign.pk}/ultimo-analisis/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"null")

    @override_settings(AI_PROVIDER="demo")
    def test_analysis_is_persisted_before_queue_and_is_deduplicated(self):
        with patch(
            "ayuda.adapters.inbound.tasks.analysis.process_analysis.apply_async"
        ) as publish:
            first = self.client.post(f"/api/v1/campanas/{self.campaign.pk}/analisis/")
            second = self.client.post(f"/api/v1/campanas/{self.campaign.pk}/analisis/")
        self.assertEqual(first.status_code, 202)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(Analysis.objects.count(), 1)
        self.assertEqual(OutboxEvent.objects.count(), 1)
        publish.assert_not_called()

    @override_settings(AI_PROVIDER="demo")
    def test_analysis_snapshot_completion_staleness_and_no_double_processing(self):
        supply = self.client.post(
            "/api/v1/insumos/", self.supply_data, format="json"
        ).data
        request = self.client.post(
            f"/api/v1/campanas/{self.campaign.pk}/analisis/"
        ).data
        processor = ProcessAnalysis(DjangoAnalysisRepository(), DemoAnalyzer())
        processor.execute(request["id"])
        with patch.object(DemoAnalyzer, "analyze") as analyze:
            processor.execute(request["id"])
            analyze.assert_not_called()
        result = self.client.get(f"/api/v1/analisis/{request['id']}/").data
        self.assertEqual(result["estado"], "completado")
        self.assertEqual(
            result["resultado"]["prioridades"][0]["insumo_id"], supply["id"]
        )
        self.assertFalse(result["desactualizado"])
        self.client.patch(
            f"/api/v1/insumos/{supply['id']}/", {"cantidad_recibida": 80}, format="json"
        )
        self.assertTrue(
            self.client.get(f"/api/v1/analisis/{request['id']}/").data["desactualizado"]
        )
        # Snapshot inmutable: conserva la cantidad de la solicitud original.
        self.assertEqual(
            Analysis.objects.get(pk=request["id"]).snapshot["insumos"][0][
                "cantidad_recibida"
            ],
            20,
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/campanas/{self.campaign.pk}/analisis/"
            ).status_code,
            202,
        )
        self.assertEqual(Analysis.objects.count(), 2)

    def test_outbox_survives_broker_failure(self):
        self.client.post(f"/api/v1/campanas/{self.campaign.pk}/analisis/")
        with patch(
            "ayuda.adapters.outbound.messaging.publisher.CeleryEventPublisher.publish",
            side_effect=ConnectionError,
        ):
            call_command("dispatch_events", stdout=StringIO(), stderr=StringIO())
        self.assertIsNone(OutboxEvent.objects.get().published_at)
        with patch(
            "ayuda.adapters.outbound.messaging.publisher.CeleryEventPublisher.publish"
        ) as publish:
            call_command("dispatch_events", stdout=StringIO())
            publish.assert_called_once()
        self.assertIsNotNone(OutboxEvent.objects.get().published_at)

    def test_ai_cannot_return_ids_outside_snapshot(self):
        request = self.client.post(
            f"/api/v1/campanas/{self.campaign.pk}/analisis/"
        ).data

        class InvalidAnalyzer:
            def analyze(self, snapshot):
                return {"prioridades": [{"insumo_id": 99999}]}

        with self.assertRaises(DomainError):
            ProcessAnalysis(DjangoAnalysisRepository(), InvalidAnalyzer()).execute(
                request["id"]
            )

    @override_settings(AI_PROVIDER="openai", OPENAI_API_KEY="", OPENAI_MODEL="")
    def test_missing_key_becomes_readable_failure_without_calling_openai(self):
        from ayuda.adapters.inbound.tasks.analysis import process_analysis

        result = self.client.post(f"/api/v1/campanas/{self.campaign.pk}/analisis/").data
        with patch("openai.OpenAI") as client:
            process_analysis.run(result["id"])
            client.assert_not_called()
        analysis = Analysis.objects.get(pk=result["id"])
        self.assertEqual(analysis.estado, "fallido")
        self.assertIn("OPENAI_API_KEY", analysis.error)

    def test_cors_and_dashboard(self):
        response = self.client.get(
            "/api/v1/dashboard/", HTTP_ORIGIN="http://localhost:5173"
        )
        self.assertEqual(
            response["Access-Control-Allow-Origin"], "http://localhost:5173"
        )
        self.assertEqual(response.data["campanas_activas"], 1)
        blocked = self.client.get(
            "/api/v1/dashboard/", HTTP_ORIGIN="https://example.invalid"
        )
        self.assertNotIn("Access-Control-Allow-Origin", blocked)

    def test_schema_contains_every_crud_and_analysis(self):
        result = self.client.get("/api/schema/?format=json")
        self.assertEqual(result.status_code, 200)
        paths = result.data["paths"]
        for resource in ["campanas", "voluntarios", "insumos", "puntos-acopio"]:
            self.assertIn("post", paths[f"/api/v1/{resource}/"])
            self.assertIn("patch", paths[f"/api/v1/{resource}/{{id}}/"])
        self.assertIn("post", paths["/api/v1/campanas/{id}/analisis/"])

    def test_schema_describes_supplies_and_collection_points(self):
        result = self.client.get("/api/schema/?format=json")
        self.assertEqual(result.status_code, 200)
        paths = result.data["paths"]

        expected_summaries = {
            "get_collection": "Listar {resource}",
            "post_collection": "Crear {singular}",
            "get_detail": "Consultar {singular}",
            "put_detail": "Actualizar {singular}",
            "patch_detail": "Editar {singular}",
            "delete_detail": "Eliminar {singular}",
        }
        for resource, (plural, singular) in {
            "insumos": ("insumos", "insumo"),
            "voluntarios": ("voluntarios", "voluntario"),
            "puntos-acopio": ("puntos de acopio", "punto de acopio"),
        }.items():
            collection = paths[f"/api/v1/{resource}/"]
            detail = paths[f"/api/v1/{resource}/{{id}}/"]
            operations = {
                "get_collection": collection["get"],
                "post_collection": collection["post"],
                "get_detail": detail["get"],
                "put_detail": detail["put"],
                "patch_detail": detail["patch"],
                "delete_detail": detail["delete"],
            }
            for operation, schema in operations.items():
                self.assertEqual(
                    schema["summary"],
                    expected_summaries[operation].format(
                        resource=plural, singular=singular
                    ),
                )
                self.assertTrue(schema["description"])
