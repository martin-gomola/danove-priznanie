# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Build app (produces .next/standalone + .next/static + public)
COPY . .
RUN npm run build

# ─── Production stage ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# For healthcheck (wget not included in Alpine by default)
RUN apk add --no-cache wget

# Port is configurable via build arg (default 3015)
ARG PORT=3015
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=${PORT}
ENV HOSTNAME="0.0.0.0"

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy data required by API (2% recipients CSV)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

USER nextjs

EXPOSE ${PORT}

CMD ["node", "server.js"]
