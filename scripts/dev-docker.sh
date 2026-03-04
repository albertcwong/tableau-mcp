#!/bin/sh
# Dev container entrypoint: initial mcp-app build, then tsx + vite watch
set -e
# Build MCP app UI (required for read_resource). Errors shown so failures are visible.
npm run build:mcp-app || echo "WARN: build:mcp-app failed - MCP Apps UI will not be available"
exec npm run dev:docker
