import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { WorkbookNotAllowedError } from '../../../errors/mcpToolError.js';
import { useRestApi } from '../../../restApiInstance.js';
import { WebMcpServer } from '../../../server.web.js';
import { DownloadResult, processDownload } from '../../../utils/downloadTempFile.js';
import { resourceAccessChecker } from '../resourceAccessChecker.js';
import { WebTool } from '../tool.js';
import { formatDownloadResult } from './downloadResultFormat.js';

const paramsSchema = {
  workbookId: z.string(),
  includeExtract: z.boolean().default(true).optional(),
};

export const getDownloadWorkbookTool = (server: WebMcpServer): WebTool<typeof paramsSchema> => {
  const downloadWorkbookTool = new WebTool({
    server,
    name: 'download-workbook',
    description:
      'Downloads a workbook as .twbx (packaged) or .twb (when extract excluded). Use includeExtract: false for faster structure-only download. For small files, returns contentBase64 inline. For large files, returns filePath to pass to get-downloaded-file or publish-workbook. Required: workbookId (LUID).',
    paramsSchema,
    annotations: { title: 'Download Workbook', readOnlyHint: true, openWorldHint: false },
    callback: async ({ workbookId, includeExtract }, extra): Promise<CallToolResult> => {
      return await downloadWorkbookTool.logAndExecute<DownloadResult>({
        extra,
        args: { workbookId, includeExtract },
        callback: async () => {
          const allowed = await resourceAccessChecker.isWorkbookAllowed({
            workbookId,
            extra,
          });
          if (!allowed.allowed) {
            return new WorkbookNotAllowedError(allowed.message).toErr();
          }

          const { data, filename } = await useRestApi({
            ...extra,
            jwtScopes: downloadWorkbookTool.requiredApiScopes,
            callback: (api) =>
              api.workbooksMethods.downloadWorkbookContent({
                siteId: api.siteId,
                workbookId,
                includeExtract: includeExtract ?? true,
              }),
          });
          return new Ok(await processDownload(filename, data));
        },
        getSuccessResult: (r) => formatDownloadResult(r, 'workbook'),
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });

  return downloadWorkbookTool;
};
