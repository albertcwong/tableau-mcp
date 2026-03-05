import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { getConfig } from '../../config.js';
import { useRestApi } from '../../restApiInstance.js';
import { Server } from '../../server.js';
import { getTableauAuthInfo } from '../../server/oauth/getTableauAuthInfo.js';
import { createProductTelemetryBase } from '../../telemetry/productTelemetry/telemetryForwarder.js';
import { getConfigWithOverrides } from '../../utils/mcpSiteSettings.js';
import { resourceAccessChecker } from '../resourceAccessChecker.js';
import { Tool } from '../tool.js';
import {
  extractInnerXml,
  parseWorkbookXml,
} from './inspectUtils.js';

const paramsSchema = {
  workbookId: z.string().optional(),
  contentBase64: z.string().optional(),
  includeExtract: z.boolean().default(true).optional(),
};

export const getInspectWorkbookFileTool = (server: Server): Tool<typeof paramsSchema> => {
  const tool = new Tool({
    server,
    name: 'inspect-workbook-file',
    description:
      'Parses a workbook file (.twbx or .twb) and returns structured inspection: sheets, dashboards, dataSources. When using workbookId, pass includeExtract: false for faster structure-only fetch.',
    paramsSchema,
    annotations: { title: 'Inspect Workbook File', readOnlyHint: true, openWorldHint: false },
    callback: async (
      { workbookId, contentBase64, includeExtract },
      { requestId, sessionId, authInfo, signal },
    ): Promise<CallToolResult> => {
      if (!workbookId && !contentBase64) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'One of workbookId or contentBase64 is required.' }],
        };
      }
      const config = getConfig();
      const restApiArgs = {
        config,
        requestId,
        server,
        signal,
        authInfo: getTableauAuthInfo(authInfo),
      };
      await getConfigWithOverrides({ restApiArgs });

      return await tool.logAndExecute<ReturnType<typeof parseWorkbookXml>>({
        requestId,
        sessionId,
        authInfo,
        args: { workbookId, contentBase64, includeExtract },
        productTelemetryBase: createProductTelemetryBase(config, authInfo),
        callback: async () => {
          let xml: string;
          if (contentBase64) {
            const buf = Buffer.from(contentBase64, 'base64');
            xml = buf[0] === 0x50 && buf[1] === 0x4b
              ? extractInnerXml(buf, '.twb')
              : buf.toString('utf8');
          } else {
            const allowed = await resourceAccessChecker.isWorkbookAllowed({
              workbookId: workbookId!,
              restApiArgs,
            });
            if (!allowed.allowed) throw new Error(allowed.message);
            const { data } = await useRestApi({
              ...restApiArgs,
              jwtScopes: ['tableau:workbooks:download'],
              callback: (api) =>
                api.workbooksMethods.downloadWorkbookContent({
                  siteId: api.siteId,
                  workbookId: workbookId!,
                  includeExtract: includeExtract ?? true,
                }),
            });
            const buf = Buffer.from(data);
            xml = buf[0] === 0x50 && buf[1] === 0x4b
              ? extractInnerXml(buf, '.twb')
              : buf.toString('utf8');
          }
          return new Ok(parseWorkbookXml(xml));
        },
        constrainSuccessResult: (r) => ({ type: 'success' as const, result: r }),
      });
    },
  });
  return tool;
};
