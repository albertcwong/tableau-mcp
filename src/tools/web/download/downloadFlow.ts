import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { useRestApi } from '../../../restApiInstance.js';
import { WebMcpServer } from '../../../server.web.js';
import { DownloadResult, processDownload } from '../../../utils/downloadTempFile.js';
import { WebTool } from '../tool.js';
import { formatDownloadResult } from './downloadResultFormat.js';

const paramsSchema = { flowId: z.string() };

export const getDownloadFlowTool = (server: WebMcpServer): WebTool<typeof paramsSchema> => {
  const downloadFlowTool = new WebTool({
    server,
    name: 'download-flow',
    description:
      'Downloads a flow as .tflx (packaged flow). For small files, returns contentBase64 inline. For large files, returns filePath to pass to get-downloaded-file or publish-flow. Required param: flowId (LUID).',
    paramsSchema,
    annotations: { title: 'Download Flow', readOnlyHint: true, openWorldHint: false },
    callback: async ({ flowId }, extra): Promise<CallToolResult> => {
      return await downloadFlowTool.logAndExecute<DownloadResult>({
        extra,
        args: { flowId },
        callback: async () => {
          const { data, filename } = await useRestApi({
            ...extra,
            jwtScopes: downloadFlowTool.requiredApiScopes,
            callback: (api) =>
              api.flowsMethods.downloadFlowContent({
                siteId: api.siteId,
                flowId,
              }),
          });
          return new Ok(await processDownload(filename, data));
        },
        getSuccessResult: (r) => formatDownloadResult(r, 'flow'),
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });

  return downloadFlowTool;
};
