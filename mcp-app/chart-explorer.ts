/**
 * Tableau MCP Apps - Chart Explorer UI
 * Renders tabular data from query-datasource and get-view-data as interactive charts + table.
 */
import { App, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { Chart, registerables } from 'chart.js';
import { extractStructuredData } from './shared/dataExtraction.js';

Chart.register(...registerables);

const state = { columns: [] as Array<{ name: string }>, rows: [] as Array<Record<string, unknown>>, chart: null as Chart | null };

const SKIP_FOR_CHART = new Set([
  'id', 'projectId', 'modifiedTime', 'createdAt', 'updatedAt', 'description',
  'contentUrl', 'webpageUrl', 'project', 'owner', 'tags', 'certificationNote',
]);

function isNumericCol(rows: Array<Record<string, unknown>>, col: string): boolean {
  if (!rows.length) return false;
  const sample = rows.slice(0, Math.min(20, rows.length));
  const numeric = sample.filter((r) => {
    const v = r[col];
    if (typeof v === 'number' && !Number.isNaN(v)) return true;
    const n = parseFloat(String(v ?? ''));
    return !Number.isNaN(n) && String(v).trim() !== '';
  });
  return numeric.length >= sample.length * 0.5;
}

function pickChartColumns(columns: Array<{ name: string }>, rows: Array<Record<string, unknown>>): { x: string; y: string } {
  const names = columns.map((c) => c.name).filter((n) => !SKIP_FOR_CHART.has(n));
  const numeric = names.filter((n) => isNumericCol(rows, n));
  const categorical = names.filter((n) => !numeric.includes(n));
  const prefersY = /total|count|views?|sum|value|amount|number/i;
  const yCand = numeric.find((n) => prefersY.test(n)) ?? numeric[0];
  const x = categorical[0] ?? names[0];
  const y = yCand ?? (categorical.length > 1 ? categorical[1] : names[1]) ?? names[0];
  return { x, y };
}

function hasChartableData(columns: Array<{ name: string }>, rows: Array<Record<string, unknown>>): boolean {
  if (!rows.length || !columns.length) return false;
  const { y } = pickChartColumns(columns, rows);
  return isNumericCol(rows, y);
}

function renderChart(): void {
  const { columns, rows } = state;
  if (!rows.length || !hasChartableData(columns, rows)) return;
  const xSel = document.getElementById('x-axis') as HTMLSelectElement | null;
  const ySel = document.getElementById('y-axis') as HTMLSelectElement | null;
  const xCol = xSel?.value;
  const yCol = ySel?.value;
  if (!xCol || !yCol) return;
  const labels = rows.map((r) => String(r[xCol] ?? ''));
  const values = rows.map((r) => {
    const v = r[yCol];
    return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
  });
  const type = (document.getElementById('chart-type') as HTMLSelectElement)?.value || 'bar';
  if (state.chart) state.chart.destroy();
  const ctx = (document.getElementById('chart') as HTMLCanvasElement)?.getContext('2d');
  if (!ctx) return;

  const palette = [
    'rgba(15, 23, 42, 0.85)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(20, 184, 166, 0.8)',
  ];
  const bgColors = type === 'pie' || type === 'doughnut' ? palette : [palette[1]];

  state.chart = new Chart(ctx, {
    type: type as 'bar' | 'line' | 'pie' | 'doughnut',
    data: {
      labels,
      datasets: [{
        label: yCol,
        data: values,
        backgroundColor: bgColors,
        borderColor: type === 'line' ? palette[1] : undefined,
        borderWidth: type === 'line' ? 2 : 1,
        fill: type === 'line',
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: type === 'pie', position: 'bottom' },
        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 10 },
      },
      scales: type !== 'pie' && type !== 'doughnut' ? {
        x: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 45 },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: '#64748b', font: { size: 11 } },
          beginAtZero: true,
        },
      } : {},
    },
  });
}

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
  const chartContainer = document.getElementById('chart-container');
  const toolbar = document.getElementById('toolbar');
  const tableContainer = document.getElementById('table-container');
  const chartable = hasChartableData(state.columns, state.rows);

  if (empty) empty.style.display = rows.length ? 'none' : 'block';
  if (chartContainer) chartContainer.style.display = rows.length && chartable ? 'block' : 'none';
  if (toolbar) toolbar.style.display = rows.length && chartable ? 'flex' : 'none';
  if (tableContainer) {
    const btnTable = document.getElementById('btn-table');
    tableContainer.style.display = btnTable?.classList.contains('active') && rows.length ? 'block' : 'none';
  }

  const xSel = document.getElementById('x-axis') as HTMLSelectElement | null;
  const ySel = document.getElementById('y-axis') as HTMLSelectElement | null;
  if (xSel && ySel && state.columns.length) {
    const opts = state.columns.map((c) => c.name);
    xSel.replaceChildren(...opts.map((n) => {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      return o;
    }));
    ySel.replaceChildren(...opts.map((n) => {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      return o;
    }));
    const { x, y } = pickChartColumns(state.columns, state.rows);
    xSel.value = x;
    ySel.value = y;
  }
  renderChart();
  renderTable();
}

const app = new App({ name: 'Tableau Chart Explorer', version: '1.0.0' });

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

document.getElementById('chart-type')?.addEventListener('change', renderChart);
document.getElementById('x-axis')?.addEventListener('change', renderChart);
document.getElementById('y-axis')?.addEventListener('change', renderChart);
document.getElementById('btn-chart')?.addEventListener('click', () => {
  document.getElementById('btn-chart')?.classList.add('active');
  document.getElementById('btn-table')?.classList.remove('active');
  document.getElementById('chart-container')!.style.display = 'block';
  document.getElementById('table-container')!.style.display = 'none';
});
document.getElementById('btn-table')?.addEventListener('click', () => {
  document.getElementById('btn-table')?.classList.add('active');
  document.getElementById('btn-chart')?.classList.remove('active');
  document.getElementById('chart-container')!.style.display = 'none';
  document.getElementById('table-container')!.style.display = 'block';
  renderTable();
});

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) applyHostContext(ctx);
});
