import { makeApi, makeEndpoint, ZodiosEndpointDefinitions } from '@zodios/core';
import { z } from 'zod';

import { paginationSchema } from '../types/pagination.js';
import { userSchema } from '../types/user.js';
import { paginationParameters } from './paginationParameters.js';

const queryUsersForSiteEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites/:siteId/users',
  alias: 'queryUsersForSite',
  description: 'Returns the users on a site.',
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
      description:
        'An expression that lets you specify a subset of users to return. You can filter on predefined fields such as name, siteRole, and lastLogin. You can include multiple filter expressions.',
    },
  ],
  response: z.object({
    pagination: paginationSchema,
    users: z.object({
      user: z.optional(z.array(userSchema)),
    }),
  }),
});

const usersApi = makeApi([queryUsersForSiteEndpoint]);

export const usersApis = [...usersApi] as const satisfies ZodiosEndpointDefinitions;
