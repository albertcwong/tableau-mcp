import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { getConfig } from '../../config.js';
import { useRestApi } from '../../restApiInstance.js';
import { Server } from '../../server.js';
import { getTableauAuthInfo } from '../../server/oauth/getTableauAuthInfo.js';
import { createProductTelemetryBase } from '../../telemetry/productTelemetry/telemetryForwarder.js';
import { DownloadResult, processDownload } from '../../utils/downloadTempFile.js';
import { getConfigWithOverrides } from '../../utils/mcpSiteSettings.js';
import { Tool } from '../tool.js';
import { formatDownloadResult } from './downloadResultFormat.js';

const paramsSchema = { flowId: z.string() };

export const getDownloadFlowTool = (server: Server): Tool<typeof paramsSchema> => {
  const tool = new Tool({
    server,
    name: 'download-flow',
    description:
      'Downloads a flow as .tflx (packaged flow). For small files, returns contentBase64 inline. For large files, returns filePath to pass to get-downloaded-file, inspect-flow-file, or publish-flow. Required param: flowId (LUID).',
    paramsSchema,
    annotations: { title: 'Download Flow', readOnlyHint: true, openWorldHint: false },
    callback: async (
      { flowId },
      { requestId, sessionId, authInfo, signal },
    ): Promise<CallToolResult> => {
      const config = getConfig();
      const restApiArgs = {
        config,
        requestId,
        server,
        signal,
        authInfo: getTableauAuthInfo(authInfo),
      };
      await getConfigWithOverrides({ restApiArgs });

      return await tool.logAndExecute<DownloadResult>({
        requestId,
        sessionId,
        authInfo,
        args: { flowId },
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
        callback: async () => {
          const { data, filename } = await useRestApi({
            ...restApiArgs,
            jwtScopes: ['tableau:flows:download'],
            callback: (api) =>
              api.flowsMethods.downloadFlowContent({
                siteId: api.siteId,
                flowId,
              }),
          });
          return new Ok(await processDownload(filename, data));
        },
        getSuccessResult: (r: DownloadResult) => formatDownloadResult(r, 'flow'),
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });
  return tool;
};
