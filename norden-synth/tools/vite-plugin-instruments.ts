// 楽器データ (public/instruments/) を、別のプロジェクトのページの instruments/ として見せる Vite プラグイン。
// ゲーム本体 (nordencult) で使う。Synth の既定の indexUrl (instruments/index.json) がそのまま使える
//
// - 開発サーバー: public/instruments/ のファイルをそのまま返す
// - ビルド: その時点の public/instruments/ を dist/instruments/ に書き出す

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const DIR = fileURLToPath(new URL('../public/instruments/', import.meta.url))
const URL_PREFIX = 'instruments/'
const TYPES: Record<string, string> = { '.json': 'application/json; charset=utf-8', '.ogg': 'audio/ogg' }

const isInstrumentFile = (name: string) => /^[\w.-]+$/.test(name) && Object.hasOwn(TYPES, path.extname(name))

export function instrumentsPlugin(): Plugin {
  return {
    name: 'norden-instruments',
    configureServer(server) {
      // base が '/' 以外でも開発サーバーはその下から配信するので、パスの最後の instruments/<file> で判定する
      server.middlewares.use((req, res, next) => {
        const m = new RegExp(`/${URL_PREFIX}([^/]+)$`).exec(new URL(req.url ?? '/', 'http://localhost').pathname)
        if (!m || !isInstrumentFile(m[1]) || (req.method !== 'GET' && req.method !== 'HEAD')) return next()
        readFile(path.join(DIR, m[1])).then(
          (data) => {
            res.statusCode = 200
            res.setHeader('Content-Type', TYPES[path.extname(m[1])])
            res.setHeader('Content-Length', data.byteLength)
            res.end(req.method === 'HEAD' ? undefined : data)
          },
          () => next(),
        )
      })
    },
    async generateBundle() {
      for (const name of (await readdir(DIR)).filter(isInstrumentFile)) {
        this.emitFile({ type: 'asset', fileName: URL_PREFIX + name, source: await readFile(path.join(DIR, name)) })
      }
    },
  }
}
