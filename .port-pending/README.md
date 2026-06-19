# Port-pending tools

These are the fork's unique tools, written against the **old** tool framework
(`Tool`/`Server`/`useRestApi(restApiArgs)`). The v2.15.1 upstream merge rewrote
the framework to `WebTool`/`WebMcpServer` with an `extra`-based callback contract,
typed error classes, and a centralized API-scope registry (`src/server/oauth/scopes.ts`).

They are parked here (outside `src/`, so excluded from `tsc`/`vitest`/build) to keep
the merged base green. Each must be rewritten against the new framework before it can
be registered again. The underlying SDK support (publish/download/hyper/flows/sites
methods + apis) was already merged into `src/sdks/tableau/` and compiles, so porting is
purely the tool-layer wrapper.

## To port a tool

1. Copy an upstream web tool of similar shape (e.g. `src/tools/web/workbooks/getWorkbook.ts`)
   as the template — note `WebTool`, `WebMcpServer`, `(args, extra)`, `extra.getConfigWithOverrides()`,
   `extra.useRestApi`, error classes from `src/errors/mcpToolError.ts`.
2. Add the tool name to `src/tools/web/toolName.ts` (and a group in `webToolGroups`).
3. Add its MCP + API scopes to `src/server/oauth/scopes.ts` (`getRequiredApiScopesForTool`).
   New API scopes already exist on `JwtScopes` in `src/restApiInstance.ts`
   (workbooks:download, datasources:create, flows:*, file_uploads:create, hyper_data:update, tasks:run).
4. Register the factory in `src/tools/web/tools.ts`.
5. Move supporting utils back into `src/utils/` as needed
   (`downloadTempFile.ts`, `createHyperFromRecords.ts`).

## Inventory

| Tool dir | Tools | SDK support (already merged) |
|----------|-------|------------------------------|
| `download/` | download-workbook, download-datasource, download-flow, get-downloaded-file | `downloadWorkbookContent`, `downloadDatasourceContent`, flows download |
| `publish/` | publish-workbook, publish-datasource, publish-flow | `publishWorkbook/Datasource/Flow` + `fileUploadsMethods` |
| `updateDatasourceData/` | update-datasource-data | `updateDatasourceData` (Hyper) |
| `listFlows/` | list-flows | `flowsMethods` |
| `runFlow/` | run-flow | `flowsMethods` |
| `runExtractRefresh/` | run-extract-refresh | `tasksMethods.runExtractRefresh` |
| `sites/` | list-sites | `sitesMethods` |

`utils/`: `downloadTempFile.ts`, `createHyperFromRecords.ts` — used only by the above.
