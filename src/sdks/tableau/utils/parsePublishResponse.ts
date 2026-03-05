/** Extracts root element attributes from Tableau publish response XML. */
export function parsePublishResponseXml(xml: string): Record<string, string> {
  const rootMatch = xml.match(/<(workbook|datasource|flow)\s+([^>]+)/);
  if (!rootMatch) return {};
  const attrs: Record<string, string> = { type: rootMatch[1] };
  const attrRe = /(\w+)=["']([^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(rootMatch[2])) !== null) attrs[m[1]] = m[2];
  return attrs;
}
