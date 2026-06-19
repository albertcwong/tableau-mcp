import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { ArgsValidationError } from '../../../errors/mcpToolError.js';
import { useRestApi } from '../../../restApiInstance.js';
import { WebMcpServer } from '../../../server.web.js';
import { readDownloadedFile } from '../../../utils/downloadTempFile.js';
import { WebTool } from '../tool.js';

const paramsSchema = {
  projectId: z.string(),
  name: z.string(),
  contentBase64: z.string().optional(),
  filePath: z.string().optional(),
  uploadSessionId: z.string().optional(),
  overwrite: z.boolean().default(false).optional(),
};

export const getPublishWorkbookTool = (server: WebMcpServer): WebTool<typeof paramsSchema> => {
  const publishWorkbookTool = new WebTool({
    server,
    name: 'publish-workbook',
    description:
      'Publishes a workbook to a project. Use when the agent needs to publish a .twbx file. Requires projectId, name, and one of: filePath (from download-workbook), contentBase64 (inline), or uploadSessionId (for large files). Overwrite=true to replace existing same-name workbook. Returns published workbook metadata.',
    paramsSchema,
    annotations: { title: 'Publish Workbook', readOnlyHint: false, openWorldHint: false },
    callback: async (
      { projectId, name, contentBase64, filePath, uploadSessionId, overwrite },
      extra,
    ): Promise<CallToolResult> => {
      return await publishWorkbookTool.logAndExecute<Record<string, string>>({
        extra,
        args: { projectId, name, contentBase64, filePath, uploadSessionId, overwrite },
        callback: async () => {
          if (!contentBase64 && !filePath && !uploadSessionId) {
            return new ArgsValidationError(
              'One of filePath, contentBase64, or uploadSessionId is required. For files >64MB use upload session.',
            ).toErr();
          }

          let resolvedContentBase64 = contentBase64;
          if (filePath && !resolvedContentBase64) {
            const buf = await readDownloadedFile(filePath);
            resolvedContentBase64 = buf.toString('base64');
          }

          const meta = await useRestApi({
            ...extra,
            jwtScopes: publishWorkbookTool.requiredApiScopes,
            callback: (api) =>
              api.workbooksMethods.publishWorkbook({
                siteId: api.siteId,
                projectId,
                name,
                contentBase64: resolvedContentBase64,
                uploadSessionId,
                overwrite,
              }),
          });
          return new Ok(meta);
        },
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });

  return publishWorkbookTool;
};
