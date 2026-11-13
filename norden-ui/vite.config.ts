import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // The demo loads the parent project's src/data/*.ts (via import.meta.glob), which uses the parent's aliases
  resolve: {
    alias: [
      { find: /^@norden\/battle-runtime\/rules$/, replacement: fileURLToPath(new URL('../norden-battle/battle-runtime/src/rules.ts', import.meta.url)) },
    ],
  },
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd()), fileURLToPath(new URL('..', import.meta.url))] } },
  build: mode === 'demo' ? { outDir: 'dist-demo' } : {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'norden-ui',
      cssFileName: 'norden-ui',
    },
    rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime'] },
  },
}))
