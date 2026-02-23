FROM oven/bun

WORKDIR /usr/src/app

# Hardcode data directory for volume mounts
ENV DATA_DIR=/data
RUN mkdir -p /data && chown -R bun:bun /data

# Copy package manifests for dependency caching
COPY package.json bun.lock ./
COPY web/package.json web/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY lib/ lib/
COPY src/ src/
COPY drizzle/ drizzle/
COPY tsconfig.json ./

# Runtime configuration
USER bun

# Start the app
CMD ["bun", "start"]

