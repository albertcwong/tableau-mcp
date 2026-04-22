import { existsSync } from 'fs';
import path from 'path';

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
} from '@modelcontextprotocol/ext-apps/server';

export const CHART_APP_URI = 'ui://tableau-mcp/chart-explorer.html';
export const CONTENT_APP_URI = 'ui://tableau-mcp/content-browser.html';

export const TOOL_APP_URIS: Record<string, string> = {
  'query-datasource': CHART_APP_URI,
  'get-view-data': CHART_APP_URI,
  'list-datasources': CONTENT_APP_URI,
  'get-datasource-metadata': CONTENT_APP_URI,
  'search-content': CONTENT_APP_URI,
};

function getBuildDir(): string {
  return path.join(__dirname, '..', 'build');
}

function getMcpAppPath(filename: string): string {
  return path.join(getBuildDir(), 'mcp-app', filename);
}

export function isMcpAppsEnabled(): boolean {
  return existsSync(getMcpAppPath('chart-explorer.html')) && existsSync(getMcpAppPath('content-browser.html'));
}

export function getMcpAppMeta(toolName: string): { _meta: { ui: { resourceUri: string } } } | undefined {
  const uri = TOOL_APP_URIS[toolName];
  if (!uri) return undefined;
  return { _meta: { ui: { resourceUri: uri } } };
}

async function readAppHtml(filename: string, uri: string): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
  const appPath = getMcpAppPath(filename);
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
    contents: [{ uri, mimeType: RESOURCE_MIME_TYPE, text: html }],
  };
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
    'Tableau Chart Explorer',
    CHART_APP_URI,
    {
      mimeType: RESOURCE_MIME_TYPE,
      description: 'Interactive chart and table view for query-datasource and get-view-data',
    },
    () => readAppHtml('chart-explorer.html', CHART_APP_URI),
  );
  registerAppResource(
    server as Parameters<typeof registerAppResource>[0],
    'Tableau Content Browser',
    CONTENT_APP_URI,
    {
      mimeType: RESOURCE_MIME_TYPE,
      description: 'Table view for list-datasources, get-datasource-metadata, and search-content',
    },
    () => readAppHtml('content-browser.html', CONTENT_APP_URI),
  );
}
