import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { DatasourceNotAllowedError } from '../../../errors/mcpToolError.js';
import { useRestApi } from '../../../restApiInstance.js';
import { WebMcpServer } from '../../../server.web.js';
import { DownloadResult, processDownload } from '../../../utils/downloadTempFile.js';
import { resourceAccessChecker } from '../resourceAccessChecker.js';
import { WebTool } from '../tool.js';
import { formatDownloadResult } from './downloadResultFormat.js';

const paramsSchema = {
  datasourceId: z.string(),
  includeExtract: z.boolean().default(true).optional(),
};

export const getDownloadDatasourceTool = (server: WebMcpServer): WebTool<typeof paramsSchema> => {
  const downloadDatasourceTool = new WebTool({
    server,
    name: 'download-datasource',
    description:
      'Downloads a datasource as .tdsx. Use includeExtract: false for faster structure-only download. For small files, returns contentBase64 inline. For large files, returns filePath to pass to get-downloaded-file or publish-datasource. Required: datasourceId (LUID).',
    paramsSchema,
    annotations: { title: 'Download Datasource', readOnlyHint: true, openWorldHint: false },
    callback: async ({ datasourceId, includeExtract }, extra): Promise<CallToolResult> => {
      return await downloadDatasourceTool.logAndExecute<DownloadResult>({
        extra,
        args: { datasourceId, includeExtract },
        callback: async () => {
          const allowed = await resourceAccessChecker.isDatasourceAllowed({
            datasourceLuid: datasourceId,
            extra,
          });
          if (!allowed.allowed) {
            return new DatasourceNotAllowedError(allowed.message).toErr();
          }

          const { data, filename } = await useRestApi({
            ...extra,
            jwtScopes: downloadDatasourceTool.requiredApiScopes,
            callback: (api) =>
              api.datasourcesMethods.downloadDatasourceContent({
                siteId: api.siteId,
                datasourceId,
                includeExtract: includeExtract ?? true,
              }),
          });
          return new Ok(await processDownload(filename, data));
        },
        getSuccessResult: (r) => formatDownloadResult(r, 'datasource'),
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });

  return downloadDatasourceTool;
};
