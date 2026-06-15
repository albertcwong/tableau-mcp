import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { getConfig } from '../../config.js';
import { useRestApi } from '../../restApiInstance.js';
import { Server } from '../../server.js';
import { getTableauAuthInfo } from '../../server/oauth/getTableauAuthInfo.js';
import { createProductTelemetryBase } from '../../telemetry/productTelemetry/telemetryForwarder.js';
import { getConfigWithOverrides } from '../../utils/mcpSiteSettings.js';
import { paginate } from '../../utils/paginate.js';
import { Tool } from '../tool.js';

const paramsSchema = {
  pageSize: z.number().gt(0).optional(),
  limit: z.number().gt(0).optional(),
};

export const getListExtractRefreshTasksTool = (server: Server): Tool<typeof paramsSchema> => {
  const listExtractRefreshTasksTool = new Tool({
    server,
    name: 'list-extract-refresh-tasks',
    description: `
  Retrieves a list of extract refresh tasks on a Tableau site using the Tableau REST API. Returns information about scheduled extract refresh tasks including their type, schedule, and associated content.

  **Example Usage:**
  - List all extract refresh tasks on a site
  - List extract refresh tasks with a specific page size:
      pageSize: 50
  `,
    paramsSchema,
    annotations: {
      title: 'List Extract Refresh Tasks',
      readOnlyHint: true,
      openWorldHint: false,
    },
    callback: async (
      { pageSize, limit },
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

      const configWithOverrides = await getConfigWithOverrides({
        restApiArgs,
      });

      return await listExtractRefreshTasksTool.logAndExecute({
        requestId,
        sessionId,
        authInfo,
        args: { pageSize, limit },
        callback: async () => {
          const tasks = await useRestApi({
            ...restApiArgs,
            jwtScopes: ['tableau:tasks:read'],
            callback: async (restApi) => {
              const maxResultLimit = configWithOverrides.getMaxResultLimit(listExtractRefreshTasksTool.name);

              const tasks = await paginate({
                pageConfig: {
                  pageSize,
                  limit: maxResultLimit
                    ? Math.min(maxResultLimit, limit ?? Number.MAX_SAFE_INTEGER)
                    : limit,
                },
                getDataFn: async (pageConfig) => {
                  const { pagination, tasks: data } =
                    await restApi.tasksMethods.listExtractRefreshTasks({
                      siteId: restApi.siteId,
                      pageSize: pageConfig.pageSize,
                      pageNumber: pageConfig.pageNumber,
                    });

                  return { pagination, data };
                },
              });

              return tasks;
            },
          });

          return new Ok(tasks);
        },
        constrainSuccessResult: (tasks) => ({ type: 'success' as const, result: tasks }),
        getSuccessResult: (tasks) => ({
          isError: false,
          content: [{ type: 'text' as const, text: JSON.stringify(tasks) }],
        }),
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
      });
    },
  });

  return listExtractRefreshTasksTool;
};
