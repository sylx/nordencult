import iconDomestic from '../../assets/ui/icons/icon-territory.webp'
import iconMilitary from '../../assets/ui/icons/icon-military.webp'
import iconResearch from '../../assets/ui/icons/icon-knowledge.webp'
import iconNegotiation from '../../assets/ui/icons/icon-gold.webp'
import iconIntelligence from '../../assets/ui/icons/icon_stat.webp'

export type CityCommandId =
  | 'domestic'
  | 'move' | 'invade' | 'transport' | 'mercenary'
  | 'quest' | 'relic' | 'tech'
  | 'diplomacy' | 'prisoner' | 'merchant'
  | 'factionInfo' | 'mercenaryInfo' | 'geographyInfo' | 'relicInfo'

export interface CityCommandGroup {
  id: string
  label: string
  icon: string
  /** A group without commands is a command itself (its id is a CityCommandId) */
  commands?: readonly { id: CityCommandId; label: string }[]
}

/** The action toolbar of the city command screen, left to right. ターン終了 is added after these */
export const CITY_COMMAND_GROUPS: readonly CityCommandGroup[] = [
  { id: 'domestic', label: '内政', icon: iconDomestic },
  {
    id: 'military', label: '軍事', icon: iconMilitary,
    commands: [{ id: 'move', label: '移動' }, { id: 'invade', label: '侵攻' }, { id: 'transport', label: '輸送' }, { id: 'mercenary', label: '傭兵' }],
  },
  {
    id: 'research', label: '研究', icon: iconResearch,
    commands: [{ id: 'quest', label: '探索' }, { id: 'relic', label: '遺物' }, { id: 'tech', label: '技術' }],
  },
  {
    id: 'negotiation', label: '交渉', icon: iconNegotiation,
    commands: [{ id: 'diplomacy', label: '外交' }, { id: 'prisoner', label: '捕虜' }, { id: 'merchant', label: '商人' }],
  },
  {
    id: 'intelligence', label: '情報', icon: iconIntelligence,
    commands: [
      { id: 'factionInfo', label: '勢力' }, { id: 'mercenaryInfo', label: '傭兵' }, { id: 'geographyInfo', label: '地理' }, { id: 'relicInfo', label: '遺物' },
    ],
  },
]
