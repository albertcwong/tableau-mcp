/**
 * Shared data extraction for MCP Apps.
 * Parses tool results into columns/rows for table and chart rendering.
 */

function parseMarkdownTable(text: string): { columns: Array<{ name: string }>; rows: Array<Record<string, string>> } | null {
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

function parseCsvToStructured(csvText: string): { columns: Array<{ name: string }>; rows: Array<Record<string, string>> } | null {
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

function sanitizeColumns(columns: Array<{ name?: string }>): Array<{ name: string }> {
  return columns.filter((c) => {
    const n = String(c?.name ?? '').trim();
    return n.length > 0 && n.length < 80 && !/[{"\[\]}]/.test(n);
  }).map((c) => ({ name: String(c?.name ?? '').trim() }));
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

function getContentText(result: unknown): string | null {
  const c = (result as Record<string, unknown>)?.content;
  let raw: string | null = null;
  if (typeof c === 'string') raw = c;
  else if (Array.isArray(c)) {
    const block = c.find((b: unknown) => (b as Record<string, unknown>)?.type === 'text');
    raw = (block as Record<string, unknown>)?.text ?? (block as Record<string, unknown>)?.content ?? null;
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
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.text === 'string') return parsed.text;
    if (Array.isArray(parsed) && parsed[0]?.type === 'text') {
      const inner = parsed[0].text ?? parsed[0].content;
      return typeof inner === 'string' ? inner : raw;
    }
  } catch {
    /* not wrapped */
  }
  return raw;
}

export interface ExtractedData {
  columns: Array<{ name: string }>;
  rows: Array<Record<string, unknown>>;
}

export function extractStructuredData(result: unknown): ExtractedData | null {
  const r = (result as Record<string, unknown>)?.params ?? (result as Record<string, unknown>)?.result ?? result;
  const sc = (r as Record<string, unknown>)?.structuredContent as { columns?: Array<{ name?: string }>; rows?: Array<Record<string, unknown>> } | undefined;
  if (sc?.columns && sc?.rows) {
    const cols = sanitizeColumns(sc.columns);
    if (cols.length) return { columns: cols, rows: sc.rows };
  }
  if (Array.isArray(result) && result.length > 0) {
    const first = result[0];
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      const rows = normalizeSearchContentRows(result as Array<Record<string, unknown>>);
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
      let parsed = parseFirstJson(text) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0] as Record<string, unknown>;
        if (first?.type === 'text' && (first.text || first.content)) {
          const inner = first.text ?? first.content;
          if (typeof inner === 'string' && /^[\s]*\[/.test(inner)) parsed = parseFirstJson(inner) as unknown;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0] as Record<string, unknown>;
          if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
            const rows = normalizeSearchContentRows(parsed as Array<Record<string, unknown>>);
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
      const parsed = parseFirstJson(text) as Record<string, unknown>;
      if (parsed.columns && parsed.rows) {
        const cols = sanitizeColumns(parsed.columns as Array<{ name?: string }>);
        if (cols.length) return { columns: cols, rows: parsed.rows as Array<Record<string, unknown>> };
      }
      if (parsed.data && Array.isArray(parsed.data)) {
        const first = parsed.data[0] as Record<string, unknown> | undefined;
        const columns = first && typeof first === 'object' && !Array.isArray(first)
          ? Object.keys(first).map((name) => ({ name }))
          : [];
        const cols = sanitizeColumns(columns);
        if (cols.length) return { columns: cols, rows: parsed.data as Array<Record<string, unknown>> };
      }
    } catch {
      return null;
    }
  }
  const md = parseMarkdownTable(text);
  if (md) {
    const cols = sanitizeColumns(md.columns);
    if (cols.length) return { columns: cols, rows: md.rows as Array<Record<string, unknown>> };
  }
  const csv = parseCsvToStructured(text);
  if (csv) {
    const cols = sanitizeColumns(csv.columns);
    if (cols.length) return { columns: cols, rows: csv.rows as Array<Record<string, unknown>> };
  }
  return null;
}
