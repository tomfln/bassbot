FROM oven/bun

WORKDIR /usr/src/app

# Hardcode data directory for volume mounts
ENV DATA_DIR=/data
RUN mkdir -p /data && chown -R bun:bun /data

# Install and cache bot dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Install and build dashboard
COPY dashboard/package.json dashboard/bun.lock dashboard/
RUN cd dashboard && bun install --frozen-lockfile
COPY dashboard/ dashboard/
RUN cd dashboard && bun run build

# Copy application source
COPY . .

# Runtime configuration
USER bun

# Start the app
CMD ["bun", "start"]

