import { makeApi, makeEndpoint, ZodiosEndpointDefinitions } from '@zodios/core';
import { z } from 'zod';

const getFlowEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites/:siteId/flows/:flowId',
  alias: 'getFlow',
  description: 'Returns information about the specified flow.',
  response: z.object({ flow: z.any() }),
});

const flowsApi = makeApi([getFlowEndpoint]);
export const flowsApis = [...flowsApi] as const satisfies ZodiosEndpointDefinitions;
