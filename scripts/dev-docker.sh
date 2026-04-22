#!/bin/sh
# Dev container entrypoint: build mcp-app (or use prebuilt from image), then tsx + vite watch
set -e
# Ensure node_modules has correct platform binaries (volume may have wrong arch from prior runs)
npm ci
# Ensure uv venv exists for createHyperFromRecords (use /app/.venv-hyper to avoid scripts mount conflicts)
if [ -f /app/scripts/pyproject.toml ]; then
  (cd /app/scripts && UV_PROJECT_ENVIRONMENT=/app/.venv-hyper uv sync)
fi
# Build MCP app UI (required for read_resource). Use prebuilt from image if build fails.
if ! npm run build:mcp-app; then
  if [ -d /opt/mcp-app-prebuilt ]; then
    echo "Using prebuilt MCP app from image"
    mkdir -p /app/build/mcp-app && cp -r /opt/mcp-app-prebuilt/* /app/build/mcp-app/
  else
    echo "WARN: build:mcp-app failed and no prebuilt fallback - MCP Apps UI may be unavailable"
  fi
fi
exec npm run dev:docker
