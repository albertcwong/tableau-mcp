---
sidebar_position: 6
---

# MCP Apps

The Tableau MCP server supports [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps), enabling interactive charts and data grids in MCP-compatible hosts (Claude, ChatGPT, custom chat clients).

When enabled, `query-datasource` and `get-view-data` tools expose a `ui://` resource. Hosts that support MCP Apps can render the data as an interactive chart or table instead of plain text.

## Enabling MCP Apps

MCP Apps are **enabled automatically** when the server is built from source. The build produces `build/mcp-app/mcp-app.html`, which is served as the UI resource.

To build with MCP Apps:

```bash
npm run build
```

The MCP app UI is built as part of the main build. To build only the UI (e.g. during development):

```bash
npm run build:mcp-app
```

## Supported Tools

| Tool | UI Behavior |
|------|-------------|
| `query-datasource` | Interactive chart (bar, line, pie) or data grid with column/axis selection |
| `get-view-data` | Same chart/grid UI; data is parsed from CSV |
| `list-datasources` | Same chart/grid UI; datasource list (name, id, projectName, description) |
| `get-datasource-metadata` | Same chart/grid UI; field metadata (name, dataType, columnClass, etc.) |
| `search-content` | Same chart/grid UI; content with usage (Datasource Name, Total Views) |

## Data Format

Tool results include `structuredContent` for the UI:

```json
{
  "columns": [{ "name": "Region" }, { "name": "Sales" }],
  "rows": [
    { "Region": "West", "Sales": 1200 },
    { "Region": "East", "Sales": 980 }
  ]
}
```

The UI receives this via the host's `ui/notifications/tool-result` when the LLM calls the tool.

## Host Requirements

Your MCP client must support MCP Apps to render the UI:

- Declare support for `text/html;profile=mcp-app` in capabilities
- Fetch the `ui://tableau-mcp/data-explorer.html` resource when the tool has `_meta.ui.resourceUri`
- Render the HTML in a sandboxed iframe
- Pass tool results to the UI via notifications

See the [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps) for host implementation details.

## References

- [MCP Apps documentation](https://modelcontextprotocol.io/docs/extensions/apps)
- [ext-apps SDK](https://github.com/modelcontextprotocol/ext-apps)
