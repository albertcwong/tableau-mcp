import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** Files smaller than this are returned inline as base64; larger files go to temp file. */
const INLINE_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5 MB

let downloadDir: string | undefined;

/**
 * Returns (and lazily creates) a shared temporary directory for downloaded files.
 * The directory is created once per process under the OS temp dir.
 */
async function getDownloadDir(): Promise<string> {
  if (!downloadDir) {
    downloadDir = await mkdtemp(join(tmpdir(), 'tableau-mcp-downloads-'));
  }
  return downloadDir;
}

/**
 * Saves binary data to a temp file and returns the path.
 */
export async function saveDownloadToTempFile(
  filename: string,
  data: ArrayBuffer | Buffer,
): Promise<{ filePath: string; sizeBytes: number }> {
  const dir = await getDownloadDir();
  // Prefix with timestamp to avoid collisions
  const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = join(dir, safeName);
  const buf = Buffer.from(data);
  await writeFile(filePath, buf);
  return { filePath, sizeBytes: buf.length };
}

export type DownloadResult = {
  filename: string;
  sizeBytes: number;
  contentBase64?: string;
  filePath?: string;
};

/**
 * Processes a downloaded file: returns base64 inline for small files,
 * saves to temp file for large files.
 */
export async function processDownload(
  filename: string,
  data: ArrayBuffer | Buffer,
): Promise<DownloadResult> {
  const buf = Buffer.from(data);
  if (buf.length <= INLINE_THRESHOLD_BYTES) {
    return {
      filename,
      sizeBytes: buf.length,
      contentBase64: buf.toString('base64'),
    };
  }
  const { filePath, sizeBytes } = await saveDownloadToTempFile(filename, data);
  return { filename, sizeBytes, filePath };
}

/**
 * Reads a previously downloaded temp file and returns it as a Buffer.
 */
export async function readDownloadedFile(filePath: string): Promise<Buffer> {
  return readFile(filePath);
}

/**
 * Cleans up the download directory. Called on graceful shutdown if desired.
 */
export async function cleanupDownloadDir(): Promise<void> {
  if (downloadDir) {
    await rm(downloadDir, { recursive: true, force: true }).catch(() => {});
    downloadDir = undefined;
  }
}
