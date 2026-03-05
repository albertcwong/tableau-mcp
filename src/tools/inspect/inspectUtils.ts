import AdmZip from 'adm-zip';

export function extractInnerXml(
  buffer: Buffer,
  innerExt: string,
): string {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const entry = entries.find((e) => e.entryName.endsWith(innerExt));
  if (!entry) throw new Error(`No ${innerExt} file found in archive`);
  return entry.getData().toString('utf8');
}

/** Extract sheets and dashboards from .twb XML. */
export function parseWorkbookXml(xml: string): {
  sheets: Array<{ name: string; id?: string }>;
  dashboards: Array<{ name: string; id?: string }>;
  dataSources: Array<{ name: string; id?: string }>;
} {
  const sheets: Array<{ name: string; id?: string }> = [];
  const dashboards: Array<{ name: string; id?: string }> = [];
  const dataSources: Array<{ name: string; id?: string }> = [];
  const wsRe = /<worksheet\s+name="([^"]+)"(?:\s+id="([^"]+)")?/g;
  let m: RegExpExecArray | null;
  while ((m = wsRe.exec(xml)) !== null) sheets.push({ name: m[1], id: m[2] });
  const dashRe = /<dashboard\s+name="([^"]+)"(?:\s+id="([^"]+)")?/g;
  while ((m = dashRe.exec(xml)) !== null) dashboards.push({ name: m[1], id: m[2] });
  const dsRe = /<datasource\s+name="([^"]+)"(?:\s+id="([^"]+)")?/g;
  while ((m = dsRe.exec(xml)) !== null) dataSources.push({ name: m[1], id: m[2] });
  return { sheets, dashboards, dataSources };
}

/** Extract connections and columns from .tds XML. */
export function parseDatasourceXml(xml: string): {
  connections: Array<{ server?: string; database?: string }>;
  columns: Array<{ name: string; datatype?: string }>;
} {
  const connections: Array<{ server?: string; database?: string }> = [];
  const columns: Array<{ name: string; datatype?: string }> = [];
  const connRe = /<connection\s+[^>]*server="([^"]*)"[^>]*database="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = connRe.exec(xml)) !== null)
    connections.push({ server: m[1] || undefined, database: m[2] || undefined });
  const colRe = /<column\s+name="([^"]+)"(?:\s+datatype="([^"]+)")?/g;
  while ((m = colRe.exec(xml)) !== null) columns.push({ name: m[1], datatype: m[2] });
  return { connections, columns };
}

/** Parse .tfl for minimal structure. */
export function parseFlowXml(xml: string): Record<string, unknown> {
  const nodes: Record<string, unknown> = {};
  const stepRe = /<step\s+id="([^"]+)"\s+name="([^"]+)"/g;
  let m: RegExpExecArray | null;
  const steps: Array<{ id: string; name: string }> = [];
  while ((m = stepRe.exec(xml)) !== null) steps.push({ id: m[1], name: m[2] });
  const outputRe = /<output\s+id="([^"]+)"\s+name="([^"]+)"/g;
  const outputs: Array<{ id: string; name: string }> = [];
  while ((m = outputRe.exec(xml)) !== null) outputs.push({ id: m[1], name: m[2] });
  return { steps, outputs };
}
