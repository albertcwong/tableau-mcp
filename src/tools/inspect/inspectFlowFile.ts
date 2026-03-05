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
import { extractInnerXml, parseFlowXml } from './inspectUtils.js';

const paramsSchema = {
  flowId: z.string().optional(),
  contentBase64: z.string().optional(),
};

export const getInspectFlowFileTool = (server: Server): Tool<typeof paramsSchema> => {
  const tool = new Tool({
    server,
    name: 'inspect-flow-file',
    description:
      'Parses a flow file (.tflx or .tfl) and returns structured inspection: steps, outputs. Provide flowId or contentBase64.',
    paramsSchema,
    annotations: { title: 'Inspect Flow File', readOnlyHint: true, openWorldHint: false },
    callback: async (
      { flowId, contentBase64 },
      { requestId, sessionId, authInfo, signal },
    ): Promise<CallToolResult> => {
      if (!flowId && !contentBase64) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'One of flowId or contentBase64 is required.' }],
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

      return await tool.logAndExecute<ReturnType<typeof parseFlowXml>>({
        requestId,
        sessionId,
        authInfo,
        args: { flowId, contentBase64 },
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
        callback: async () => {
          let xml: string;
          if (contentBase64) {
            const buf = Buffer.from(contentBase64, 'base64');
            xml = buf[0] === 0x50 && buf[1] === 0x4b
              ? extractInnerXml(buf, '.tfl')
              : buf.toString('utf8');
          } else {
            const { data } = await useRestApi({
              ...restApiArgs,
              jwtScopes: ['tableau:flows:download'],
              callback: (api) =>
                api.flowsMethods.downloadFlowContent({
                  siteId: api.siteId,
                  flowId: flowId!,
                }),
            });
            const buf = Buffer.from(data);
            xml = buf[0] === 0x50 && buf[1] === 0x4b
              ? extractInnerXml(buf, '.tfl')
              : buf.toString('utf8');
          }
          return new Ok(parseFlowXml(xml));
        },
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });
  return tool;
};
