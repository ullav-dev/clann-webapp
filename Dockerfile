# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json .npmrc ./
COPY packages/ ./packages/
RUN --mount=type=secret,id=npm_token \
    NODE_AUTH_TOKEN=$(cat /run/secrets/npm_token) npm ci

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* vars are read server-side at runtime via process.env,
# so no build args are required; the standalone server reads them on startup.
RUN node node_modules/next/dist/bin/next build

# Stage 3: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
# Increase the HTTP header size limit from 16 KB to 32 KB.
# Real JWTs carrying roles/permissions/subscriptions/teams can exceed the default
# and cause Node.js to reset the connection before Next.js middleware runs.
ENV NODE_OPTIONS="--max-http-header-size=32768"

CMD ["node", "server.js"]
