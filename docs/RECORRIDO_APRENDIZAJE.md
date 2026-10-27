# Un recorrido de extremo a extremo

## 1. Reconocer el contrato

Abre Swagger, crea una campaña y consulta su detalle. Identifica el método, la URL, el cuerpo, el código HTTP y los nombres de los campos. No uses IDs inventados para las relaciones.

## 2. Seguir una consulta desde React

Abre `frontend/src/views/ResourcePage.tsx`. El hook `useResources` solicita datos. En `frontend/src/hooks/useResources.ts`, la query key incluye recurso y filtros; así dos páginas o campañas tienen entradas de caché distintas. La query entrega el `AbortSignal` al servicio HTTP.

En `frontend/src/services/api.ts`, busca `api.list` y `request`. Después mira Network en las herramientas del navegador: comprueba URL, parámetros y JSON. La vista dibuja `results` y usa `count` para paginar.

Ejercicio: busca una campaña por nombre y explica por qué una respuesta 200 vacía no es un error.

## 3. Seguir una escritura

Abre el formulario de campañas. El estado local guarda lo que estás escribiendo; TanStack Query administra lo que viene del servidor. Al guardar, `useMutation` ejecuta el POST o PATCH. La API valida, guarda y responde. La mutation invalida las consultas afectadas para que las tablas y el tablero vuelvan a leer los datos.

Ejercicio: cambia el nombre y observa el PATCH en Network. Después recarga el navegador y confirma que el cambio persiste.

## 4. Entender los errores

Prueba fechas invertidas, cantidades negativas y una eliminación con dependientes. Explica la diferencia entre 400, 404 y 409. En Swagger prueba un punto de otra campaña para un insumo; el backend debe rechazarlo aunque el formulario filtre sus opciones.

Ejercicio: apaga Django e intenta consultar una pantalla. Vuelve a iniciarlo y usa Reintentar.

## 5. Explicar la arquitectura

Recorre `views.py → ResourceService → puerto de repositorio → DjangoResourceRepository`. Las reglas de fecha y cantidades viven fuera de Django. El punto de composición proporciona adaptadores concretos.

Ejercicio: explica por qué cambiar OpenAI por otro proveedor no exige modificar el caso de uso de crear una campaña.

## 6. Seguir un evento

En el detalle de campaña pulsa Analizar campaña y observa POST 202. La fila Analysis y su evento OutboxEvent se guardan en la misma transacción. El dispatcher publica en Redis; el worker ejecuta ProcessAnalysis y guarda el resultado. React consulta el análisis por UUID hasta completado o fallido.

Ejercicio: con los procesos detenidos, inicia solo Django y Vite. Solicita un análisis: debe quedar pendiente y los CRUD seguir funcionando. Inicia Redis, dispatcher y worker; la solicitud debe completarse sin volver a crearla.

## 7. Detectar un resultado antiguo

Genera un análisis, modifica la cantidad recibida y vuelve al detalle. El resultado conserva su snapshot original, pero aparece como desactualizado. Solicita otro análisis y compara la prioridad.

Ejercicio: explica por qué una respuesta antigua de IA no debe presentarse como si describiera los datos actuales.

## Reparto sugerido

1. Cristian: recorrer campañas de principio a fin. Jimmy: repetir con puntos de acopio.
2. Jimmy: recorrer voluntarios. Cristian: insumos y validación de relaciones.
3. Ambos: explicar el análisis, apagar un componente y observar el resultado.
4. Intercambiar recursos y revisar los commits del compañero. No basta con memorizar una sola capa.
