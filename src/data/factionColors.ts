/** Colour of each faction's armies on the map (the test colours of norden-strategy until the faction data has its own) */
export const FACTION_COLORS: Readonly<Record<string, string>> = {
  valhardt: '#3d5fa8',
  dracken: '#b0342c',
  leonis: '#d0a326',
  carta: '#4f8a63',
  aqua: '#2f93ad',
  rosalia: '#b24c80',
  taurus: '#8a6238',
  sede: '#e6dfc8',
}

export const NEUTRAL_COLOR = '#8a8a80'

export const factionColor = (id: string | null | undefined) => (id && FACTION_COLORS[id]) || NEUTRAL_COLOR
