// LLM が作った曲の一覧。新しい曲はファイルを足してここに並べる
import { fairyRing } from './fairy-ring.ts'
import { hokuten } from './hokuten.ts'
import type { Song } from './song.ts'

export { barAt, compileSong, type CompiledSong, type Song, type SongBar, type SongNote, type SongPart, type SongSection } from './song.ts'

export const SONGS: Song[] = [hokuten, fairyRing]
