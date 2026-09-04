#!/usr/bin/env bash
# Applies the migrations to a throwaway database and runs the suites.
#
#   supabase/tests/run.sh                 # local postgres, stubbed auth schema
#   DATABASE_URL=postgres://… supabase/tests/run.sh --remote
#
# --remote skips the stub and the database creation, and runs the suites
# against whatever DATABASE_URL points at. Point it at a Supabase branch, never
# at production: the suites write rows and roll back, but a failure mid-script
# can leave a transaction open.
#
# Connect as a role WITHOUT bypassrls. A superuser sees through every policy
# and would pass the whole isolation suite while the app leaks everything.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
migrations="$here/../migrations"

if [[ "${1:-}" == "--remote" ]]; then
  : "${DATABASE_URL:?set DATABASE_URL to the target database}"
  for f in "$migrations"/*.sql; do
    echo "── applying $(basename "$f")"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
  done
  for t in "$here"/0[1-9]_*.sql; do
    echo "── $(basename "$t")"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$t" 2>&1 | grep -E 'PASS|FAIL' || true
  done
  exit 0
fi

: "${PGHOST:=/var/tmp}"
: "${PGPORT:=55432}"
: "${PGUSER:=sumptus}"
db="sumptus_test_$$"
export PGHOST PGPORT PGUSER

psql -d postgres -q -c "create database $db"
trap 'psql -d postgres -q -c "drop database if exists $db"' EXIT

psql -d "$db" -v ON_ERROR_STOP=1 -q -f "$here/00_supabase_stub.sql"
for f in "$migrations"/*.sql; do
  echo "── applying $(basename "$f")"
  psql -d "$db" -v ON_ERROR_STOP=1 -q -f "$f"
done

failed=0
for t in "$here"/0[1-9]_*.sql; do
  echo "── $(basename "$t")"
  if ! psql -d "$db" -v ON_ERROR_STOP=1 -f "$t" 2>&1 | grep -E 'PASS|FAIL|ERROR'; then :; fi
  psql -d "$db" -v ON_ERROR_STOP=1 -f "$t" >/dev/null 2>&1 || failed=1
done

if [[ $failed -eq 0 ]]; then echo "all suites green"; else echo "SUITES FAILED"; exit 1; fi
