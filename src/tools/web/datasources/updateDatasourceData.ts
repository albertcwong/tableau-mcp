import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { ArgsValidationError, UnknownError } from '../../../errors/mcpToolError.js';
import { useRestApi } from '../../../restApiInstance.js';
import { APPEND_CHUNK_MAX_BYTES } from '../../../sdks/tableau/utils/publishMultipart.js';
import { WebMcpServer } from '../../../server.web.js';
import { WebTool } from '../tool.js';

const actionSchema = z
  .object({
    action: z.enum(['insert', 'update', 'delete', 'upsert', 'replace']),
    'source-table': z.string().optional(),
    'target-table': z.string(),
    'source-schema': z.string().optional(),
    'target-schema': z.string().optional(),
    condition: z.record(z.unknown()).optional(),
  })
  .passthrough();

const columnSchema = z.object({
  name: z.string(),
  type: z.enum(['text', 'double', 'date', 'bool', 'int']),
  nullable: z.boolean().optional(),
});

const paramsSchema = {
  datasourceId: z.string(),
  actions: z.array(actionSchema),
  payloadHyperBase64: z.string().optional(),
  records: z.array(z.record(z.unknown())).optional(),
  columns: z.array(columnSchema).optional(),
  tableName: z.string().optional(),
  schemaName: z.string().optional(),
  sourceTables: z.array(z.string()).optional(),
  connectionId: z.string().optional(),
};

type UpdateResult = { jobId: string };

export const getUpdateDatasourceDataTool = (server: WebMcpServer): WebTool<typeof paramsSchema> => {
  const updateDatasourceDataTool = new WebTool({
    server,
    name: 'update-datasource-data',
    description:
      'Incrementally updates data in a published live-to-Hyper datasource. Accepts either payloadHyperBase64 (pre-built .hyper file) or records + columns (JSON records with column schema — the tool builds the .hyper file internally). Requires datasourceId and actions (per Tableau spec). Returns jobId; re-query the datasource after a short delay to confirm write success.',
    paramsSchema,
    annotations: { title: 'Update Datasource Data', readOnlyHint: false, openWorldHint: false },
    callback: async (
      {
        datasourceId,
        actions,
        payloadHyperBase64,
        records,
        columns,
        tableName,
        schemaName,
        sourceTables,
        connectionId,
      },
      extra,
    ): Promise<CallToolResult> => {
      return await updateDatasourceDataTool.logAndExecute<UpdateResult>({
        extra,
        args: {
          datasourceId,
          actions,
          payloadHyperBase64,
          records,
          columns,
          tableName,
          schemaName,
          sourceTables,
          connectionId,
        },
        callback: async () => {
          if (actions.length === 0) {
            return new ArgsValidationError('actions must not be empty.').toErr();
          }

          if (!payloadHyperBase64 && (!records || !columns)) {
            return new ArgsValidationError(
              'Provide either payloadHyperBase64 or both records and columns.',
            ).toErr();
          }

          if (sourceTables) {
            for (const a of actions) {
              const st = a['source-table'];
              if (st && !sourceTables.includes(st)) {
                return new ArgsValidationError(
                  `Action source-table "${st}" not in sourceTables [${sourceTables.join(', ')}].`,
                ).toErr();
              }
            }
          }

          let hyperBase64 = payloadHyperBase64;
          if (!hyperBase64 && records && columns) {
            try {
              const { createHyperFromRecords } =
                await import('../../../utils/createHyperFromRecords.js');
              hyperBase64 = await createHyperFromRecords({
                tableName: tableName ?? 'Extract',
                schemaName: schemaName ?? 'Extract',
                columns,
                records,
              });
            } catch (err) {
              return new UnknownError(
                `Failed to create Hyper file from records: ${
                  err instanceof Error ? err.message : String(err)
                }`,
              ).toErr();
            }
          }

          const result = await useRestApi({
            ...extra,
            jwtScopes: updateDatasourceDataTool.requiredApiScopes,
            callback: async (api) => {
              const fileContent = Buffer.from(hyperBase64!, 'base64');
              const uploadSessionId = await api.fileUploadsMethods.initiateFileUpload({
                siteId: api.siteId,
              });
              const chunks = Math.ceil(fileContent.length / APPEND_CHUNK_MAX_BYTES);
              const filename = 'payload.hyper';
              for (let i = 0; i < chunks; i++) {
                const start = i * APPEND_CHUNK_MAX_BYTES;
                const chunk = fileContent.subarray(
                  start,
                  Math.min(start + APPEND_CHUNK_MAX_BYTES, fileContent.length),
                );
                await api.fileUploadsMethods.appendToFileUpload({
                  siteId: api.siteId,
                  uploadSessionId,
                  sequenceId: i + 1,
                  filename,
                  fileContent: chunk,
                });
              }
              const { jobId } = await api.datasourcesMethods.updateDatasourceData({
                siteId: api.siteId,
                datasourceId,
                connectionId,
                uploadSessionId,
                actions: actions as Array<Record<string, unknown>>,
                requestId: extra.requestId.toString(),
              });
              return { jobId };
            },
          });
          return new Ok(result);
        },
        constrainSuccessResult: (r) => ({
          type: 'success' as const,
          result: r,
        }),
      });
    },
  });

  return updateDatasourceDataTool;
};
