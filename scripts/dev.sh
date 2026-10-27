#!/usr/bin/env bash
set -euo pipefail
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$task_root"
if [ ! -x .venv/bin/python ] || [ ! -d frontend/node_modules ]; then
  printf 'Ejecuta primero: bash scripts/setup.sh\n' >&2
  exit 1
fi
.venv/bin/python - <<'PY'
import os
from dotenv import load_dotenv
from redis import Redis
load_dotenv('.env')
try:
    Redis.from_url(os.getenv('CELERY_BROKER_URL', 'redis://127.0.0.1:6379/0'), socket_connect_timeout=2).ping()
except Exception:
    raise SystemExit('Inicia Redis antes de continuar: docker compose up -d redis (o redis-server instalado).')
PY
task_pids=()
cleanup() {
  trap - EXIT INT TERM
  for task_pid in "${task_pids[@]}"; do kill "$task_pid" 2>/dev/null || true; done
  wait || true
}
trap cleanup EXIT INT TERM
.venv/bin/python -u backend/manage.py runserver 127.0.0.1:8000 --noreload &
task_pids+=("$!")
.venv/bin/python -u backend/manage.py dispatch_events --watch &
task_pids+=("$!")
(cd backend && exec ../.venv/bin/celery -A config worker -Q analisis --pool=solo --concurrency=1 --loglevel=INFO) &
task_pids+=("$!")
(cd frontend && exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort) &
task_pids+=("$!")
printf '\nNexo Solidario: http://127.0.0.1:5173\nSwagger: http://127.0.0.1:8000/swagger/\nCtrl+C detiene los cuatro procesos; Redis se administra por separado.\n\n'
wait -n "${task_pids[@]}"
