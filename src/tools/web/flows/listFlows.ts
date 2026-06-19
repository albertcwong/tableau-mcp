import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { useRestApi } from '../../../restApiInstance.js';
import { WebMcpServer } from '../../../server.web.js';
import { paginate } from '../../../utils/paginate.js';
import { genericFilterDescription } from '../genericFilterDescription.js';
import { ConstrainedResult, WebTool } from '../tool.js';

const paramsSchema = {
  filter: z.string().optional(),
  pageSize: z.number().gt(0).optional(),
  limit: z.number().gt(0).optional(),
};

export const getListFlowsTool = (server: WebMcpServer): WebTool<typeof paramsSchema> => {
  const listFlowsTool = new WebTool({
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
    callback: async ({ filter, pageSize, limit }, extra): Promise<CallToolResult> => {
      const configWithOverrides = await extra.getConfigWithOverrides();

      return await listFlowsTool.logAndExecute({
        extra,
        args: { filter, pageSize, limit },
        callback: async () => {
          const flows = await useRestApi({
            ...extra,
            jwtScopes: listFlowsTool.requiredApiScopes,
            callback: async (restApi) => {
              const maxResultLimit = configWithOverrides.getMaxResultLimit(listFlowsTool.name);

              return await paginate({
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
            },
          });

          return new Ok(flows);
        },
        constrainSuccessResult: (
          flows: Array<Record<string, unknown>>,
        ): ConstrainedResult<Array<Record<string, unknown>>> => {
          if (flows.length === 0) {
            return {
              type: 'empty',
              message:
                'No flows were found. Either none exist or you do not have permission to view them.',
            };
          }
          return { type: 'success', result: flows };
        },
      });
    },
  });

  return listFlowsTool;
};
