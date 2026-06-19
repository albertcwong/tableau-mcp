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
  flowId: z.string(),
};

export const getRunFlowTool = (server: Server): Tool<typeof paramsSchema> => {
  const runFlowTool = new Tool({
    server,
    name: 'run-flow',
    description: `
  Runs a specified Tableau Prep flow using the Tableau REST API. Triggers execution of the flow and returns job/run information.

  **Parameters:**
  - flowId (required): The ID (LUID) of the flow to run.

  **Example Usage:**
  - Run a flow by ID:
      flowId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  `,
    paramsSchema,
    annotations: {
      title: 'Run Flow',
      readOnlyHint: false,
      openWorldHint: false,
    },
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

      return await runFlowTool.logAndExecute({
        requestId,
        sessionId,
        authInfo,
        args: { flowId },
        callback: async () => {
          const result = await useRestApi({
            ...restApiArgs,
            jwtScopes: ['tableau:tasks:run'],
            callback: async (restApi) => {
              return await restApi.flowsMethods.runFlow({
                siteId: restApi.siteId,
                flowId,
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

  return runFlowTool;
};
