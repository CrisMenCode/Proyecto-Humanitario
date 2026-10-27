from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from ayuda.adapters.outbound.persistence.models import (
    Campaign,
    CollectionPoint,
    Supply,
    Volunteer,
)


class Command(BaseCommand):
    help = "Crea tres campañas y registros ficticios para practicar. No duplica campañas existentes."

    @transaction.atomic
    def handle(self, *args, **options):
        today = timezone.localdate()
        examples = [
            (
                "Unidos por el Cauca",
                "Popayán",
                "Apoyo con agua, alimentos y abrigo para familias afectadas por la temporada de lluvias.",
                120,
            ),
            (
                "Una mesa para todos",
                "Timbío",
                "Reunimos alimentos no perecederos para acompañar a las familias de nuestra comunidad.",
                80,
            ),
            (
                "Abrigos que acompañan",
                "Silvia",
                "Una red de apoyo para llevar abrigo y elementos de higiene a las veredas del municipio.",
                60,
            ),
        ]
        for index, (name, city, description, families) in enumerate(examples):
            campaign, created = Campaign.objects.get_or_create(
                nombre=name,
                defaults={
                    "descripcion": description,
                    "municipio": city,
                    "fecha_inicio": today,
                    "fecha_fin": today + timedelta(days=20 + index * 5),
                    "estado": "activa",
                    "familias_objetivo": families,
                },
            )
            if not created:
                self.stdout.write(f"Se conserva: {name}")
                continue
            point = CollectionPoint.objects.create(
                campana=campaign,
                nombre=f"Centro solidario {city}",
                direccion=f"Punto de demostración · Zona central de {city}",
                horario="Lunes a sábado · 8:00 a. m. a 5:00 p. m.",
            )
            for person, role in [
                ("Voluntario de ejemplo A", "Logística"),
                ("Voluntario de ejemplo B", "Recepción"),
            ]:
                Volunteer.objects.create(
                    campana=campaign,
                    nombre=person,
                    habilidades="Organización y trabajo en equipo",
                    disponibilidad="Mañanas",
                    rol=role,
                )
            needs = (
                [
                    ("Agua potable", "agua", "litros", 600, 180, "alta"),
                    ("Kits de alimentos", "alimentos", "kits", 120, 75, "alta"),
                    ("Cobijas", "abrigo", "unidades", 100, 100, "media"),
                ]
                if index == 0
                else [
                    ("Kits de alimentos", "alimentos", "kits", 80, 40, "media"),
                    (
                        "Elementos de higiene",
                        "higiene",
                        "kits",
                        80,
                        80 if index == 1 else 20,
                        "alta",
                    ),
                ]
            )
            for supply_name, category, unit, required, received, urgency in needs:
                Supply.objects.create(
                    campana=campaign,
                    punto_acopio=point,
                    nombre=supply_name,
                    categoria=category,
                    unidad=unit,
                    cantidad_requerida=required,
                    cantidad_recibida=received,
                    urgencia=urgency,
                )
            self.stdout.write(
                self.style.SUCCESS(f"Creada campaña de demostración: {name}")
            )
