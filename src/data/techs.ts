import type { BuildingEffect } from './buildings'
import techData from './techData.json'

/** 物理文明・魔法文明: the two trees, and the 系統 of a research building */
export type TechBranch = 'physical' | 'arcane'

export const TECH_BRANCH_LABELS: Readonly<Record<TechBranch, string>> = { physical: '物理文明', arcane: '魔法文明' }

/**
 * What a technology researched does to every city of its faction: the kinds of the buildings' effects that are
 * the city's numbers (describeEffect writes them), or an effect the game cannot do yet (etc, written out)
 */
export type TechEffect = Extract<BuildingEffect, { kind: 'marketPct' | 'productionPct' | 'growthPct' | 'trainingPct' | 'recruitPct' | 'recruitMorale' | 'etc' }>

/** Master data of a technology (written by norden-data's technology editor) */
export interface Tech {
  id: string
  name: string
  description: string
  branch: TechBranch
  /** Research points it takes */
  cost: number
  /** The technologies it needs, every one of them researched; a root (物理文明・魔法文明) needs none */
  requires: string[]
  effects: TechEffect[]
  /** Top-left of its picture in src/assets/techs.webp (pixels; the sizes in techSprite.json), as a building's sprite */
  sprite?: { x: number; y: number }
}

export const TECH_LIST: readonly Tech[] = techData as Tech[]

export const TECH_MAP: Readonly<Record<string, Tech>> = Object.fromEntries(TECH_LIST.map((t) => [t.id, t]))

/** The technologies needing a technology directly, in data order */
export const techChildren = (techId: string): Tech[] => TECH_LIST.filter((t) => t.requires.includes(techId))

/**
 * Each technology's depth in its tree: 0 for a root, else one more than the deepest it requires
 * (the column the technology screen draws it in). A technology in a cycle or requiring one unknown gets none
 */
export function techDepths(techs: readonly Tech[] = TECH_LIST): Record<string, number> {
  const byId = new Map(techs.map((t) => [t.id, t]))
  const depths: Record<string, number> = {}
  const visiting = new Set<string>()
  const depth = (id: string): number | undefined => {
    if (id in depths) return depths[id]
    const tech = byId.get(id)
    if (!tech || visiting.has(id)) return undefined
    visiting.add(id)
    let deepest = -1
    for (const required of tech.requires) {
      const d = depth(required)
      if (d === undefined) {
        visiting.delete(id)
        return undefined
      }
      deepest = Math.max(deepest, d)
    }
    visiting.delete(id)
    depths[id] = deepest + 1
    return depths[id]
  }
  for (const tech of techs) depth(tech.id)
  return depths
}

/** What is wrong with the technologies' data: a technology required that is not one, a cycle of them; empty when nothing is */
export function techDataProblems(techs: readonly Tech[] = TECH_LIST): string[] {
  const ids = new Set(techs.map((t) => t.id))
  const problems: string[] = []
  for (const tech of techs) {
    for (const required of tech.requires) if (!ids.has(required)) problems.push(`${tech.id} の前提 ${required} は技術ではありません`)
  }
  if (problems.length > 0) return problems
  const depths = techDepths(techs)
  for (const tech of techs) if (!(tech.id in depths)) problems.push(`${tech.id} の前提が循環しています`)
  return problems
}
