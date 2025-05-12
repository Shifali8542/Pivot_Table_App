import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Ensure static assets are served correctly
    fs: {
      strict: false, // Allow serving files outside the project root if needed
    },
  },
  assetsInclude: ['**/*.worker.min.js'], // Ensure the worker script is included as an asset
  build: {
    // Additional build options can be specified here
  },
});
