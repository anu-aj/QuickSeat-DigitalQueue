import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  // The build is one self-contained dist/index.html (scripts and styles inlined) with relative paths, so it opens
  // by double-clicking and also works on GitHub Pages under /<repo-name>/.
  base: './',
  plugins: [react(), viteSingleFile()],
  server: {
    // Forward API calls to the Express server (see server/index.ts).
    proxy: { '/api': 'http://localhost:3001' },
  },
})
