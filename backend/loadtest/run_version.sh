#!/usr/bin/env bash
# Starts the backend in <backend_dir> on <port>, load tests it, then stops it.
# Results go to loadtest/results/results_<name>.json
#
# usage: bash run_version.sh <name> <backend_dir> <database_url> <port>
#   e.g. bash run_version.sh after_fix .. "postgresql+asyncpg://admin:secret@localhost:5433/lt_after" 8804
# Set SCENARIOS=login (or reads,writes) to run only some scenarios.
set -u
NAME=$1; DIR=$(cd "$2" && pwd); DBURL=$3; PORT=$4
S="$(cd "$(dirname "$0")" && pwd)"               # this loadtest/ folder
ENV_FILE="$S/../.env"                            # backend/.env
PY="${PYTHON:-$S/../../venv/Scripts/python}"     # repo venv; override with PYTHON=...
mkdir -p "$S/results"

# same settings as the real .env, except the database and a fake email key
set -a
eval "$(grep -E '^(SECRET_KEY|ALGORITHM|ACCESS_TOKEN_EXPIRE_MINUTES|BOT_API_KEY|BOT_USERNAME|CORS_ORIGINS)=' "$ENV_FILE" | tr -d '\r')"
set +a
export DATABASE_URL="$DBURL" RESEND_EMAIL_API_KEY="re_invalid_loadtest"

cd "$DIR"
"$PY" -m uvicorn main:app --port "$PORT" --workers 1 --no-access-log --log-level warning > "$S/results/server_$NAME.log" 2>&1 &
SERVER=$!
for i in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$PORT/docs" && break; sleep 1; done

"$PY" "$S/loadtest.py" "http://127.0.0.1:$PORT" "$S/results/results_$NAME.json"

kill $SERVER 2>/dev/null; sleep 1
taskkill //F //PID $SERVER >/dev/null 2>&1 || true
echo "done $NAME"
