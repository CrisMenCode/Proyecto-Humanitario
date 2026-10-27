# Nexo Solidario

Centro de coordinación de campañas humanitarias de **Cristian Meneses y Jimmy Garcas**. Primera versión local para practicar el consumo de una API Django desde una SPA React.

## Qué funciona

- Crear, consultar, editar y eliminar campañas, voluntarios, insumos y puntos de acopio.
- Relacionar recursos y filtrar por campaña, buscar por nombre y paginar.
- Visualizar indicadores reales y metas de insumos cubiertas. Cada meta tiene su unidad; no se suman litros y kits como si fueran una sola cantidad.
- Solicitar un análisis con HTTP 202, seguir trabajando y consultar su resultado mediante TanStack Query.
- Guardar un snapshot de los datos y marcar el análisis como desactualizado cuando cambia la campaña o cualquiera de sus recursos.
- Conservar eventos en una outbox si Redis está caído. Un dispatcher los publica cuando se recupera la conexión.
- Usar un analizador de demostración o un adaptador OpenAI independiente del CRUD.
- Probar los endpoints desde Swagger.

## Requisitos

Python 3.12 o posterior, Node.js 22 y Redis. Las pruebas de esta versión se ejecutaron con Python 3.14 y Node.js 22. El entorno probado está fijado en `backend/requirements.lock.txt` y `frontend/package-lock.json`.

Redis se puede ejecutar con Docker Compose o instalar por separado. No es necesario instalar un servidor de base de datos: el MVP utiliza SQLite. La API permite acceso anónimo y escucha únicamente en loopback; es una versión de aprendizaje local, no un despliegue de producción.

## Preparar y ejecutar en Linux

Desde la raíz del repositorio:

```bash
bash scripts/setup.sh
```

El script crea el entorno virtual, instala dependencias, copia `.env.example` a `.env` si no existe y ejecuta las migraciones. Para cargar ejemplos ficticios:

```bash
.venv/bin/python backend/manage.py seed_demo
```

Inicia Redis mediante una de estas opciones:

```bash
# Opción A: Docker, si tienes acceso al daemon.
docker compose up -d redis

# Opción B: Redis ya instalado en el equipo, en otra terminal.
redis-server --bind 127.0.0.1 --port 6379
```

Después inicia la aplicación:

```bash
bash scripts/dev.sh
```

- Frontend: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:8000/api/v1/>
- Swagger: <http://127.0.0.1:8000/swagger/>

El script ejecuta Django, Vite, el worker Celery y un dispatcher outbox. Ctrl+C detiene esos cuatro procesos. Redis se detiene por separado con `docker compose stop redis`, si usaste Compose. Los cambios del backend requieren reiniciar el script; Vite actualiza el frontend automáticamente.

### Preparar y ejecutar en Windows

En Windows se recomienda usar **PowerShell**, Python 3.12 o posterior, Node.js 22 y Docker Desktop. Redis se ejecuta mediante Docker Desktop. Los scripts `scripts/setup.sh` y `scripts/dev.sh` son scripts de Bash; si usas Git Bash o WSL puedes ejecutar las instrucciones de Linux. En PowerShell, sigue estos pasos:

1. Clona el repositorio y entra en la carpeta del proyecto:

```powershell
git clone https://github.com/TU_USUARIO/nexo-solidario.git
Set-Location "nexo-solidario"
```

Si ya tienes el proyecto descargado, abre PowerShell en su carpeta raíz.

2. Crea el entorno virtual e instala las dependencias del backend:

```powershell
py -3.12 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r backend\requirements.lock.txt
```

3. Instala las dependencias del frontend y crea la configuración local:

```powershell
Set-Location frontend
npm ci
Set-Location ..
Copy-Item .env.example .env
```

Si `.env` ya existe, no lo reemplaces: puede contener configuración local o una clave privada.

4. Ejecuta las migraciones de la base de datos:

```powershell
& .\.venv\Scripts\python.exe backend\manage.py migrate
```

Para cargar datos ficticios opcionales:

```powershell
& .\.venv\Scripts\python.exe backend\manage.py seed_demo
```

5. Abre Docker Desktop, espera a que esté iniciado y levanta Redis desde la raíz del proyecto:

