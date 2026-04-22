import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { getConfig } from '../../config.js';
import { BoundedContext } from '../../overridableConfig.js';
import { useRestApi } from '../../restApiInstance.js';
import { Project } from '../../sdks/tableau/types/project.js';
import { Server } from '../../server.js';
import { getTableauAuthInfo } from '../../server/oauth/getTableauAuthInfo.js';
import { createProductTelemetryBase } from '../../telemetry/productTelemetry/telemetryForwarder.js';
import { getConfigWithOverrides } from '../../utils/mcpSiteSettings.js';
import { paginate } from '../../utils/paginate.js';
import { genericFilterDescription } from '../genericFilterDescription.js';
import { ConstrainedResult, Tool } from '../tool.js';

const paramsSchema = {
  filter: z.string().optional(),
  pageSize: z.number().gt(0).optional(),
  limit: z.number().gt(0).optional(),
};

export const getListProjectsTool = (server: Server): Tool<typeof paramsSchema> => {
  const listProjectsTool = new Tool({
    server,
    name: 'list-projects',
    description: `
  Retrieves a list of projects on a Tableau site using the Tableau REST API. Supports optional filtering via field:operator:value expressions (e.g., name:eq:Default) for precise and flexible project discovery. Use this tool when a user requests to list, search, or filter Tableau projects on a site, or when you need to resolve a project name to its ID (e.g., for publishing).

  **Supported Filter Fields and Operators**
  | Field               | Operators            |
  |---------------------|----------------------|
  | name                | eq, in               |
  | topLevelProject     | eq                   |

  ${genericFilterDescription}

  **Example Usage:**
  - List all projects on a site
  - List projects with the name "Default":
      filter: "name:eq:Default"
  - List projects with names "Finance" or "Marketing":
      filter: "name:in:[Finance,Marketing]"
  - List only top-level projects:
      filter: "topLevelProject:eq:true"
  `,
    paramsSchema,
    annotations: {
      title: 'List Projects',
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

      return await listProjectsTool.logAndExecute({
        requestId,
        sessionId,
        authInfo,
        args: { filter, pageSize, limit },
        callback: async () => {
          const projects = await useRestApi({
            ...restApiArgs,
            jwtScopes: ['tableau:content:read'],
            callback: async (restApi) => {
              const maxResultLimit = configWithOverrides.getMaxResultLimit(listProjectsTool.name);

              const projects = await paginate({
                pageConfig: {
                  pageSize,
                  limit: maxResultLimit
                    ? Math.min(maxResultLimit, limit ?? Number.MAX_SAFE_INTEGER)
                    : limit,
                },
                getDataFn: async (pageConfig) => {
                  const { pagination, projects: data } =
                    await restApi.projectsMethods.listProjects({
                      siteId: restApi.siteId,
                      filter: filter ?? undefined,
                      pageSize: pageConfig.pageSize,
                      pageNumber: pageConfig.pageNumber,
                    });

                  return { pagination, data };
                },
              });

              return projects;
            },
          });

          return new Ok(projects);
        },
        constrainSuccessResult: (projects) =>
          constrainProjects({ projects, boundedContext: configWithOverrides.boundedContext }),
        getSuccessResult: (projects) => {
          const rows = projects.map((p) => ({
            name: p.name,
            id: p.id,
            parentProjectId: p.parentProjectId ?? '',
            path: p.path ?? '',
          }));
          const columns = rows[0]
            ? Object.keys(rows[0]).map((name) => ({ name }))
            : [{ name: 'name' }, { name: 'id' }, { name: 'parentProjectId' }, { name: 'path' }];
          return {
            isError: false,
            content: [{ type: 'text' as const, text: JSON.stringify(projects) }],
            structuredContent: { columns, rows },
          };
        },
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
      });
    },
  });

  return listProjectsTool;
};

export function constrainProjects({
  projects,
  boundedContext,
}: {
  projects: Array<Project>;
  boundedContext: BoundedContext;
}): ConstrainedResult<Array<Project>> {
  if (projects.length === 0) {
    return {
      type: 'empty',
      message:
        'No projects were found. Either none exist or you do not have permission to view them.',
    };
  }

  const { projectIds } = boundedContext;
  if (projectIds) {
    projects = projects.filter((project) => projectIds.has(project.id));
  }

  if (projects.length === 0) {
    return {
      type: 'empty',
      message: [
        'The set of allowed projects that can be queried is limited by the server configuration.',
        'While projects were found, they were all filtered out by the server configuration.',
      ].join(' '),
    };
  }

  return {
    type: 'success',
    result: projects,
  };
}
