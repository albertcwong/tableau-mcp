import { makeApi, makeEndpoint, ZodiosEndpointDefinitions } from '@zodios/core';
import { z } from 'zod';

import { paginationSchema } from '../types/pagination.js';
import { paginationParameters } from './paginationParameters.js';

const listExtractRefreshTasksEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites/:siteId/tasks/extractRefreshes',
  alias: 'listExtractRefreshTasks',
  description: 'Returns a list of extract refresh tasks on the specified site.',
  parameters: [
    ...paginationParameters,
    {
      name: 'siteId',
      type: 'Path',
      schema: z.string(),
    },
  ],
  response: z.any(),
});

const runExtractRefreshEndpoint = makeEndpoint({
  method: 'post',
  path: '/sites/:siteId/tasks/extractRefreshes/:taskId/runNow',
  alias: 'runExtractRefresh',
  description: 'Runs the specified extract refresh task.',
  parameters: [
    {
      name: 'siteId',
      type: 'Path',
      schema: z.string(),
    },
    {
      name: 'taskId',
      type: 'Path',
      schema: z.string(),
    },
    {
      name: 'body',
      type: 'Body',
      schema: z.object({}).optional(),
    },
  ],
  response: z.any(),
});

const tasksApi = makeApi([listExtractRefreshTasksEndpoint, runExtractRefreshEndpoint]);
export const tasksApis = [...tasksApi] as const satisfies ZodiosEndpointDefinitions;
