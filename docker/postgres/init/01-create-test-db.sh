#!/bin/bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'
SELECT 'CREATE DATABASE sporthub_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sporthub_test')\gexec
SQL
