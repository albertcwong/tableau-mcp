#!/bin/sh
# Dev container entrypoint: run the built HTTP server against the volume-mounted build/.
set -e
# Ensure node_modules has correct platform binaries (volume may have wrong arch from prior runs)
npm ci
# Ensure uv venv exists for createHyperFromRecords (use /app/.venv-hyper to avoid scripts mount conflicts)
if [ -f /app/scripts/pyproject.toml ]; then
  (cd /app/scripts && UV_PROJECT_ENVIRONMENT=/app/.venv-hyper uv sync)
fi
# The build/ dir is volume-mounted from the host (compose), which the host builds via
# `npm run build` (tsx src/scripts/build.ts — produces index.js + the bundled MCP Apps UI).
# We don't rebuild in-container: build/ being a mount makes tsx's rmdir step fail with EBUSY,
# and the old standalone `build:mcp-app` / `dev:docker` scripts were removed in the v2.15
# refactor. Just run the built server; env (TRANSPORT/PORT/AUTH/PAT_*) comes from compose env_file.
exec npm run start:http
