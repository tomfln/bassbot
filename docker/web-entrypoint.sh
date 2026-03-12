#!/bin/sh
set -e

DATA_DIR="${DATA_DIR:-/data}"

# Fix permissions if a bind mount overrides image ownership
if [ -d "$DATA_DIR" ]; then
    OWNER="$(stat -c %u "$DATA_DIR")"
    if [ "$OWNER" != "1001" ]; then
        chown -R 1001:1001 "$DATA_DIR" 2>/dev/null || true
    fi
fi

# Drop privileges and execute command
exec runuser -u nextjs -- "$@"