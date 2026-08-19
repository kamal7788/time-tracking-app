#!/bin/sh
set -e

echo "Checking database migrations..."
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
  echo "Running existing migrations..."
  ./node_modules/.bin/prisma migrate deploy 2>&1 | tee /tmp/migrate.log
  if grep -q "P3009" /tmp/migrate.log; then
    echo "Failed migration detected, resolving..."
    FAILED_MIGRATION=$(grep -o '202[0-9]\{7\}_init' /tmp/migrate.log | head -1)
    if [ -n "$FAILED_MIGRATION" ]; then
      ./node_modules/.bin/prisma migrate resolve --rolled-back "$FAILED_MIGRATION"
      echo "Re-applying migrations..."
      ./node_modules/.bin/prisma migrate deploy
    fi
  fi
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
