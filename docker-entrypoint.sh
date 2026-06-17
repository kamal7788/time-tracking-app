#!/bin/sh
set -e

# Run database migrations and seed
npx prisma db push --accept-data-loss
npx tsx prisma/seed.ts

# Start the application
exec node server.js