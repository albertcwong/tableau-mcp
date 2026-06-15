import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { Server } from '../../server.js';
import { readDownloadedFile } from '../../utils/downloadTempFile.js';
import { Tool } from '../tool.js';

const paramsSchema = {
  filePath: z.string(),
};

export const getGetDownloadedFileTool = (server: Server): Tool<typeof paramsSchema> => {
  const tool = new Tool({
    server,
    name: 'get-downloaded-file',
    description:
      'Returns the base64-encoded content of a previously downloaded file (from download-datasource, download-workbook, or download-flow). Use this when you need the actual file bytes, e.g. to save to the local filesystem.',
    paramsSchema,
    annotations: { title: 'Get Downloaded File', readOnlyHint: true, openWorldHint: false },
    callback: async (
      { filePath },
      { requestId, sessionId, authInfo },
    ): Promise<CallToolResult> => {
      return await tool.logAndExecute<{ filename: string; contentBase64: string; sizeBytes: number }>({
        requestId,
        sessionId,
        authInfo,
        args: { filePath },
        productTelemetryBase: { endpoint: '', enabled: false, podName: '', siteLuid: '', isHyperforce: false },
        callback: async () => {
          const buf = await readDownloadedFile(filePath);
          const filename = filePath.split('/').pop()?.replace(/^\d+-/, '') ?? 'file';
          return new Ok({ filename, contentBase64: buf.toString('base64'), sizeBytes: buf.length });
        },
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });
  return tool;
};
