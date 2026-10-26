import { describe, expect, it } from 'vitest'
import { SONGS } from 'norden-synth'
import { SCENE_BGM } from './sceneBgm'

describe('SCENE_BGM', () => {
  it('names songs of norden-synth', () => {
    const ids = new Set(SONGS.map((s) => s.id))
    for (const song of Object.values(SCENE_BGM)) if (song) expect(ids).toContain(song)
  })
})
