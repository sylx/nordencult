/**
 * セリフのデータ（norden-data のセリフエディタが voiceLines.json を書く）。
 *
 * 場面（situation）ごとに、口調 × 性格のマトリックスの各セルにセリフを並べる。
 * セルは `口調/性格` で、どちらも '*'（共通）にできる。騎士は口調の列から、性格が共通のセルと
 * 自分の性格ごとのセルを合わせた中から選ぶ。口調が未設定の騎士（と騎士のいない部隊）は口調が共通の列から選ぶ。
 * 口調のある騎士は共通の列を使わないので、口調の列にその場面のセリフが無ければ何も言わない。
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

/** profile が situation でセリフを引くセル（口調の列の、性格が共通のセルと性格ごとのセル。セリフのあるセルだけ） */
export function voiceLineCells(situation: string, profile: VoiceProfile | undefined, data: VoiceLineData = VOICE_LINES): CellKey[] {
  const cells = data.lines[situation] ?? {}
  return ([ANY, ...(profile?.personality ?? [])] as PersonalityKey[])
    .map((p) => cellKey(profile?.voiceTone ?? ANY, p))
    .filter((key) => cells[key]?.length)
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
