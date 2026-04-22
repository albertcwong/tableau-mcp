/**
 * Tableau MCP Apps - Content Browser UI
 * Renders tabular data from list-datasources, get-datasource-metadata, and search-content as table only.
 */
import { App, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { extractStructuredData } from './shared/dataExtraction.js';

const state = { columns: [] as Array<{ name: string }>, rows: [] as Array<Record<string, unknown>> };

function renderTable(): void {
  const { columns, rows } = state;
  const container = document.getElementById('table-container');
  if (!container) return;
  container.replaceChildren();
  if (!rows.length) return;
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const h of columns.map((c) => c.name)) {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  for (const r of rows) {
    const tr = document.createElement('tr');
    for (const h of columns.map((c) => c.name)) {
      const td = document.createElement('td');
      td.textContent = String(r[h] ?? '');
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}

function updateUI(): void {
  const { rows } = state;
  const empty = document.getElementById('empty');
  const tableContainer = document.getElementById('table-container');
  if (empty) empty.style.display = rows.length ? 'none' : 'block';
  if (tableContainer) tableContainer.style.display = rows.length ? 'block' : 'none';
  renderTable();
}

const app = new App({ name: 'Tableau Content Browser', version: '1.0.0' });

app.ontoolinput = () => {
  // Refresh tool context from host; available for future tool-aware rendering
  void app.getHostContext();
};

app.ontoolresult = (result: unknown) => {
  const data = extractStructuredData(result);
  if (data) {
    state.columns = data.columns;
    state.rows = data.rows;
    updateUI();
  }
};

const applyHostContext = (ctx: unknown): void => {
  const c = ctx as { theme?: unknown; styles?: { variables?: unknown; css?: { fonts?: unknown } } };
  if (c?.theme) applyDocumentTheme(c.theme);
  if (c?.styles?.variables) applyHostStyleVariables(c.styles!.variables as Record<string, string>);
  if (c?.styles?.css?.fonts) applyHostFonts(c.styles!.css!.fonts as string);
};
app.onhostcontextchanged = applyHostContext;

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) applyHostContext(ctx);
});
