import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { DownloadResult } from '../../utils/downloadTempFile.js';

/**
 * Formats a DownloadResult into a CallToolResult.
 * - Small files (contentBase64 present): returns base64 inline
 * - Large files (filePath present): returns filePath with usage hints
 */
export function formatDownloadResult(
  result: DownloadResult,
  contentType: 'datasource' | 'workbook' | 'flow',
): CallToolResult {
  if (result.contentBase64) {
    return {
      isError: false,
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          filename: result.filename,
          sizeBytes: result.sizeBytes,
          contentBase64: result.contentBase64,
        }),
      }],
    };
  }

  const publishTool = `publish-${contentType}`;

  return {
    isError: false,
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        filename: result.filename,
        sizeBytes: result.sizeBytes,
        filePath: result.filePath,
        usage: `Pass filePath to: ${publishTool} (republish) or get-downloaded-file (to get base64 content for saving locally). filePath is server-internal and not accessible via shell.`,
      }),
    }],
  };
}
