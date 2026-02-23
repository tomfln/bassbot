FROM oven/bun AS base
WORKDIR /app

# ── Install dependencies ──
FROM base AS deps
COPY package.json ./
RUN bun install --frozen-lockfile

# ── Build ──
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ── Production ──
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:bun /app/.next/standalone ./
COPY --from=builder --chown=nextjs:bun /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["bun", "server.js"]
