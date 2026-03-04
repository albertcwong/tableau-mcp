/* eslint-disable no-console */

import { build, BuildOptions, context } from 'esbuild';
import { chmod, mkdir, rm } from 'fs/promises';
import { spawn } from 'child_process';

const dev = process.argv.includes('--dev');
const watch = process.argv.includes('--watch');

const buildOptions: BuildOptions = {
  entryPoints: ['./src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  minify: !dev,
  packages: dev ? 'external' : 'bundle',
  sourcemap: true,
  logLevel: dev ? 'debug' : 'info',
  logOverride: {
    'empty-import-meta': 'silent',
  },
  outfile: './build/index.js',
};

const tracingBuildOptions: BuildOptions = {
  entryPoints: ['./src/telemetry/tracing.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  minify: !dev,
  packages: 'external',
  sourcemap: true,
  outfile: './build/telemetry/tracing.js',
};

async function buildOnce(): Promise<void> {
  if (!watch) {
    await rm('./build', { recursive: true, force: true });
  }

  console.log(watch ? '[watch] build started' : '🏗️ Building...');
  const result = await build(buildOptions);

  for (const error of result.errors) {
    console.log(`❌ ${error.text}`);
  }

  for (const warning of result.warnings) {
    console.log(`⚠️ ${warning.text}`);
  }

  console.log('🏗️ Building telemetry/tracing.js...');
  await mkdir('./build/telemetry', { recursive: true });
  const tracingResult = await build(tracingBuildOptions);

  for (const error of tracingResult.errors) {
    console.log(`❌ ${error.text}`);
  }

  for (const warning of tracingResult.warnings) {
    console.log(`⚠️ ${warning.text}`);
  }

  await chmod('./build/index.js', '755');

  console.log('🏗️ Building MCP Apps UI...');
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('npm', ['run', 'build:mcp-app'], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`build:mcp-app exited ${code}`))));
  });

  if (watch) {
    console.log('[watch] build finished');
  }
}

(async () => {
  if (watch) {
    await rm('./build', { recursive: true, force: true });
    await mkdir('./build/telemetry', { recursive: true });

    const ctx = await context(buildOptions);
    const tracingCtx = await context(tracingBuildOptions);

    await ctx.watch();
    await tracingCtx.watch();

    console.log('[watch] build started');
    console.log('[watch] watching for changes...');

    // Keep process alive
    process.on('SIGINT', async () => {
      await ctx.dispose();
      await tracingCtx.dispose();
      process.exit(0);
    });
  } else {
    await buildOnce();
  }
})();
