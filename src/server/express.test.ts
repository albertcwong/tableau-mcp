import { LoggingLevel } from '@modelcontextprotocol/sdk/types.js';

import { exportedForTesting as expressExportedForTesting } from './express.js';

const { connect } = expressExportedForTesting;

describe('express server connection', () => {
  it('registers tools before connecting the transport', async () => {
    const server = {
      registerRequestHandlers: vi.fn(),
      registerTools: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn().mockResolvedValue(undefined),
    };
    const transport = {} as any;

    await connect(server as any, transport, 'debug' satisfies LoggingLevel, undefined);

    expect(server.registerRequestHandlers).toHaveBeenCalledOnce();
    expect(server.registerTools).toHaveBeenCalledWith(undefined);
    expect(server.connect).toHaveBeenCalledWith(transport);
    expect(server.registerRequestHandlers.mock.invocationCallOrder[0]).toBeLessThan(
      server.registerTools.mock.invocationCallOrder[0],
    );
    expect(server.registerTools.mock.invocationCallOrder[0]).toBeLessThan(
      server.connect.mock.invocationCallOrder[0],
    );
  });
});
