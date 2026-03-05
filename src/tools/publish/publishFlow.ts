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

const paramsSchema = {
  projectId: z.string(),
  name: z.string(),
  contentBase64: z.string().optional(),
  uploadSessionId: z.string().optional(),
  overwrite: z.boolean().default(false).optional(),
};

export const getPublishFlowTool = (server: Server): Tool<typeof paramsSchema> => {
  const tool = new Tool({
    server,
    name: 'publish-flow',
    description:
      'Publishes a flow to a project. Use when the agent needs to publish a .tflx file. Requires projectId, name, and either contentBase64 or uploadSessionId. Returns published flow metadata.',
    paramsSchema,
    annotations: { title: 'Publish Flow', readOnlyHint: false, openWorldHint: false },
    callback: async (
      { projectId, name, contentBase64, uploadSessionId, overwrite },
      { requestId, sessionId, authInfo, signal },
    ): Promise<CallToolResult> => {
      if (!contentBase64 && !uploadSessionId) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'One of contentBase64 or uploadSessionId is required.',
            },
          ],
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

      return await tool.logAndExecute<Record<string, string>>({
        requestId,
        sessionId,
        authInfo,
        args: { projectId, name, contentBase64, uploadSessionId, overwrite },
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
        callback: async () => {
          if (uploadSessionId) {
            throw new Error(
              'Publish with uploadSessionId not yet implemented. Use contentBase64 for files <64MB.',
            );
          }
          const meta = await useRestApi({
            ...restApiArgs,
            jwtScopes: ['tableau:flows:create'],
            callback: (api) =>
              api.flowsMethods.publishFlow({
                siteId: api.siteId,
                projectId,
                name,
                contentBase64: contentBase64!,
                overwrite,
              }),
          });
          return new Ok(meta);
        },
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });
  return tool;
};
