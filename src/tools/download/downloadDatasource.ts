import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Err, Ok } from 'ts-results-es';
import { z } from 'zod';

import { getConfig } from '../../config.js';
import { useRestApi } from '../../restApiInstance.js';
import { Server } from '../../server.js';
import { getTableauAuthInfo } from '../../server/oauth/getTableauAuthInfo.js';
import { createProductTelemetryBase } from '../../telemetry/productTelemetry/telemetryForwarder.js';
import { getConfigWithOverrides } from '../../utils/mcpSiteSettings.js';
import { resourceAccessChecker } from '../resourceAccessChecker.js';
import { Tool } from '../tool.js';

const paramsSchema = {
  datasourceId: z.string(),
  includeExtract: z.boolean().default(true).optional(),
};

export type DownloadDatasourceError = { type: 'datasource-not-allowed'; message: string };

export const getDownloadDatasourceTool = (server: Server): Tool<typeof paramsSchema> => {
  const tool = new Tool({
    server,
    name: 'download-datasource',
    description:
      'Downloads a datasource as .tdsx. Use includeExtract: false for faster structure-only inspection. Returns JSON with filename and contentBase64. Required: datasourceId (LUID).',
    paramsSchema,
    annotations: { title: 'Download Datasource', readOnlyHint: true, openWorldHint: false },
    callback: async (
      { datasourceId, includeExtract },
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

      return await tool.logAndExecute<
        { filename: string; contentBase64: string },
        DownloadDatasourceError
      >({
        requestId,
        sessionId,
        authInfo,
        args: { datasourceId, includeExtract },
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
        callback: async () => {
          const allowed = await resourceAccessChecker.isDatasourceAllowed({
            datasourceLuid: datasourceId,
            restApiArgs,
          });
          if (!allowed.allowed)
            return new Err({ type: 'datasource-not-allowed', message: allowed.message });

          const { data, filename } = await useRestApi({
            ...restApiArgs,
            jwtScopes: ['tableau:content:read'],
            callback: (api) =>
              api.datasourcesMethods.downloadDatasourceContent({
                siteId: api.siteId,
                datasourceId,
                includeExtract: includeExtract ?? true,
              }),
          });
          const contentBase64 = Buffer.from(data).toString('base64');
          return new Ok({ filename, contentBase64 });
        },
        getErrorText: (e) => e.message,
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });
  return tool;
};
