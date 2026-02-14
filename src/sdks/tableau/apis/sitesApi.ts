import { makeApi, makeEndpoint, ZodiosEndpointDefinitions } from '@zodios/core';
import { z } from 'zod';

import { paginationSchema } from '../types/pagination.js';
import { siteSchema } from '../types/site.js';
import { paginationParameters } from './paginationParameters.js';

const querySitesEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites',
  alias: 'querySites',
  description: 'Returns a list of sites on the server.',
  parameters: [
    ...paginationParameters,
    {
      name: 'filter',
      type: 'Query',
      schema: z.string().optional(),
      description:
        'An expression that lets you specify a subset of sites to return. You can filter on predefined fields such as name. You can include multiple filter expressions.',
    },
  ],
  response: z.object({
    pagination: paginationSchema,
    sites: z.object({
      site: z.optional(z.array(siteSchema)),
    }),
  }),
});

const sitesApi = makeApi([querySitesEndpoint]);

export const sitesApis = [...sitesApi] as const satisfies ZodiosEndpointDefinitions;