```powershell
docker compose up -d redis
```

6. Abre cuatro ventanas de PowerShell, todas ubicadas en la raíz del proyecto, y ejecuta un proceso en cada una:

**Ventana 1 — API Django**

```powershell
& .\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
```

**Ventana 2 — Dispatcher de eventos**

```powershell
& .\.venv\Scripts\python.exe backend\manage.py dispatch_events --watch
```

**Ventana 3 — Worker Celery**

```powershell
Set-Location backend
& ..\.venv\Scripts\celery.exe -A config worker -Q analisis --pool=solo --concurrency=1 --loglevel=INFO
```

**Ventana 4 — Frontend React/Vite**

```powershell
Set-Location frontend
npm run dev
```

Cuando los cuatro procesos estén activos, abre:

- Frontend: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:8000/api/v1/>
- Swagger: <http://127.0.0.1:8000/swagger/>

Para detener cada proceso, pulsa `Ctrl+C` en su ventana. Para detener Redis:

```powershell
docker compose stop redis
```

### Ejecutar cada proceso por separado

En terminales distintas, además de Redis:

```bash
# Desde la raíz
.venv/bin/python backend/manage.py runserver 127.0.0.1:8000

# Desde la raíz
.venv/bin/python -u backend/manage.py dispatch_events --watch

# Desde backend/
../.venv/bin/celery -A config worker -Q analisis --pool=solo --concurrency=1 --loglevel=INFO

# Desde frontend/
npm run dev
```

`--pool=solo` simplifica el entorno local. No utiliza los límites de tiempo de los pools multiproceso; la llamada OpenAI sí tiene timeout propio. Para un despliegue real se debe revisar concurrencia, autenticación, permisos, PostgreSQL y observabilidad.

## Activar OpenAI

La configuración inicial es `AI_PROVIDER=demo`. Ese adaptador ejecuta reglas locales y **no es IA**; sirve para desarrollar la integración completa sin credenciales ni cargos.

Para usar el proveedor real, edita el `.env` de la raíz:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=tu_clave_privada
OPENAI_MODEL=un_modelo_disponible_en_tu_cuenta_con_responses_y_structured_outputs
```

Reinicia Django y el worker después de cambiar esas variables. Solicita un análisis nuevo; los análisis existentes conservan el proveedor con el que se crearon. Si ya existe un resultado para la misma revisión, modifica algún dato de la campaña para crear una revisión nueva.

El adaptador usa Responses API y Structured Outputs con Pydantic. Verifica que cada ID de insumo corresponda al snapshot y que cada necesidad pendiente aparezca exactamente una vez. Una estructura válida no garantiza que la recomendación sea correcta: el coordinador debe revisarla.

No se realizó una llamada real a OpenAI durante la construcción: no se suministró una clave. Sí se verificaron el flujo con el analizador demo y el fallo legible cuando falta la configuración de OpenAI.

La clave nunca se envía a React. `VITE_API_URL` es pública; **no uses variables `VITE_` para secretos**. `.env` está excluido de Git. El prompt se construye en el servidor y no incluye nombres de voluntarios. El campo de descripción se envía al proveedor: no ingreses datos personales sensibles en las campañas.

## Arquitectura

```text
backend/ayuda/
  domain/                  Reglas, errores, DTO y evento
  application/             Puertos y casos de uso
  adapters/inbound/http/   Endpoints y serializers DRF
  adapters/inbound/tasks/  Consumidor Celery
  adapters/outbound/
    persistence/           Modelos y repositorios Django
    ai/                    DemoAnalyzer y OpenAIAnalyzer
    messaging/             Publicador de eventos
  composition.py           Conexión de puertos y adaptadores
