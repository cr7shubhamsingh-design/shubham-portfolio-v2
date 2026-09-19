import { defineConfig } from 'vite';

// Vercel rewrites /work/:slug to the template (see vercel.json). The dev server
// needs the same rule or those links 404 locally and dev drifts from prod.
const workRewrite = {
  name: 'work-rewrite',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && /^\/work\/[\w-]+\/?($|\?)/.test(req.url)) {
        req.url = '/case-study.html';
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [workRewrite],
  build: {
    rollupOptions: {
      // Three pages: the homepage, the shared case-study template, and the
      // playground wall.
      input: {
        main: 'index.html',
        caseStudy: 'case-study.html',
        playground: 'playground.html',
      },
    },
  },
});
