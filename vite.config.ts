import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// The sub-projects are used from source (HMR across them). Their own copies of
// react / three would load twice, so these always resolve from this root.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^norden-strategy$/, replacement: local('./norden-strategy/src/index.ts') },
      { find: /^norden-strategy\/data$/, replacement: local('./norden-strategy/src/data.ts') },
      { find: /^norden-ui$/, replacement: local('./norden-ui/src/index.ts') },
    ],
    dedupe: ['react', 'react-dom', 'three'],
  },
  // Found late through the sub-project sources; listing them avoids a reload on the first visit
  optimizeDeps: {
    include: ['three', 'three/addons/postprocessing/Pass.js'],
  },
  // Unit tests of the root only; the sub-projects run their own
  test: {
    include: ['src/**/*.test.ts'],
  },
  server: {
    allowedHosts: ['mammal-robust-squirrel.ngrok-free.app', 'localhost'],
  },
})
