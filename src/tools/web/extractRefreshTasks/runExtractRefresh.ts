import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { useRestApi } from '../../../restApiInstance.js';
import { WebMcpServer } from '../../../server.web.js';
import { WebTool } from '../tool.js';

const paramsSchema = {
  taskId: z.string(),
};

export const getRunExtractRefreshTool = (server: WebMcpServer): WebTool<typeof paramsSchema> => {
  const runExtractRefreshTool = new WebTool({
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
    callback: async ({ taskId }, extra): Promise<CallToolResult> => {
      return await runExtractRefreshTool.logAndExecute({
        extra,
        args: { taskId },
        callback: async () => {
          const result = await useRestApi({
            ...extra,
            jwtScopes: runExtractRefreshTool.requiredApiScopes,
            callback: async (restApi) =>
              await restApi.tasksMethods.runExtractRefresh({
                siteId: restApi.siteId,
                taskId,
              }),
          });

          return new Ok(result);
        },
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });

  return runExtractRefreshTool;
};
