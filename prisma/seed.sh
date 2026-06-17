#!/bin/sh
npx prisma db push --accept-data-loss
npx tsx prisma/seed.ts