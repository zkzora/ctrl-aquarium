import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root: `${here}/website`, base: './', publicDir: `${here}/public`,
  plugins: [react()],
  resolve: { alias: { '@': here } },
  server: { host: '127.0.0.1', port: 4173, strictPort: true, fs: { allow: [here] }, proxy: {'/api':{target:'http://127.0.0.1:4174',changeOrigin:true}} },
  build: { outDir: `${here}/website-dist`, emptyOutDir: true, assetsDir: 'bundles', modulePreload: false },
});
