import { existsSync } from 'fs';
import path from 'path';

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
} from '@modelcontextprotocol/ext-apps/server';

export const MCP_APP_RESOURCE_URI = 'ui://tableau-mcp/data-explorer.html';

function getMcpAppPath(): string {
  // Prod: __dirname = build/ when running from build/index.js
  // Dev: __dirname = src/ when running via tsx; build/ is mounted at /app/build
  const buildDir = path.join(__dirname, '..', 'build');
  return path.join(buildDir, 'mcp-app', 'mcp-app.html');
}

export function isMcpAppsEnabled(): boolean {
  return existsSync(getMcpAppPath());
}

export function getMcpAppMeta(): { _meta: { ui: { resourceUri: string } } } {
  return { _meta: { ui: { resourceUri: MCP_APP_RESOURCE_URI } } };
}

export function registerMcpAppResource(server: {
  registerResource: (
    name: string,
    uri: string,
    config: { mimeType: string; description?: string },
    readCallback: () => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>,
  ) => unknown;
}): void {
  registerAppResource(
    server as Parameters<typeof registerAppResource>[0],
    MCP_APP_RESOURCE_URI,
    MCP_APP_RESOURCE_URI,
    {
      mimeType: RESOURCE_MIME_TYPE,
      description: 'Tableau Data Explorer - interactive chart and table view',
    },
    async () => {
      const appPath = getMcpAppPath();
      try {
        if (!existsSync(appPath)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `MCP App UI not available: ${appPath} not found. Run "npm run build:mcp-app" to build the UI.`,
          );
        }
        const { readFile } = await import('fs/promises');
        const html = await readFile(appPath, 'utf-8');
        if (typeof html !== 'string' || html.length === 0) {
          throw new McpError(ErrorCode.InternalError, 'MCP App UI file is empty or invalid.');
        }
        return {
          contents: [
            {
              uri: MCP_APP_RESOURCE_URI,
              mimeType: RESOURCE_MIME_TYPE,
              text: html,
            },
          ],
        };
      } catch (err) {
        if (err instanceof McpError) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        throw new McpError(ErrorCode.InternalError, `MCP App UI read failed: ${msg}`);
      }
    },
  );
}
