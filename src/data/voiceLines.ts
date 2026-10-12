/**
 * セリフのデータ（norden-data のセリフエディタが voiceLines.json を書く）。
 *
 * 場面（situation）ごとに、口調 × 性格のマトリックスの各セルにセリフを並べる。
 * セルは `口調/性格` で、どちらも '*'（共通）にできる。騎士が場面で言うセリフは次から選ぶ:
 *
 * 1. 騎士の口調の列のセル（性格が共通のセルと、騎士の性格ごとのセル）
 * 2. 1 が無ければ口調が共通の列のセル（同じく、性格が共通のセルと性格ごとのセル）
 *
 * 口調が決まれば話し方が決まるので、口調が共通のセルは口調を問わず通じる言い回しにする。
 */
import voiceLineData from './voiceLines.json'
import { PERSONALITY_TAGS, VOICE_TONE_IDS, type PersonalityTag, type VoiceToneId } from './characterVoice'

/** 口調・性格を問わないセル */
export const ANY = '*'

export type ToneKey = VoiceToneId | typeof ANY
export type PersonalityKey = PersonalityTag | typeof ANY
export type CellKey = `${ToneKey}/${PersonalityKey}`

export interface VoiceSituation {
  /** 'battle.attack' など。ゲームのコードが引くので、使われているものは変えない */
  id: string
  /** エディタで場面をまとめる見出し（'戦闘' など） */
  group: string
  label: string
  /** いつ言うか（エディタに出す） */
  note?: string
}

export interface VoiceLineData {
  situations: VoiceSituation[]
  /** 場面 → セル → セリフ */
  lines: Record<string, Partial<Record<CellKey, string[]>>>
}

/** セリフを選ぶ騎士の口調・性格（Character の一部） */
export interface VoiceProfile {
  voiceTone?: VoiceToneId
  personality?: readonly PersonalityTag[]
}

export const VOICE_LINES = voiceLineData as VoiceLineData

export const cellKey = (tone: ToneKey, personality: PersonalityKey): CellKey => `${tone}/${personality}`

/** セルの並び（口調の共通 → 口調の順、それぞれ性格の共通 → 性格の順）。保存するときにこの順にそろえる */
export const CELL_ORDER: readonly CellKey[] = ([ANY, ...VOICE_TONE_IDS] as ToneKey[])
  .flatMap((tone) => ([ANY, ...PERSONALITY_TAGS] as PersonalityKey[]).map((p) => cellKey(tone, p)))

/** profile が situation でセリフを引くセル（上の 1・2 の順で、セリフのある方。セリフのあるセルだけ） */
export function voiceLineCells(situation: string, profile: VoiceProfile | undefined, data: VoiceLineData = VOICE_LINES): CellKey[] {
  const cells = data.lines[situation] ?? {}
  const column = (tone: ToneKey) => ([ANY, ...(profile?.personality ?? [])] as PersonalityKey[])
    .map((p) => cellKey(tone, p))
    .filter((key) => cells[key]?.length)
  const own = profile?.voiceTone ? column(profile.voiceTone) : []
  return own.length ? own : column(ANY)
}

/** profile が situation で言いうるセリフ */
export function voiceLineCandidates(situation: string, profile: VoiceProfile | undefined, data: VoiceLineData = VOICE_LINES): string[] {
  return voiceLineCells(situation, profile, data).flatMap((key) => data.lines[situation][key] ?? [])
}

/** profile が situation で言うセリフを 1 つ選ぶ。無ければ null */
export function pickVoiceLine(situation: string, profile: VoiceProfile | undefined, data: VoiceLineData = VOICE_LINES): string | null {
  const list = voiceLineCandidates(situation, profile, data)
  return list.length ? list[Math.floor(Math.random() * list.length)] : null
}
