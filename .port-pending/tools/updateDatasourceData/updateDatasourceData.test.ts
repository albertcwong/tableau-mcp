import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { Server } from '../../server.js';
import invariant from '../../utils/invariant.js';
import { Provider } from '../../utils/provider.js';
import { getUpdateDatasourceDataTool } from './updateDatasourceData.js';

const mocks = vi.hoisted(() => ({
  mockInitiateFileUpload: vi.fn(),
  mockAppendToFileUpload: vi.fn(),
  mockUpdateDatasourceData: vi.fn(),
}));

vi.mock('../../restApiInstance.js', () => ({
  useRestApi: vi.fn().mockImplementation(async ({ callback }) =>
    callback({
      siteId: 'test-site-id',
      fileUploadsMethods: {
        initiateFileUpload: mocks.mockInitiateFileUpload,
        appendToFileUpload: mocks.mockAppendToFileUpload,
      },
      datasourcesMethods: {
        updateDatasourceData: mocks.mockUpdateDatasourceData,
      },
    }),
  ),
}));

vi.mock('../../utils/mcpSiteSettings.js', () => ({
  getConfigWithOverrides: vi.fn().mockResolvedValue(undefined),
}));

describe('updateDatasourceDataTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockInitiateFileUpload.mockResolvedValue('upload-session-123');
    mocks.mockAppendToFileUpload.mockResolvedValue(undefined);
    mocks.mockUpdateDatasourceData.mockResolvedValue({ jobId: 'job-456' });
  });

  it('should create a tool instance with correct properties', () => {
    const tool = getUpdateDatasourceDataTool(new Server());
    expect(tool.name).toBe('update-datasource-data');
    expect(tool.description).toContain('Incrementally updates data');
    expect(tool.paramsSchema).toMatchObject({
      datasourceId: expect.any(Object),
      actions: expect.any(Object),
      payloadHyperBase64: expect.any(Object),
    });
  });

  it('should return error when actions is empty', async () => {
    const result = await getToolResult({
      datasourceId: 'ds-1',
      actions: [],
      payloadHyperBase64: Buffer.from('hyper').toString('base64'),
    });
    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('actions must not be empty');
    expect(mocks.mockUpdateDatasourceData).not.toHaveBeenCalled();
  });

  it('should return error when source-table not in sourceTables', async () => {
    const result = await getToolResult({
      datasourceId: 'ds-1',
      actions: [{ action: 'insert', 'source-table': 'unknown', 'target-table': 'Extract' }],
      payloadHyperBase64: Buffer.from('hyper').toString('base64'),
      sourceTables: ['payload'],
    });
    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('source-table "unknown" not in sourceTables');
    expect(mocks.mockUpdateDatasourceData).not.toHaveBeenCalled();
  });

  it('should successfully update datasource data', async () => {
    const result = await getToolResult({
      datasourceId: 'ds-1',
      actions: [{ action: 'insert', 'source-table': 'new_rows', 'target-table': 'Extract' }],
      payloadHyperBase64: Buffer.from('hyper').toString('base64'),
    });
    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.jobId).toBe('job-456');
    expect(parsed.message).toContain('Re-query the datasource');
    expect(mocks.mockInitiateFileUpload).toHaveBeenCalledWith({ siteId: 'test-site-id' });
    expect(mocks.mockAppendToFileUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: 'test-site-id',
        uploadSessionId: 'upload-session-123',
        sequenceId: 1,
        filename: 'payload.hyper',
      }),
    );
    expect(mocks.mockUpdateDatasourceData).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: 'test-site-id',
        datasourceId: 'ds-1',
        uploadSessionId: 'upload-session-123',
        actions: [{ action: 'insert', 'source-table': 'new_rows', 'target-table': 'Extract' }],
      }),
    );
  });

  it('should pass connectionId for multi-connection datasources', async () => {
    await getToolResult({
      datasourceId: 'ds-1',
      actions: [{ action: 'insert', 'source-table': 'new_rows', 'target-table': 'Extract' }],
      payloadHyperBase64: Buffer.from('hyper').toString('base64'),
      connectionId: 'conn-789',
    });
    expect(mocks.mockUpdateDatasourceData).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: 'conn-789' }),
    );
  });

  it('should handle API errors gracefully', async () => {
    mocks.mockUpdateDatasourceData.mockRejectedValue(new Error('Datasource not found'));
    const result = await getToolResult({
      datasourceId: 'ds-1',
      actions: [{ action: 'insert', 'source-table': 'new_rows', 'target-table': 'Extract' }],
      payloadHyperBase64: Buffer.from('hyper').toString('base64'),
    });
    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('Datasource not found');
  });
});

async function getToolResult(params: {
  datasourceId: string;
  actions: Array<Record<string, unknown>>;
  payloadHyperBase64: string;
  sourceTables?: string[];
  connectionId?: string;
}): Promise<CallToolResult> {
  const tool = getUpdateDatasourceDataTool(new Server());
  const callback = await Provider.from(tool.callback);
  return await callback(
    {
      datasourceId: params.datasourceId,
      actions: params.actions,
      payloadHyperBase64: params.payloadHyperBase64,
      sourceTables: params.sourceTables,
      connectionId: params.connectionId,
    },
    {
      signal: new AbortController().signal,
      requestId:
        'test-request-id' as unknown as import('@modelcontextprotocol/sdk/types.js').RequestId,
      sendNotification: vi.fn(),
      sendRequest: vi.fn(),
    },
  );
}
