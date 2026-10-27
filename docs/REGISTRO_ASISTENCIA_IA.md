# Registro compartido de asistencia

Fecha: 23 de octubre de 2026, zona America/Bogota.

Herramienta: Codex. No se fija aquí un identificador de modelo no verificado.

## Solicitud de asesoría

Cristian pidió una aplicación de ayuda humanitaria y voluntariado con cuatro CRUD, Django con arquitectura hexagonal, OpenAI, Celery/Redis y React desacoplado mediante TanStack Query. Se revisaron el PDF de requisitos y los proyectos Front-ShopStarter y Avisens. Se propuso Nexo Solidario y un recorrido de aprendizaje por funcionalidades completas.

El prompt completo de asesoría permanece en la conversación; esta entrada es un resumen y no lo sustituye en la bitácora individual.

## Solicitud de construcción

Prompt exacto del usuario:

> si esta bien empezemos a construir el proyecto

Respuesta y trabajo realizado: creación de una base Django/DRF y una SPA React con cuatro CRUD, separación hexagonal, outbox transaccional, worker Celery, Redis, analizador demo, adaptador OpenAI, Swagger, interfaz responsiva, pruebas y documentación.

Se generó código **tanto del frontend como del backend** con asistencia de IA. Se debe conservar esa atribución. La aceptación, modificación o descarte por cada aprendiz todavía debe registrarla cada persona.

## Habilidades y herramientas utilizadas

- PDF: lectura del documento académico durante la asesoría.
- OpenAI Docs: consulta de documentación oficial de Structured Outputs / Responses API.
- Sites: pautas de interfaz y revisión local. No se publicó un Site ni se desplegó el backend.
- Herramientas de terminal: generación de archivos, instalación local, migraciones y pruebas.
- Navegador de Codex: revisión de la interfaz y del flujo React → API → Redis/Celery → resultado.

No se usaron subagentes. No se hizo una llamada real a OpenAI ni se usaron credenciales del usuario.

## Fuentes técnicas

- https://developers.openai.com/api/docs/guides/structured-outputs
- https://docs.celeryq.dev/en/stable/django/first-steps-with-django.html
- https://docs.celeryq.dev/en/stable/userguide/tasks.html
- https://www.django-rest-framework.org/api-guide/viewsets/
- https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

La condición de autoría manual del backend está en el PDF. Este registro describe la asistencia real, sin afirmar que esta base cumple esa condición de autoría.
