import { makeApi, makeEndpoint, ZodiosEndpointDefinitions } from '@zodios/core';
import { z } from 'zod';

import { paginationParameters } from './paginationParameters.js';

const getFlowEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites/:siteId/flows/:flowId',
  alias: 'getFlow',
  description: 'Returns information about the specified flow.',
  response: z.object({ flow: z.any() }),
});

const listFlowsEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites/:siteId/flows',
  alias: 'listFlows',
  description: 'Returns a list of flows on the specified site.',
  parameters: [
    ...paginationParameters,
    {
      name: 'siteId',
      type: 'Path',
      schema: z.string(),
    },
    {
      name: 'filter',
      type: 'Query',
      schema: z.string().optional(),
      description: 'Filter string in the format field:operator:value',
    },
  ],
  response: z.any(),
});

const runFlowEndpoint = makeEndpoint({
  method: 'post',
  path: '/sites/:siteId/flows/:flowId/run',
  alias: 'runFlow',
  description: 'Runs the specified flow.',
  parameters: [
    {
      name: 'siteId',
      type: 'Path',
      schema: z.string(),
    },
    {
      name: 'flowId',
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

const flowsApi = makeApi([getFlowEndpoint, listFlowsEndpoint, runFlowEndpoint]);
export const flowsApis = [...flowsApi] as const satisfies ZodiosEndpointDefinitions;
