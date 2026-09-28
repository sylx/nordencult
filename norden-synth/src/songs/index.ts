// LLM が作った曲の一覧。新しい曲はファイルを足してここに並べる
import { battleCry } from './battle-cry.ts'
import { fairyRing } from './fairy-ring.ts'
import { goldenSails } from './golden-sails.ts'
import { holdingBreath } from './holding-breath.ts'
import { hokuten } from './hokuten.ts'
import { imperialTriumph } from './imperial-triumph.ts'
import { starReader } from './star-reader.ts'
import { tundraMarch } from './tundra-march.ts'
import { wanderingBird } from './wandering-bird.ts'
import { whiteSanctum } from './white-sanctum.ts'
import type { Song } from './song.ts'

export { barAt, compileSong, type CompiledSong, type Song, type SongBar, type SongNote, type SongPart, type SongSection } from './song.ts'

export const SONGS: Song[] = [hokuten, fairyRing, imperialTriumph, wanderingBird, tundraMarch, goldenSails, starReader, whiteSanctum, holdingBreath, battleCry]
