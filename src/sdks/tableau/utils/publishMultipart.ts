/** Max file size for single-call publish (64 MB). Larger files must use multi-part upload. */
export const SINGLE_CALL_PUBLISH_LIMIT_BYTES = 64 * 1024 * 1024;

/** Max chunk size per Append to File Upload call (64 MB). */
export const APPEND_CHUNK_MAX_BYTES = 64 * 1024 * 1024;

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds multipart body for Append to File Upload. First part is blank (per Tableau spec).
 * Content-Type: multipart/mixed; boundary=boundary
 */
export function buildAppendMultipartBody({
  filename,
  fileContent,
}: {
  filename: string;
  fileContent: Buffer;
}): { body: Buffer; boundary: string } {
  const boundary = `----TableauAppend${Date.now()}${Math.random().toString(36).slice(2)}`;
  const b = `--${boundary}\r\n`;
  const part1 = b + `Content-Disposition: name="request_payload"\r\nContent-Type: text/xml\r\n\r\n\r\n`;
  const part2 =
    b +
    `Content-Disposition: name="tableau_file"; filename="${filename}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n`;
  const end = `\r\n--${boundary}--\r\n`;
  return {
    body: Buffer.concat([
      Buffer.from(part1, 'utf8'),
      Buffer.from(part2, 'utf8'),
      fileContent,
      Buffer.from(end, 'utf8'),
    ]),
    boundary,
  };
}

/**
 * Builds multipart body for Publish when committing an upload session (no file, request_payload only).
 */
export function buildPublishRequestOnlyBody(requestPayload: string): { body: Buffer; boundary: string } {
  const boundary = `----TableauCommit${Date.now()}${Math.random().toString(36).slice(2)}`;
  const b = `--${boundary}\r\n`;
  const part1 = b + `Content-Disposition: name="request_payload"\r\nContent-Type: text/xml\r\n\r\n${requestPayload}\r\n`;
  const end = `--${boundary}--\r\n`;
  return {
    body: Buffer.concat([Buffer.from(part1, 'utf8'), Buffer.from(end, 'utf8')]),
    boundary,
  };
}

/**
 * Builds multipart/mixed body for Tableau publish API (workbooks, datasources, flows).
 * Content-Type: multipart/mixed; boundary=boundary
 */
export function buildPublishMultipartBody({
  requestPayload,
  filePartName,
  filename,
  fileContent,
}: {
  requestPayload: string;
  filePartName: 'tableau_workbook' | 'tableau_datasource' | 'tableau_flow';
  filename: string;
  fileContent: Buffer;
}): { body: Buffer; boundary: string } {
  const boundary = `----TableauPublish${Date.now()}${Math.random().toString(36).slice(2)}`;
  const b = `--${boundary}\r\n`;
  const part1 =
    b +
    `Content-Disposition: name="request_payload"\r\nContent-Type: text/xml\r\n\r\n${requestPayload}\r\n`;
  const part2 =
    b +
    `Content-Disposition: name="${filePartName}"; filename="${filename}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n`;
  const end = `\r\n--${boundary}--\r\n`;
  return {
    body: Buffer.concat([
      Buffer.from(part1, 'utf8'),
      Buffer.from(part2, 'utf8'),
      fileContent,
      Buffer.from(end, 'utf8'),
    ]),
    boundary,
  };
}
