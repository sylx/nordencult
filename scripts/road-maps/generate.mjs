// Generates road maps from the strategy map's geography into norden-battle/assets/maps/.
//
//   npm run road-maps -- P003-P005 P018-P024   the roads given
//   npm run road-maps                          every road without a map yet
//   npm run road-maps -- --force P003-P005     also overwrite existing maps (hand edits are lost)
//
// roadMaps.ts is loaded through Vite (the root config's aliases resolve the sub-projects' sources).
import { existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../..', import.meta.url))
const mapsDir = fileURLToPath(new URL('../../norden-battle/assets/maps/', import.meta.url))
const args = process.argv.slice(2)
const force = args.includes('--force')
const keys = args.filter((a) => !a.startsWith('--'))

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
try {
  const { ROAD_KEYS, buildRoadMap, roadMapFile } = await server.ssrLoadModule('/scripts/road-maps/roadMaps.ts')
  const targets = keys.length > 0 ? keys : ROAD_KEYS
  for (const key of targets) {
    const [a, b] = key.split('-')
    const path = mapsDir + roadMapFile(a, b)
    if (existsSync(path) && !force) {
      console.log(`skip  ${roadMapFile(a, b)}（既にあります。上書きは --force）`)
      continue
    }
    const map = buildRoadMap(key)
    writeFileSync(path, map.text)
    console.log(`write ${map.file}`)
  }
} finally {
  await server.close()
}
