#!/bin/sh
set -e
export PATH="/app/tools/node_modules/.bin:$PATH"
echo "Running database migrations..."
prisma db push --skip-generate
echo "Migrations complete."
echo "Running initial import..."
tsx scripts/import.ts
echo "Import complete."
export HOSTNAME=0.0.0.0
exec "$@"
