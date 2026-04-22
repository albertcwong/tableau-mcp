import { makeApi, ZodiosEndpointDefinitions } from '@zodios/core';

const fileUploadsApi = makeApi([]);
export const fileUploadsApis = [...fileUploadsApi] as const satisfies ZodiosEndpointDefinitions;
