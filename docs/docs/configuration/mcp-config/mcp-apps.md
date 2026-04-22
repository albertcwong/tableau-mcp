---
sidebar_position: 6
---

# MCP Apps

The Tableau MCP server supports [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps), enabling interactive charts and data grids in MCP-compatible hosts (Claude, ChatGPT, custom chat clients).

When enabled, tools expose `ui://` resources. Hosts that support MCP Apps render the data as interactive UIs instead of plain text.

## Enabling MCP Apps

MCP Apps are **enabled automatically** when the server is built from source. The build produces `build/mcp-app/chart-explorer.html` and `build/mcp-app/content-browser.html`.

To build with MCP Apps:

```bash
npm run build
```

The MCP app UI is built as part of the main build. To build only the UI (e.g. during development):

```bash
npm run build:mcp-app
```

## Supported Tools

| Tool | UI Resource | UI Behavior |
|------|-------------|-------------|
| `query-datasource` | `chart-explorer.html` | Interactive chart (bar, line, pie) or data grid with column/axis selection |
| `get-view-data` | `chart-explorer.html` | Same chart/grid UI; data is parsed from CSV |
| `list-datasources` | `content-browser.html` | Table only; datasource list (name, id, projectName, description) |
| `get-datasource-metadata` | `content-browser.html` | Table only; field metadata (name, dataType, columnClass, etc.) |
| `search-content` | `content-browser.html` | Table only; content with usage (Datasource Name, Total Views) |

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
- Fetch the `ui://tableau-mcp/chart-explorer.html` or `ui://tableau-mcp/content-browser.html` resource when the tool has `_meta.ui.resourceUri`
- Render the HTML in a sandboxed iframe
- Pass tool results to the UI via notifications

See the [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps) for host implementation details.

## References

- [MCP Apps documentation](https://modelcontextprotocol.io/docs/extensions/apps)
- [ext-apps SDK](https://github.com/modelcontextprotocol/ext-apps)
