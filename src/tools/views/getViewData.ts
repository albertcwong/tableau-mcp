import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Err, Ok } from 'ts-results-es';
import { z } from 'zod';

import { getConfig } from '../../config.js';

function parseCsvToStructured(csvText: string): {
  columns: Array<{ name: string }>;
  rows: Array<Record<string, string>>;
} {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { columns: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const columns = headers.map((name) => ({ name }));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
  return { columns, rows };
}
import { useRestApi } from '../../restApiInstance.js';
import { Server } from '../../server.js';
import { getTableauAuthInfo } from '../../server/oauth/getTableauAuthInfo.js';
import { createProductTelemetryBase } from '../../telemetry/productTelemetry/telemetryForwarder.js';
import { resourceAccessChecker } from '../resourceAccessChecker.js';
import { Tool } from '../tool.js';

const paramsSchema = {
  viewId: z.string(),
};

export type GetViewDataError = {
  type: 'view-not-allowed';
  message: string;
};

export const getGetViewDataTool = (server: Server): Tool<typeof paramsSchema> => {
  const getViewDataTool = new Tool({
    server,
    name: 'get-view-data',
    description:
      'Retrieves data in comma separated value (CSV) format for the specified view in a Tableau workbook.',
    paramsSchema,
    annotations: {
      title: 'Get View Data',
      readOnlyHint: true,
      openWorldHint: false,
    },
    callback: async (
      { viewId },
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

      return await getViewDataTool.logAndExecute<string, GetViewDataError>({
        requestId,
        sessionId,
        authInfo,
        args: { viewId },
        callback: async () => {
          const isViewAllowedResult = await resourceAccessChecker.isViewAllowed({
            viewId,
            restApiArgs,
          });

          if (!isViewAllowedResult.allowed) {
            return new Err({
              type: 'view-not-allowed',
              message: isViewAllowedResult.message,
            });
          }

          return new Ok(
            await useRestApi({
              ...restApiArgs,
              jwtScopes: ['tableau:views:download'],
              callback: async (restApi) => {
                return await restApi.viewsMethods.queryViewData({
                  viewId,
                  siteId: restApi.siteId,
                });
              },
            }),
          );
        },
        constrainSuccessResult: (viewData) => {
          return {
            type: 'success',
            result: viewData,
          };
        },
        getSuccessResult: (viewData) => {
          const { columns, rows } = parseCsvToStructured(viewData);
          return {
            isError: false,
            content: [{ type: 'text' as const, text: viewData }],
            structuredContent: { columns, rows },
          };
        },
        getErrorText: (error: GetViewDataError) => {
          switch (error.type) {
            case 'view-not-allowed':
              return error.message;
          }
        },
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
      });
    },
  });

  return getViewDataTool;
};
