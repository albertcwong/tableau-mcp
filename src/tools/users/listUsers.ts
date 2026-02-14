import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { getConfig } from '../../config.js';
import { useRestApi } from '../../restApiInstance.js';
import { User } from '../../sdks/tableau/types/user.js';
import { Server } from '../../server.js';
import { getTableauAuthInfo } from '../../server/oauth/getTableauAuthInfo.js';
import { createProductTelemetryBase } from '../../telemetry/productTelemetry/telemetryForwarder.js';
import { getConfigWithOverrides } from '../../utils/mcpSiteSettings.js';
import { paginate } from '../../utils/paginate.js';
import { genericFilterDescription } from '../genericFilterDescription.js';
import { ConstrainedResult, Tool } from '../tool.js';
import { parseAndValidateUsersFilterString } from './usersFilterUtils.js';

const paramsSchema = {
  filter: z.string().optional(),
  pageSize: z.number().gt(0).optional(),
  limit: z.number().gt(0).optional(),
};

export const getListUsersTool = (server: Server): Tool<typeof paramsSchema> => {
  const listUsersTool = new Tool({
    server,
    name: 'list-users',
    description: `
  Retrieves a list of users on a Tableau site using the Tableau REST API. Supports optional filtering via field:operator:value expressions (e.g., siteRole:eq:Viewer) for precise and flexible user discovery. Use this tool when a user requests to list, search, or filter Tableau users on a site.

  **Supported Filter Fields and Operators**
  | Field               | Operators            |
  |---------------------|----------------------|
  | name                | eq, in               |
  | siteRole            | eq, in               |
  | lastLogin           | eq, gt, gte, lt, lte |
  | externalAuthUserId  | eq, in               |
  | authSetting         | eq, in               |

  ${genericFilterDescription}

  **Example Usage:**
  - List all users on a site
  - List users with the site role "Viewer":
      filter: "siteRole:eq:Viewer"
  - List users with the name "John":
      filter: "name:eq:John"
  - List users who logged in after January 1, 2023:
      filter: "lastLogin:gt:2023-01-01T00:00:00Z"
  - List users with the site role "Viewer" and name "John":
      filter: "siteRole:eq:Viewer,name:eq:John"
  `,
    paramsSchema,
    annotations: {
      title: 'List Users',
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

      const validatedFilter = filter ? parseAndValidateUsersFilterString(filter) : undefined;

      return await listUsersTool.logAndExecute({
        requestId,
        sessionId,
        authInfo,
        args: { filter, pageSize, limit },
        callback: async () => {
          return new Ok(
            await useRestApi({
              ...restApiArgs,
              jwtScopes: ['tableau:users:read'],
              callback: async (restApi) => {
                const maxResultLimit = configWithOverrides.getMaxResultLimit(listUsersTool.name);

                const users = await paginate({
                  pageConfig: {
                    pageSize,
                    limit: maxResultLimit
                      ? Math.min(maxResultLimit, limit ?? Number.MAX_SAFE_INTEGER)
                      : limit,
                  },
                  getDataFn: async (pageConfig) => {
                    const { pagination, users: data } =
                      await restApi.usersMethods.queryUsersForSite({
                        siteId: restApi.siteId,
                        filter: validatedFilter ?? '',
                        pageSize: pageConfig.pageSize,
                        pageNumber: pageConfig.pageNumber,
                      });

                    return { pagination, data };
                  },
                });

                return users;
              },
            }),
          );
        },
        constrainSuccessResult: (users) =>
          constrainUsers({ users, boundedContext: configWithOverrides.boundedContext }),
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
      });
    },
  });

  return listUsersTool;
};

export function constrainUsers({
  users,
  boundedContext: _boundedContext,
}: {
  users: Array<User>;
  boundedContext: any;
}): ConstrainedResult<Array<User>> {
  if (users.length === 0) {
    return {
      type: 'empty',
      message: 'No users were found. Either none exist or you do not have permission to view them.',
    };
  }

  // Users don't have project/tag constraints like datasources/workbooks
  // but we keep the structure consistent for potential future constraints
  return {
    type: 'success',
    result: users,
  };
}