```

El dominio y la aplicación no importan Django, Celery, DRF, OpenAI ni adaptadores. Una prueba comprueba esta regla. Las vistas validan la forma de la petición y delegan operaciones de escritura a casos de uso. Los endpoints de lectura del tablero y del historial consultan sus adaptadores de persistencia.

Flujo: `React → endpoint → solicitud + outbox en SQLite → dispatcher → Redis → Celery → caso de uso → adaptador IA → SQLite → polling de React`.

Se ejecuta **un dispatcher** en este MVP. La entrega es al menos una vez: podría publicarse un evento repetido si el dispatcher cae entre publicar y marcarlo. El worker evita repetir trabajos ya completados o en curso. Recupera trabajos bloqueados en procesamiento después de tres minutos, hasta tres intentos. Esto no promete exactamente una llamada facturable al proveedor ante una caída después de recibir su respuesta.

## Contrato de API

| Recurso | Lista / creación | Detalle / edición / eliminación |
| --- | --- | --- |
| Campañas | `/api/v1/campanas/` | `/api/v1/campanas/{id}/` |
| Voluntarios | `/api/v1/voluntarios/` | `/api/v1/voluntarios/{id}/` |
| Insumos | `/api/v1/insumos/` | `/api/v1/insumos/{id}/` |
| Puntos de acopio | `/api/v1/puntos-acopio/` | `/api/v1/puntos-acopio/{id}/` |

Listas: `GET`, creación: `POST`, detalle: `GET`, reemplazo: `PUT`, edición: `PATCH`, eliminación: `DELETE`. Todas las rutas llevan barra final.

Listas aceptan `page`, `page_size` (máximo 100), `search` y `campana`. Devuelven `{count, page, page_size, results}`.

| Operación | Endpoint | Respuesta |
| --- | --- | --- |
| Indicadores | `GET /api/v1/dashboard/` | 200 |
| Solicitar análisis | `POST /api/v1/campanas/{id}/analisis/` | 202, o 200 si reutiliza uno completado |
| Consultar análisis | `GET /api/v1/analisis/{uuid}/` | 200; revisar campo `estado` |
| Último análisis | `GET /api/v1/campanas/{id}/ultimo-analisis/` | 200 con objeto o `null` |

Los errores de validación usan 400; los registros inexistentes 404; los conflictos y las eliminaciones protegidas 409. La eliminación exitosa devuelve 204 sin cuerpo. El frontend evita intentar leer JSON de una respuesta 204.

Cada registro de insumo representa una meta en un punto y una campaña. Su combinación campaña/punto/nombre/unidad es única. `cantidad_recibida` es acumulada; aún no se implementan movimientos, entregas o auditoría de existencias. La cobertura de una campaña representa el porcentaje de metas completamente cubiertas, no el promedio de litros y unidades recibidas.

## Aprender el consumo de API

Empiecen por [el recorrido guiado](docs/RECORRIDO_APRENDIZAJE.md). La separación del frontend es:

- `services/api.ts`: HTTP, cancelación, errores y conversión JSON.
- `hooks/useResources.ts`: query keys, caché, mutations, invalidación y polling.
- `views/`: pantallas que consumen los hooks.
- `components/ResourceForm.tsx`: estado local del formulario y guardado.

Conserva el patrón de servicio HTTP, menú, tablas y formularios de Front-ShopStarter. Se creó una interfaz propia y más pequeña; no se copiaron sus datos comerciales ni su autenticación simulada. Los proyectos de referencia permanecen en sus carpetas originales.

## Verificación

```bash
.venv/bin/python backend/manage.py test ayuda.tests --noinput
.venv/bin/python backend/manage.py spectacular --file /tmp/nexo-openapi.yaml --validate --fail-on-warn
cd frontend
npm run build
```

Las pruebas usan una base temporal y no necesitan Redis ni una clave. La integración con Redis/Celery se verifica además ejecutando los procesos y solicitando un análisis en el navegador.

## Trabajo en pareja y bitácoras

Cristian puede empezar por campañas e insumos; Jimmy, por voluntarios y puntos de acopio. Cada integrante debe recorrer su recurso desde la petición HTTP hasta la tabla y explicar el trabajo del otro.

Hay plantillas individuales en `docs/bitacora-cristian.md` y `docs/bitacora-jimmy.md`. No se inventaron prompts ni decisiones personales. `docs/REGISTRO_ASISTENCIA_IA.md` documenta la asistencia efectivamente prestada en esta conversación.

**Condición del documento académico:** el PDF exige autoría manual del código backend. Esta base contiene código backend generado con asistencia de IA a petición del usuario. Debe identificarse como tal; no equivale a demostrar la autoría manual exigida por esa actividad.
