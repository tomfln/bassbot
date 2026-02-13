FROM oven/bun

WORKDIR /usr/src/app

# Hardcode data directory for volume mounts
ENV DATA_DIR=/data
RUN mkdir -p /data && chown -R bun:bun /data

# Install and cache dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy application source
COPY . .

# Runtime configuration
USER bun

# Start the app
CMD ["bun", "start"]

