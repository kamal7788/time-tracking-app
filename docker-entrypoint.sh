#!/bin/sh
set -e

echo "Checking database migrations..."
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
  echo "Running existing migrations..."
  ./node_modules/.bin/prisma migrate deploy
else
  echo "No migrations found, creating initial migration..."
  ./node_modules/.bin/prisma migrate dev --name init --create-only
  ./node_modules/.bin/prisma migrate deploy
fi

echo "Seeding database (idempotent)..."
# Run seed in a subshell to prevent process.exit from killing the container
( ./node_modules/.bin/tsx prisma/seed.ts ) || echo "Seed skipped/failed (non-fatal)"

echo "Starting application..."
exec node server.js
