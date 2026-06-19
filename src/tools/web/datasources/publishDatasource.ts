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
  append: z.boolean().default(false).optional(),
};

export const getPublishDatasourceTool = (server: WebMcpServer): WebTool<typeof paramsSchema> => {
  const publishDatasourceTool = new WebTool({
    server,
    name: 'publish-datasource',
    description:
      'Publishes a datasource to a project. Use when the agent needs to publish a .tdsx file. Requires projectId, name, and one of: filePath (from download-datasource), contentBase64, or uploadSessionId. Overwrite/append for extract. Returns published datasource metadata.',
    paramsSchema,
    annotations: { title: 'Publish Datasource', readOnlyHint: false, openWorldHint: false },
    callback: async (
      { projectId, name, contentBase64, filePath, uploadSessionId, overwrite, append },
      extra,
    ): Promise<CallToolResult> => {
      return await publishDatasourceTool.logAndExecute<Record<string, string>>({
        extra,
        args: { projectId, name, contentBase64, filePath, uploadSessionId, overwrite, append },
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
            jwtScopes: publishDatasourceTool.requiredApiScopes,
            callback: (api) =>
              api.datasourcesMethods.publishDatasource({
                siteId: api.siteId,
                projectId,
                name,
                contentBase64: resolvedContentBase64,
                uploadSessionId,
                overwrite,
                append,
              }),
          });
          return new Ok(meta);
        },
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });

  return publishDatasourceTool;
};
