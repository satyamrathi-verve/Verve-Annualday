# Operation Prompt & Co. — container image for Google Cloud Run.
# Multi-stage build of the Next.js standalone server. Public client env
# (NEXT_PUBLIC_*) is read from .env.production during the build step.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
# OPTIONAL override for the app_settings row (env-scoped toggles). Normally left
# empty: the app auto-detects the test host at runtime (lib/data/settingsId.ts)
# and uses id=2 there, id=1 (live) elsewhere. Pass --build-arg
# NEXT_PUBLIC_APP_ENV=test|production only to force a row regardless of host;
# must be set here (build stage) because NEXT_PUBLIC_* is inlined by next build.
ARG NEXT_PUBLIC_APP_ENV=
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Cloud Run sends traffic to $PORT (defaults to 8080).
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 8080
CMD ["node", "server.js"]
