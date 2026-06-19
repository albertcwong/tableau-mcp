import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { useRestApi } from '../../../restApiInstance.js';
import { WebMcpServer } from '../../../server.web.js';
import { WebTool } from '../tool.js';

const paramsSchema = {
  flowId: z.string(),
};

export const getRunFlowTool = (server: WebMcpServer): WebTool<typeof paramsSchema> => {
  const runFlowTool = new WebTool({
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
    callback: async ({ flowId }, extra): Promise<CallToolResult> => {
      return await runFlowTool.logAndExecute({
        extra,
        args: { flowId },
        callback: async () => {
          const result = await useRestApi({
            ...extra,
            jwtScopes: runFlowTool.requiredApiScopes,
            callback: async (restApi) =>
              await restApi.flowsMethods.runFlow({
                siteId: restApi.siteId,
                flowId,
              }),
          });

          return new Ok(result);
        },
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });

  return runFlowTool;
};
