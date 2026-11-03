/**
 * エディタの保存を受け持つ Vite プラグイン（開発サーバーだけ）。
 *
 * - PUT /api/dialogue/<sceneId>  ルートの src/dialogue/<sceneId>.json を決まった書式（formatScript）で書く
 *
 * 書いたファイルは HMR でエディタにも、開いているゲームにも反映される。新しい台本はここでは作らない（JSON を手で置く）
 */
import { readFile, rename, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { formatScript } from '../../src/format.ts'

/** ゲーム本体（nordencult）の会話シーンの置き場所。NORDEN_ROOT で変えられる */
const GAME_ROOT = path.resolve(process.env.NORDEN_ROOT ?? fileURLToPath(new URL('../../..', import.meta.url)))
export const DIALOGUE_DIR = path.join(GAME_ROOT, 'src', 'dialogue')

const SCENE_ID = /^[A-Za-z][A-Za-z0-9]*$/

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function save(id: string, req: IncomingMessage, res: ServerResponse) {
  if (!SCENE_ID.test(id)) return send(res, 400, { error: `シーンの id が正しくありません: ${id}` })
  const file = path.join(DIALOGUE_DIR, `${id}.json`)
  try {
    await readFile(file)
  } catch {
    return send(res, 404, { error: `台本がありません（新しい台本は手で置いてください）: ${file}` })
  }
  let body: unknown
  try {
    body = await readBody(req)
  } catch {
    return send(res, 400, { error: 'JSON として読めません' })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) || !('blocks' in body)) return send(res, 400, { error: '台本（blocks のあるオブジェクト）ではありません' })
  const tmp = `${file}.tmp`
  await writeFile(tmp, formatScript(body))
  await rename(tmp, file)
  send(res, 200, { ok: true, file })
}

export function dialoguePlugin(): Plugin {
  return {
    name: 'norden-dialogue-save',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = /^\/api\/dialogue\/([^/?]+)$/.exec(new URL(req.url ?? '/', 'http://localhost').pathname)
        if (!match || req.method !== 'PUT') return next()
        save(decodeURIComponent(match[1]), req, res).catch((error: unknown) => send(res, 500, { error: String(error) }))
      })
    },
  }
}
