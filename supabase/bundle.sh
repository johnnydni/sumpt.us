#!/usr/bin/env bash
# Prints every migration in order, for pasting into the Supabase SQL editor
# in one go. The CLI (`supabase db push`) applies them individually and needs
# none of this; use it when the dashboard is the easier path.
#
#   supabase/bundle.sh > /tmp/sumptus.sql
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for f in "$here"/migrations/*.sql; do
  printf -- '-- ── %s ──\n' "$(basename "$f")"
  cat "$f"
  printf '\n\n'
done
