#!/usr/bin/env bash
set -euo pipefail
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$task_root"
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.lock.txt
(cd frontend && npm ci)
if [ ! -f .env ]; then cp .env.example .env; fi
.venv/bin/python backend/manage.py migrate
printf '\nProyecto preparado. Opcional: .venv/bin/python backend/manage.py seed_demo\n'
printf 'Inicia Redis y ejecuta: bash scripts/dev.sh\n'
