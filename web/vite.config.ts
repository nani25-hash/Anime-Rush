import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function stripCrossOriginForWebView(): Plugin {
  return {
    name: 'strip-crossorigin-for-webview',
    transformIndexHtml(html: string) {
      return html.replace(/\s+crossorigin/g, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), stripCrossOriginForWebView()],
  base: './',
  build: {
    outDir: '../app/src/main/assets/www',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
