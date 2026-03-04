import { existsSync } from 'fs';
import path from 'path';

import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
} from '@modelcontextprotocol/ext-apps/server';

export const MCP_APP_RESOURCE_URI = 'ui://tableau-mcp/data-explorer.html';

function getMcpAppPath(): string {
  return path.join(__dirname, 'mcp-app', 'mcp-app.html');
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
      const { readFile } = await import('fs/promises');
      const html = await readFile(getMcpAppPath(), 'utf-8');
      return {
        contents: [
          {
            uri: MCP_APP_RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  );
}
