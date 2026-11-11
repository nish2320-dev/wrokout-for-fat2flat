#!/usr/bin/env bash
# Runs schema.sql against a throwaway local Postgres with stubbed auth/storage,
# then checks the security rules. Usage: bash supabase/test/run.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dir="$(mktemp -d)"; bin=/usr/lib/postgresql/16/bin
trap '$bin/pg_ctl -D "$dir/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$dir"' EXIT
run() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
chmod 777 "$dir"
run "$bin/initdb -D $dir/data -A trust >/dev/null && $bin/pg_ctl -D $dir/data -o '-k $dir -p 5499 -c listen_addresses=' -l $dir/log start -w >/dev/null"
psql() { command psql -h "$dir" -p 5499 -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
psql -f "$here/stub.sql"
psql -f "$here/../schema.sql"
psql -f "$here/../schema.sql"   # must be safe to run twice
psql -f "$here/checks.sql"
echo "schema checks passed"
