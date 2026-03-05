import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { getConfig } from '../../config.js';
import { useRestApi } from '../../restApiInstance.js';
import { Server } from '../../server.js';
import { getTableauAuthInfo } from '../../server/oauth/getTableauAuthInfo.js';
import { createProductTelemetryBase } from '../../telemetry/productTelemetry/telemetryForwarder.js';
import { getConfigWithOverrides } from '../../utils/mcpSiteSettings.js';
import { Tool } from '../tool.js';

const paramsSchema = { flowId: z.string() };

export const getDownloadFlowTool = (server: Server): Tool<typeof paramsSchema> => {
  const tool = new Tool({
    server,
    name: 'download-flow',
    description:
      'Downloads a flow as .tflx (packaged flow). Use when the agent needs to download a flow for backup, migration, or inspection. Returns JSON with filename and contentBase64. Required param: flowId (LUID).',
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

      return await tool.logAndExecute<{ filename: string; contentBase64: string }>({
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
          const contentBase64 = Buffer.from(data).toString('base64');
          return new Ok({ filename, contentBase64 });
        },
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });
  return tool;
};
