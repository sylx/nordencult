import type { TechView } from '../types'

/** Where a technology sits in the tree: its column (depth) and row */
export interface TechPlace {
  column: number
  row: number
}

export interface TechLayout {
  places: Readonly<Record<string, TechPlace>>
  columns: number
  rows: number
}

/**
 * Lays out the technologies left to right: a technology's column is one more than the deepest it requires (a root's 0,
 * every root side by side), and the rows follow the tree as a file list does, each technology on the row of its first
 * child, and every leaf a row of its own. A technology requiring several hangs under the deepest of them (the last of those equally deep), and one with
 * alignWith hangs under that one instead, taking its row (ignored unless it is among them and a column to the left).
 * Requirements not among them are left out; a technology in a cycle goes to column 0
 */
export function layoutTechs(techs: readonly TechView[]): TechLayout {
  const byId = new Map(techs.map(tech => [tech.id, tech]))
  const requires = (tech: TechView) => tech.requires.filter(id => byId.has(id))
  const depths = new Map<string, number>()
  const visiting = new Set<string>()
  const depthOf = (id: string): number => {
    const known = depths.get(id)
    if (known !== undefined) return known
    if (visiting.has(id)) return 0
    visiting.add(id)
    const depth = Math.max(-1, ...requires(byId.get(id)!).map(depthOf)) + 1
    visiting.delete(id)
    depths.set(id, depth)
    return depth
  }
  for (const tech of techs) depthOf(tech.id)

  /** The technology it is to share a row with, if that can be drawn */
  const alignedWith = ({ id, alignWith }: TechView) =>
    (alignWith && byId.has(alignWith) && depths.get(alignWith)! < depths.get(id)! ? alignWith : undefined)

  /** The technology each hangs under */
  const parentOf = new Map<string, string>()
  for (const tech of techs) {
    const aligned = alignedWith(tech)
    if (aligned) {
      parentOf.set(tech.id, aligned)
      continue
    }
    const parents = requires(tech)
    if (parents.length === 0) continue
    const deepest = Math.max(...parents.map(id => depths.get(id)!))
    parentOf.set(tech.id, parents.filter(id => depths.get(id) === deepest).at(-1)!)
  }
  const places: Record<string, TechPlace> = {}
  let next = 0
  const place = (tech: TechView): number => {
    const placed = places[tech.id]
    if (placed) return placed.row
    // One aligned first: a technology takes the row of its first child
    const children = techs.filter(child => parentOf.get(child.id) === tech.id && depths.get(child.id)! > depths.get(tech.id)!)
      .sort((a, b) => Number(alignedWith(b) !== undefined) - Number(alignedWith(a) !== undefined))
    // Placed before its children so that a cycle stops here
    const at: TechPlace = { column: depths.get(tech.id)!, row: next }
    places[tech.id] = at
    if (children.length === 0) next++
    else at.row = children.map(place)[0]!
    return at.row
  }
  for (const tech of techs) if (!parentOf.has(tech.id) || !byId.has(parentOf.get(tech.id)!)) place(tech)
  for (const tech of techs) place(tech)
  const values = Object.values(places)
  return {
    places,
    columns: values.length > 0 ? Math.max(...values.map(p => p.column)) + 1 : 0,
    rows: next,
  }
}
