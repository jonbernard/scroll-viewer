#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma db push --skip-generate
echo "Migrations complete."
export HOSTNAME=0.0.0.0
exec "$@"
