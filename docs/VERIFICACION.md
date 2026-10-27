# Verificación de la primera versión

23 de octubre de 2026.

## Comprobaciones automáticas

- 16 pruebas Django aprobadas. Incluyen los cuatro CRUD completos (GET, POST, PUT, PATCH y DELETE), validación de fechas/cantidades, relaciones, búsquedas, paginación, CORS y errores.
- Pruebas del análisis: persistencia sin contacto con Redis desde HTTP, deduplicación por revisión, snapshot, resultados desactualizados, IDs inválidos y falta de credenciales.
- Prueba de recuperación de eventos después de un fallo del broker.
- Prueba de límites arquitectónicos: dominio y aplicación sin dependencias de frameworks ni adaptadores.
- OpenAPI generado y validado sin advertencias.
- Sin migraciones pendientes.
- Compilación TypeScript y build Vite aprobados.
- Scripts Bash comprobados con `bash -n`.

## Comprobaciones de integración y navegador

- Redis real 8.0.5, dispatcher outbox y worker Celery ejecutados por separado.
- Solicitud desde React, respuesta 202, entrega por Redis, procesamiento del worker y resultado visible mediante polling.
- Edición de agua potable de 180 a 240 litros desde el formulario; persistencia y actualización de cobertura/faltante.
- Aviso de análisis desactualizado después de cambiar las cantidades.
- Creación de la campaña ficticia «Práctica de conexión API» desde React y aparición inmediata en la lista y los indicadores.
- Revisión de diseño en escritorio y pantalla pequeña; sin desbordamiento horizontal del detalle de campaña.
- Sin mensajes de error o advertencia de consola en la revisión del detalle.

La captura verificada está en `docs/capturas/nexo-solidario.png`.

## Límites de esta verificación

No se hizo una llamada real a OpenAI ni se verificaron cuota, permisos o disponibilidad de un modelo en la cuenta de los aprendices. El adaptador real está implementado; el recorrido completo se comprobó con el analizador demo, claramente identificado como simulación.

La aplicación es local y permite acceso anónimo. No se ha desplegado, ni se han probado escenarios de carga o múltiples dispatchers.
