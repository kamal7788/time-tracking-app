#!/bin/sh
set -e

# Run database migrations and seed
./node_modules/.bin/prisma db push --accept-data-loss
./node_modules/.bin/tsx prisma/seed.ts

# Start the application
exec node server.js