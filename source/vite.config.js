import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
      },
    },
  },
})
