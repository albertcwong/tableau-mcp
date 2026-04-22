import { spawn } from 'child_process';
import path from 'path';

import { getDirname } from './getDirname.js';

const __dirname = getDirname();
const SCRIPT_DIR = path.resolve(__dirname, '..', '..', 'scripts');
const SCRIPT_PATH = path.join(SCRIPT_DIR, 'createHyperFromRecords.py');
const VENV_DIR = path.resolve(SCRIPT_DIR, '..', '.venv-hyper');

interface Column {
  name: string;
  type: 'text' | 'double' | 'date' | 'bool' | 'int';
  nullable?: boolean;
}

interface CreateHyperInput {
  tableName?: string;
  schemaName?: string;
  columns: Column[];
  records: Record<string, unknown>[];
}

function runPythonScript(
  input: CreateHyperInput,
  command: string,
  args: string[],
  opts: { cwd: string; env?: NodeJS.ProcessEnv },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      ...opts,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`createHyperFromRecords failed (exit ${code}): ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.stdin.write(JSON.stringify(input));
    proc.stdin.end();
  });
}

export async function createHyperFromRecords(input: CreateHyperInput): Promise<string> {
  // #region agent log
  fetch('http://127.0.0.1:7458/ingest/a1d3218f-8222-407d-8e8a-bf786a04e04f', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4bf93c' },
    body: JSON.stringify({
      sessionId: '4bf93c',
      location: 'createHyperFromRecords.ts:entry',
      message: 'createHyperFromRecords invoked',
      data: {
        path: process.env.PATH?.slice(0, 200) ?? '(empty)',
        pathLen: process.env.PATH?.length ?? 0,
        scriptDir: SCRIPT_DIR,
      },
      timestamp: Date.now(),
      hypothesisId: 'H1',
    }),
  }).catch(() => {});
  // #endregion

  const uvEnv = { ...process.env, UV_PROJECT_ENVIRONMENT: VENV_DIR };
  try {
    return await runPythonScript(input, 'uv', ['run', 'createHyperFromRecords.py'], {
      cwd: SCRIPT_DIR,
      env: uvEnv,
    });
  } catch (err) {
    const isEnoent =
      err instanceof Error &&
      ((err as NodeJS.ErrnoException).code === 'ENOENT' || err.message.includes('ENOENT'));

    // #region agent log
    fetch('http://127.0.0.1:7458/ingest/a1d3218f-8222-407d-8e8a-bf786a04e04f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4bf93c' },
      body: JSON.stringify({
        sessionId: '4bf93c',
        location: 'createHyperFromRecords.ts:uv-failed',
        message: 'uv spawn failed, checking fallback',
        data: {
          errMsg: err instanceof Error ? err.message : String(err),
          errCode: err instanceof Error && 'code' in err ? (err as NodeJS.ErrnoException).code : undefined,
          isEnoent,
        },
        timestamp: Date.now(),
        hypothesisId: 'H2',
      }),
    }).catch(() => {});
    // #endregion

    if (isEnoent) {
      try {
        return await runPythonScript(input, 'python3', [SCRIPT_PATH], { cwd: SCRIPT_DIR });
      } catch (pyErr) {
        throw new Error(
          `uv not found (ENOENT). Fallback to python3 failed: ${
            pyErr instanceof Error ? pyErr.message : String(pyErr)
          }. Install uv (https://astral.sh/uv) or ensure python3 + tableauhyperapi are available.`,
        );
      }
    }
    throw new Error(`Failed to spawn uv: ${err instanceof Error ? err.message : String(err)}`);
  }
}
