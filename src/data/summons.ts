import summonNames from './summonNames.json'

/** The names a summoned unit can be given automatically, by its template (a special character's id, '991' …) */
export const SUMMON_NAMES: Readonly<Record<string, readonly string[]>> = summonNames
