import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { instrumentsPlugin } from '../norden-synth/tools/vite-plugin-instruments.ts'
import { dialoguePlugin } from './editor/server/dialoguePlugin.ts'

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// エディタ。親（nordencult）の会話シーン（src/dialogue/）と騎士のデータ・画像・音をそのまま読む。
// 親のソースが使うサブプロジェクトもソースのまま読み、React は 1 つにそろえる
export default defineConfig({
  plugins: [react(), dialoguePlugin(), instrumentsPlugin()],
  resolve: {
    alias: [
      { find: /^norden-dialogue$/, replacement: local('./src/index.ts') },
      { find: /^norden-ui$/, replacement: local('../norden-ui/src/index.ts') },
      { find: /^norden-synth$/, replacement: local('../norden-synth/src/index.ts') },
      { find: /^norden-strategy\/data$/, replacement: local('../norden-strategy/src/data.ts') },
      { find: /^@game\/(.+)$/, replacement: `${local('../src')}/$1` },
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5176,
    fs: { allow: [local('.'), local('..')] },
  },
})
