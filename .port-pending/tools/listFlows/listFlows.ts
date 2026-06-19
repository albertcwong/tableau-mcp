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
import { genericFilterDescription } from '../genericFilterDescription.js';
import { Tool } from '../tool.js';

const paramsSchema = {
  filter: z.string().optional(),
  pageSize: z.number().gt(0).optional(),
  limit: z.number().gt(0).optional(),
};

export const getListFlowsTool = (server: Server): Tool<typeof paramsSchema> => {
  const listFlowsTool = new Tool({
    server,
    name: 'list-flows',
    description: `
  Retrieves a list of flows on a Tableau site using the Tableau REST API. Supports optional filtering via field:operator:value expressions for precise and flexible flow discovery.

  **Supported Filter Fields and Operators**
  | Field               | Operators            |
  |---------------------|----------------------|
  | name                | eq, in               |
  | projectName         | eq, in               |

  ${genericFilterDescription}

  **Example Usage:**
  - List all flows on a site
  - List flows with the name "My Flow":
      filter: "name:eq:My Flow"
  - List flows in a specific project:
      filter: "projectName:eq:Default"
  `,
    paramsSchema,
    annotations: {
      title: 'List Flows',
      readOnlyHint: true,
      openWorldHint: false,
    },
    callback: async (
      { filter, pageSize, limit },
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

      return await listFlowsTool.logAndExecute({
        requestId,
        sessionId,
        authInfo,
        args: { filter, pageSize, limit },
        callback: async () => {
          const flows = await useRestApi({
            ...restApiArgs,
            jwtScopes: ['tableau:content:read'],
            callback: async (restApi) => {
              const maxResultLimit = configWithOverrides.getMaxResultLimit(listFlowsTool.name);

              const flows = await paginate({
                pageConfig: {
                  pageSize,
                  limit: maxResultLimit
                    ? Math.min(maxResultLimit, limit ?? Number.MAX_SAFE_INTEGER)
                    : limit,
                },
                getDataFn: async (pageConfig) => {
                  const { pagination, flows: data } = await restApi.flowsMethods.listFlows({
                    siteId: restApi.siteId,
                    filter: filter ?? undefined,
                    pageSize: pageConfig.pageSize,
                    pageNumber: pageConfig.pageNumber,
                  });

                  return { pagination, data };
                },
              });

              return flows;
            },
          });

          return new Ok(flows);
        },
        constrainSuccessResult: (flows) => ({ type: 'success' as const, result: flows }),
        getSuccessResult: (flows) => ({
          isError: false,
          content: [{ type: 'text' as const, text: JSON.stringify(flows) }],
        }),
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
      });
    },
  });

  return listFlowsTool;
};
