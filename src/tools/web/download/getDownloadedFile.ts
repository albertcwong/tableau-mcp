import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { ServiceUnavailableError } from '../../../errors/mcpToolError.js';
import { WebMcpServer } from '../../../server.web.js';
import { readDownloadedFile } from '../../../utils/downloadTempFile.js';
import { WebTool } from '../tool.js';

const paramsSchema = {
  filePath: z.string(),
};

type DownloadedFile = {
  filename: string;
  contentBase64: string;
  sizeBytes: number;
};

export const getGetDownloadedFileTool = (server: WebMcpServer): WebTool<typeof paramsSchema> => {
  const getDownloadedFileTool = new WebTool({
    server,
    name: 'get-downloaded-file',
    description:
      'Returns the base64-encoded content of a previously downloaded file (from download-datasource, download-workbook, or download-flow). Use this when you need the actual file bytes, e.g. to save to the local filesystem.',
    paramsSchema,
    annotations: { title: 'Get Downloaded File', readOnlyHint: true, openWorldHint: false },
    callback: async ({ filePath }, extra): Promise<CallToolResult> => {
      return await getDownloadedFileTool.logAndExecute<DownloadedFile>({
        extra,
        args: { filePath },
        callback: async () => {
          // This tool makes no Tableau REST API call (it reads a server-local temp file from a
          // prior download in this session). Passthrough auth has externally-managed session
          // credentials, so we cannot scope file access to the caller — reject it explicitly.
          if (extra.tableauAuthInfo?.type === 'Passthrough') {
            return new ServiceUnavailableError(
              'get-downloaded-file is not available for Passthrough authentication.',
            ).toErr();
          }

          const buf = await readDownloadedFile(filePath);
          const filename = filePath.split('/').pop()?.replace(/^\d+-/, '') ?? 'file';
          return new Ok({
            filename,
            contentBase64: buf.toString('base64'),
            sizeBytes: buf.length,
          });
        },
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });

  return getDownloadedFileTool;
};
