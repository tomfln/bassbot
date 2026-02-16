FROM oven/bun

WORKDIR /usr/src/app

# Hardcode data directory for volume mounts
ENV DATA_DIR=/data
RUN mkdir -p /data && chown -R bun:bun /data

# Copy workspace package manifests first for dependency caching
COPY package.json bun.lock ./
COPY dashboard/package.json dashboard/

# Install all workspace dependencies
RUN bun install --frozen-lockfile

# Copy all source (needed for dashboard build due to cross-project type imports)
COPY . .

# Build dashboard
RUN cd dashboard && bun run build

# Runtime configuration
USER bun

# Start the app
CMD ["bun", "start"]

