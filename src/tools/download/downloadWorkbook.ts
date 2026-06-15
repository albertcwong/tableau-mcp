import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Err, Ok } from 'ts-results-es';
import { z } from 'zod';

import { getConfig } from '../../config.js';
import { useRestApi } from '../../restApiInstance.js';
import { Server } from '../../server.js';
import { getTableauAuthInfo } from '../../server/oauth/getTableauAuthInfo.js';
import { createProductTelemetryBase } from '../../telemetry/productTelemetry/telemetryForwarder.js';
import { DownloadResult, processDownload } from '../../utils/downloadTempFile.js';
import { getConfigWithOverrides } from '../../utils/mcpSiteSettings.js';
import { resourceAccessChecker } from '../resourceAccessChecker.js';
import { Tool } from '../tool.js';
import { formatDownloadResult } from './downloadResultFormat.js';

const paramsSchema = {
  workbookId: z.string(),
  includeExtract: z.boolean().default(true).optional(),
};

export type DownloadWorkbookError = { type: 'workbook-not-allowed'; message: string };

export const getDownloadWorkbookTool = (server: Server): Tool<typeof paramsSchema> => {
  const tool = new Tool({
    server,
    name: 'download-workbook',
    description:
      'Downloads a workbook as .twbx (packaged) or .twb (when extract excluded). Use includeExtract: false for faster structure-only download. For small files, returns contentBase64 inline. For large files, returns filePath to pass to get-downloaded-file or publish-workbook. Required: workbookId (LUID).',
    paramsSchema,
    annotations: { title: 'Download Workbook', readOnlyHint: true, openWorldHint: false },
    callback: async (
      { workbookId, includeExtract },
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
      await getConfigWithOverrides({ restApiArgs });

      return await tool.logAndExecute<
        DownloadResult,
        DownloadWorkbookError
      >({
        requestId,
        sessionId,
        authInfo,
        args: { workbookId, includeExtract },
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
        callback: async () => {
          const allowed = await resourceAccessChecker.isWorkbookAllowed({
            workbookId,
            restApiArgs,
          });
          if (!allowed.allowed)
            return new Err({ type: 'workbook-not-allowed', message: allowed.message });

          const { data, filename } = await useRestApi({
            ...restApiArgs,
            jwtScopes: ['tableau:workbooks:download'],
            callback: (api) =>
              api.workbooksMethods.downloadWorkbookContent({
                siteId: api.siteId,
                workbookId,
                includeExtract: includeExtract ?? true,
              }),
          });
          return new Ok(await processDownload(filename, data));
        },
        getErrorText: (e) => e.message,
        getSuccessResult: (r: DownloadResult) => formatDownloadResult(r, 'workbook'),
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });
  return tool;
};
