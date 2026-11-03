import { defineConfig } from 'vitest/config'

// 台本の検査・書式・シーンの実行のテスト（画面は描かない）
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
