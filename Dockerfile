# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN apk add --no-cache icu-data-full

# ---------- deps: install node_modules with cache mounts ----------
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---------- builder: compile the app ----------
FROM base AS builder
WORKDIR /app

ARG JWT_SECRET
ENV JWT_SECRET=$JWT_SECRET

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (postinstall also does this; explicit for safety)
RUN ./node_modules/.bin/prisma generate

# Build the application (Next.js standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runner: minimal production image ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl curl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Static assets + prisma schema/migrations + CLI engines from the deps layer
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Entrypoint + uploads dir (writable by the app user)
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh \
  && mkdir -p public/uploads/expenses \
  && chown -R nextjs:nodejs public/uploads

# Next.js standalone server output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["./docker-entrypoint.sh"]
