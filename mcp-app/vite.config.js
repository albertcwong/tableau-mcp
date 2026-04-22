import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const entries = {
  'mcp-app': 'mcp-app/mcp-app.html',
  'chart-explorer': 'mcp-app/chart-explorer.html',
  'content-browser': 'mcp-app/content-browser.html',
};

const entry = process.env.MCP_APP_ENTRY || 'mcp-app';
const input = entries[entry] || entries['mcp-app'];

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: 'build',
    emptyOutDir: false,
    rollupOptions: {
      input,
      output: { entryFileNames: '[name].js', assetFileNames: '[name][extname]' },
    },
  },
});
