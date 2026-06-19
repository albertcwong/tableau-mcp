import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { getConfig } from '../../config.js';
import { useRestApi } from '../../restApiInstance.js';
import { Server } from '../../server.js';
import { getTableauAuthInfo } from '../../server/oauth/getTableauAuthInfo.js';
import { createProductTelemetryBase } from '../../telemetry/productTelemetry/telemetryForwarder.js';
import { Tool } from '../tool.js';

const paramsSchema = {
  taskId: z.string(),
};

export const getRunExtractRefreshTool = (server: Server): Tool<typeof paramsSchema> => {
  const runExtractRefreshTool = new Tool({
    server,
    name: 'run-extract-refresh',
    description: `
  Triggers an extract refresh task on a Tableau site using the Tableau REST API. Runs the specified extract refresh task immediately and returns job information.

  **Parameters:**
  - taskId (required): The ID of the extract refresh task to run.

  **Example Usage:**
  - Run an extract refresh task by ID:
      taskId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  `,
    paramsSchema,
    annotations: {
      title: 'Run Extract Refresh',
      readOnlyHint: false,
      openWorldHint: false,
    },
    callback: async (
      { taskId },
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

      return await runExtractRefreshTool.logAndExecute({
        requestId,
        sessionId,
        authInfo,
        args: { taskId },
        callback: async () => {
          const result = await useRestApi({
            ...restApiArgs,
            jwtScopes: ['tableau:tasks:run'],
            callback: async (restApi) => {
              return await restApi.tasksMethods.runExtractRefresh({
                siteId: restApi.siteId,
                taskId,
              });
            },
          });

          return new Ok(result);
        },
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
        getSuccessResult: (result) => ({
          isError: false,
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        }),
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
      });
    },
  });

  return runExtractRefreshTool;
};
