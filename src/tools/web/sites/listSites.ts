import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { useRestApi } from '../../../restApiInstance.js';
import { Site } from '../../../sdks/tableau/types/site.js';
import { WebMcpServer } from '../../../server.web.js';
import { paginate } from '../../../utils/paginate.js';
import { genericFilterDescription } from '../genericFilterDescription.js';
import { ConstrainedResult, WebTool } from '../tool.js';

const paramsSchema = {
  filter: z.string().optional(),
  pageSize: z.number().gt(0).optional(),
  limit: z.number().gt(0).optional(),
};

export const getListSitesTool = (server: WebMcpServer): WebTool<typeof paramsSchema> => {
  const listSitesTool = new WebTool({
    server,
    name: 'list-sites',
    description: `
  Retrieves a list of sites on a Tableau server using the Tableau REST API. Supports optional filtering via field:operator:value expressions (e.g., name:eq:MySite) for precise and flexible site discovery. Use this tool when a user requests to list, search, or filter Tableau sites on a server.

  **Supported Filter Fields and Operators**
  | Field               | Operators            |
  |---------------------|----------------------|
  | name                | eq, in               |

  ${genericFilterDescription}

  **Example Usage:**
  - List all sites on a server
  - List sites with the name "MySite":
      filter: "name:eq:MySite"
  - List sites with names "Site1" or "Site2":
      filter: "name:in:[Site1,Site2]"
  `,
    paramsSchema,
    annotations: {
      title: 'List Sites',
      readOnlyHint: true,
      openWorldHint: false,
    },
    callback: async ({ filter, pageSize, limit }, extra): Promise<CallToolResult> => {
      const configWithOverrides = await extra.getConfigWithOverrides();

      return await listSitesTool.logAndExecute({
        extra,
        args: { filter, pageSize, limit },
        callback: async () => {
          return new Ok(
            await useRestApi({
              ...extra,
              jwtScopes: listSitesTool.requiredApiScopes,
              callback: async (restApi) => {
                const maxResultLimit = configWithOverrides.getMaxResultLimit(listSitesTool.name);

                return await paginate({
                  pageConfig: {
                    pageSize,
                    limit: maxResultLimit
                      ? Math.min(maxResultLimit, limit ?? Number.MAX_SAFE_INTEGER)
                      : limit,
                  },
                  getDataFn: async (pageConfig) => {
                    const { pagination, sites: data } = await restApi.sitesMethods.querySites({
                      filter: filter ?? undefined,
                      pageSize: pageConfig.pageSize,
                      pageNumber: pageConfig.pageNumber,
                    });

                    return { pagination, data };
                  },
                });
              },
            }),
          );
        },
        constrainSuccessResult: (sites): ConstrainedResult<Array<Site>> => {
          if (sites.length === 0) {
            return {
              type: 'empty',
              message:
                'No sites were found. Either none exist or you do not have permission to view them.',
            };
          }
          return { type: 'success', result: sites };
        },
      });
    },
  });

  return listSitesTool;
};
