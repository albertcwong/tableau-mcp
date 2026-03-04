/**
 * Tableau MCP Apps - Data Explorer UI
 * Renders tabular data from query-datasource and get-view-data as interactive charts.
 */
import { App, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const state = { columns: [], rows: [], chart: null };

function parseCsvToStructured(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { columns: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const columns = headers.map((name) => ({ name }));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
  return { columns, rows };
}

function extractStructuredData(result) {
  const sc = result?.structuredContent;
  if (sc?.columns && sc?.rows) return sc;
  const text = result?.content?.find((c) => c.type === 'text')?.text;
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed.columns && parsed.rows) return parsed;
    if (parsed.data && Array.isArray(parsed.data)) {
      const first = parsed.data[0];
      const columns = first ? Object.keys(first).map((name) => ({ name })) : [];
      return { columns, rows: parsed.data };
    }
  } catch {
    return parseCsvToStructured(text);
  }
  return null;
}

function renderChart() {
  const { columns, rows } = state;
  if (!rows.length) return;
  const xSel = document.getElementById('x-axis');
  const ySel = document.getElementById('y-axis');
  const xCol = xSel?.value;
  const yCol = ySel?.value;
  if (!xCol || !yCol) return;
  const labels = rows.map((r) => String(r[xCol] ?? ''));
  const values = rows.map((r) => {
    const v = r[yCol];
    return typeof v === 'number' ? v : parseFloat(v) || 0;
  });
  const type = document.getElementById('chart-type')?.value || 'bar';
  if (state.chart) state.chart.destroy();
  const ctx = document.getElementById('chart')?.getContext('2d');
  if (!ctx) return;
  state.chart = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [{ label: yCol, data: values, backgroundColor: 'rgba(54, 162, 235, 0.5)' }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

function renderTable() {
  const { columns, rows } = state;
  const container = document.getElementById('table-container');
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = '';
    return;
  }
  const headers = columns.map((c) => c.name);
  container.innerHTML = `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${escapeHtml(String(r[h] ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function updateUI() {
  const { rows } = state;
  const empty = document.getElementById('empty');
  const chartContainer = document.getElementById('chart-container');
  const tableContainer = document.getElementById('table-container');
  if (empty) empty.style.display = rows.length ? 'none' : 'block';
  if (chartContainer) chartContainer.style.display = rows.length ? 'block' : 'none';
  if (tableContainer) tableContainer.style.display = document.getElementById('btn-table')?.classList.contains('active') && rows.length ? 'block' : 'none';
  const xSel = document.getElementById('x-axis');
  const ySel = document.getElementById('y-axis');
  if (xSel && ySel && state.columns.length) {
    const opts = state.columns.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
    xSel.innerHTML = opts;
    ySel.innerHTML = opts;
    if (!xSel.value) xSel.selectedIndex = 0;
    if (!ySel.value) ySel.selectedIndex = Math.min(1, state.columns.length - 1);
  }
  renderChart();
  renderTable();
}

const app = new App({ name: 'Tableau Data Explorer', version: '1.0.0' });

app.ontoolresult = (result) => {
  const data = extractStructuredData(result);
  if (data) {
    state.columns = data.columns;
    state.rows = data.rows;
    updateUI();
  }
};

app.onhostcontextchanged = (ctx) => {
  if (ctx?.theme) applyDocumentTheme(ctx.theme);
  if (ctx?.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx?.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
};

document.getElementById('chart-type')?.addEventListener('change', renderChart);
document.getElementById('x-axis')?.addEventListener('change', renderChart);
document.getElementById('y-axis')?.addEventListener('change', renderChart);
document.getElementById('btn-chart')?.addEventListener('click', () => {
  document.getElementById('btn-chart')?.classList.add('active');
  document.getElementById('btn-table')?.classList.remove('active');
  document.getElementById('chart-container').style.display = 'block';
  document.getElementById('table-container').style.display = 'none';
});
document.getElementById('btn-table')?.addEventListener('click', () => {
  document.getElementById('btn-table')?.classList.add('active');
  document.getElementById('btn-chart')?.classList.remove('active');
  document.getElementById('chart-container').style.display = 'none';
  document.getElementById('table-container').style.display = 'block';
  renderTable();
});

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) app.onhostcontextchanged(ctx);
});
