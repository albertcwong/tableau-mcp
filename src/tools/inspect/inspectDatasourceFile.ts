import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { getConfig } from '../../config.js';
import { useRestApi } from '../../restApiInstance.js';
import { Server } from '../../server.js';
import { getTableauAuthInfo } from '../../server/oauth/getTableauAuthInfo.js';
import { createProductTelemetryBase } from '../../telemetry/productTelemetry/telemetryForwarder.js';
import { getConfigWithOverrides } from '../../utils/mcpSiteSettings.js';
import { resourceAccessChecker } from '../resourceAccessChecker.js';
import { Tool } from '../tool.js';
import {
  extractInnerXml,
  parseDatasourceXml,
} from './inspectUtils.js';

const paramsSchema = {
  datasourceId: z.string().optional(),
  contentBase64: z.string().optional(),
  includeExtract: z.boolean().default(true).optional(),
};

export const getInspectDatasourceFileTool = (server: Server): Tool<typeof paramsSchema> => {
  const tool = new Tool({
    server,
    name: 'inspect-datasource-file',
    description:
      'Parses a datasource file (.tdsx or .tds) and returns structured inspection: connections, columns. When using datasourceId, pass includeExtract: false for faster structure-only fetch.',
    paramsSchema,
    annotations: { title: 'Inspect Datasource File', readOnlyHint: true, openWorldHint: false },
    callback: async (
      { datasourceId, contentBase64, includeExtract },
      { requestId, sessionId, authInfo, signal },
    ): Promise<CallToolResult> => {
      if (!datasourceId && !contentBase64) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'One of datasourceId or contentBase64 is required.' }],
        };
      }
      const config = getConfig();
      const restApiArgs = {
        config,
        requestId,
        server,
        signal,
        authInfo: getTableauAuthInfo(authInfo),
      };
      await getConfigWithOverrides({ restApiArgs });

      return await tool.logAndExecute<ReturnType<typeof parseDatasourceXml>>({
        requestId,
        sessionId,
        authInfo,
        args: { datasourceId, contentBase64, includeExtract },
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
        callback: async () => {
          let xml: string;
          if (contentBase64) {
            const buf = Buffer.from(contentBase64, 'base64');
            xml = buf[0] === 0x50 && buf[1] === 0x4b
              ? extractInnerXml(buf, '.tds')
              : buf.toString('utf8');
          } else {
            const allowed = await resourceAccessChecker.isDatasourceAllowed({
              datasourceLuid: datasourceId!,
              restApiArgs,
            });
            if (!allowed.allowed) throw new Error(allowed.message);
            const { data } = await useRestApi({
              ...restApiArgs,
              jwtScopes: ['tableau:content:read'],
              callback: (api) =>
                api.datasourcesMethods.downloadDatasourceContent({
                  siteId: api.siteId,
                  datasourceId: datasourceId!,
                  includeExtract: includeExtract ?? true,
                }),
            });
            const buf = Buffer.from(data);
            xml = buf[0] === 0x50 && buf[1] === 0x4b
              ? extractInnerXml(buf, '.tds')
              : buf.toString('utf8');
          }
          return new Ok(parseDatasourceXml(xml));
        },
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });
  return tool;
};
