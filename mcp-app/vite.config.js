import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: 'build',
    emptyOutDir: false,
    rollupOptions: {
      input: 'mcp-app/mcp-app.html',
      output: { entryFileNames: '[name].js', assetFileNames: '[name][extname]' },
    },
  },
});
