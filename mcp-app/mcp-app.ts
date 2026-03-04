/**
 * Tableau MCP Apps - Data Explorer UI
 * Renders tabular data from query-datasource and get-view-data as interactive charts.
 */
import { App, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const state = { columns: [], rows: [], chart: null };

function parseMarkdownTable(text) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return null;
  const headerLine = lines[0];
  const sepLine = lines[1];
  if (!/^\|.+\|$/.test(headerLine) || !/^[\s|:-]+$/.test(sepLine)) return null;
  const headers = headerLine.split('|').map((h) => h.trim()).filter(Boolean);
  const columns = headers.map((name) => ({ name }));
  const rows = lines.slice(2).map((line) => {
    const cells = line.split('|').map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
  return { columns, rows };
}

function parseCsvToStructured(csvText) {
  if (/^[\s]*[{\[]/.test(csvText)) return null;
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { columns: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  if (headers.some((h) => /[{"\[\]}]/.test(h))) return null;
  const columns = headers.map((name) => ({ name }));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
  return { columns, rows };
}

function parseFirstJson(text: string): unknown {
  // Find the end of the first complete JSON value by tracking bracket depth
  const start = text.search(/[\[{]/);
  if (start === -1) throw new SyntaxError('No JSON found');
  const open = text[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new SyntaxError('Unterminated JSON');
}

function sanitizeColumns(columns) {
  return columns.filter((c) => {
    const n = String(c?.name ?? '').trim();
    return n.length > 0 && n.length < 80 && !/[{"\[\]}]/.test(n);
  });
}

function normalizeSearchContentRows(items: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (!items.length) return items;
  const first = items[0];
  if ('title' in first || 'caption' in first) {
    return items.map((item) => ({
      Name: item.title ?? item.caption ?? '',
      'Total Views': item.totalViewCount ?? item.hitsTotal ?? 0,
    }));
  }
  return items;
}

function getContentText(result): string | null {
  const c = result?.content;
  let raw: string | null = null;
  if (typeof c === 'string') raw = c;
  else if (Array.isArray(c)) {
    const block = c.find((b) => b?.type === 'text');
    raw = block?.text ?? block?.content ?? null;
    if (!raw && block && typeof block === 'object') {
      raw = (block as Record<string, unknown>).text ?? (block as Record<string, unknown>).content;
      raw = typeof raw === 'string' ? raw : null;
    }
  } else if (c && typeof c === 'object') {
    raw = (c as Record<string, unknown>).text ?? (c as Record<string, unknown>).content;
    raw = typeof raw === 'string' ? raw : null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.text === 'string') {
      return parsed.text;
    }
    if (Array.isArray(parsed) && parsed[0]?.type === 'text') {
      const inner = parsed[0].text ?? parsed[0].content;
      return typeof inner === 'string' ? inner : raw;
    }
  } catch {
    /* not wrapped */
  }
  return raw;
}

function extractStructuredData(result) {
  const r = result?.params ?? result?.result ?? result;
  const sc = r?.structuredContent;
  if (sc?.columns && sc?.rows) {
    const cols = sanitizeColumns(sc.columns);
    if (cols.length) return { columns: cols, rows: sc.rows };
  }
  if (Array.isArray(result) && result.length > 0) {
    const first = result[0];
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      const rows = normalizeSearchContentRows(result);
      const columns = rows[0] ? Object.keys(rows[0]).map((name) => ({ name })) : [];
      const cols = sanitizeColumns(columns);
      if (cols.length) return { columns: cols, rows };
    }
  }
  const text = getContentText(r);
  if (!text) return null;
  const isArray = /^[\s]*\[/.test(text);
  if (isArray) {
    try {
      let parsed = parseFirstJson(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        if (first?.type === 'text' && (first.text || first.content)) {
          const inner = first.text ?? first.content;
          if (typeof inner === 'string' && /^[\s]*\[/.test(inner)) {
            parsed = parseFirstJson(inner);
          }
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
            const rows = normalizeSearchContentRows(parsed);
            const columns = rows[0] ? Object.keys(rows[0]).map((name) => ({ name })) : [];
            const cols = sanitizeColumns(columns);
            if (cols.length) return { columns: cols, rows };
          }
        }
      }
    } catch {
      return null;
    }
  }
  if (/^[\s]*\{/.test(text)) {
    try {
      const parsed = parseFirstJson(text);
      if (parsed.columns && parsed.rows) {
        const cols = sanitizeColumns(parsed.columns);
        if (cols.length) return { columns: cols, rows: parsed.rows };
      }
      if (parsed.data && Array.isArray(parsed.data)) {
        const first = parsed.data[0];
        const columns = first && typeof first === 'object' && !Array.isArray(first)
          ? Object.keys(first).map((name) => ({ name }))
          : [];
        const cols = sanitizeColumns(columns);
        if (cols.length) return { columns: cols, rows: parsed.data };
      }
    } catch {
      return null;
    }
  }
  const md = parseMarkdownTable(text);
  if (md) {
    const cols = sanitizeColumns(md.columns);
    if (cols.length) return { columns: cols, rows: md.rows };
  }
  const csv = parseCsvToStructured(text);
  if (csv) {
    const cols = sanitizeColumns(csv.columns);
    if (cols.length) return { columns: cols, rows: csv.rows };
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

  const palette = [
    'rgba(15, 23, 42, 0.85)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(20, 184, 166, 0.8)',
  ];
  const bgColors = type === 'pie' || type === 'doughnut'
    ? palette
    : [palette[1]];

  state.chart = new Chart(ctx, {
    type,
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
    const { x, y } = pickChartColumns(state.columns, state.rows);
    xSel.value = x;
    ySel.value = y;
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

const applyHostContext = (ctx) => {
  if (ctx?.theme) applyDocumentTheme(ctx.theme);
  if (ctx?.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx?.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
};
app.onhostcontextchanged = applyHostContext;

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
  if (ctx) applyHostContext(ctx);
});
