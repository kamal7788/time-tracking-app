#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Seeding database (idempotent)..."
./node_modules/.bin/tsx prisma/seed.ts || echo "Seed skipped/failed (non-fatal)"

echo "Starting application..."
exec node server.js
