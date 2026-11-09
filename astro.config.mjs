/* global process */
import { defineConfig } from 'astro/config';

// Records are read with fs, outside Vite's module graph, so reload the page when one changes.
const watchContent = () => ({
  name: 'watch-content',
  configureServer(server) {
    server.watcher.add('content');
    server.watcher.on('all', (_event, file) => {
      if (/[\\/]content[\\/].*\.md$/.test(file)) server.ws.send({ type: 'full-reload' });
    });
  }
});

export default defineConfig({
  output: 'static',
  site: 'https://example.com', // Placeholder until the owner chooses the domain (see README).
  // The Content-Security-Policy forbids inline styles, so never inline CSS into the HTML.
  build: { inlineStylesheets: 'never' },
  vite: {
    // Astro inlines small bundled scripts into the HTML; the Content-Security-Policy forbids that.
    build: { assetsInlineLimit: 0 },
    // File changes made from Windows are not seen inside WSL, so poll for changes there only.
    server: process.env.WSL_DISTRO_NAME ? { watch: { usePolling: true, interval: 300 } } : {},
    plugins: [watchContent()]
  }
});
