import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { mapsPlugin } from './norden-battle/map-runtime/server/vite-plugin-maps.ts'

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// The sub-projects are used from source (HMR across them). Their own copies of
// react / three would load twice, so these always resolve from this root.
export default defineConfig({
  plugins: [
    react(),
    // Battle maps (norden-battle/assets/maps/) served as maps/, and copied to dist/maps/ by the build
    mapsPlugin({ mapsDir: local('./norden-battle/assets/maps'), readOnly: true }),
  ],
  resolve: {
    alias: [
      { find: /^norden-strategy$/, replacement: local('./norden-strategy/src/index.ts') },
      { find: /^norden-strategy\/data$/, replacement: local('./norden-strategy/src/data.ts') },
      { find: /^norden-ui$/, replacement: local('./norden-ui/src/index.ts') },
      // The workspace packages' exports (norden-battle/battle-runtime/package.json, norden-battle/map-runtime/package.json)
      { find: /^@norden\/battle-runtime$/, replacement: local('./norden-battle/battle-runtime/src/index.ts') },
      { find: /^@norden\/map-runtime\/render\/structures$/, replacement: local('./norden-battle/map-runtime/src/render/structures/index.ts') },
      { find: /^@norden\/map-runtime\/(.+)$/, replacement: `${local('./norden-battle/map-runtime/src')}/$1.ts` },
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
