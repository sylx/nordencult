import iconDomestic from '../../assets/ui/icons/icon-territory.webp'
import iconMilitary from '../../assets/ui/icons/icon-military.webp'
import iconResearch from '../../assets/ui/icons/icon-knowledge.webp'
import iconMerchant from '../../assets/ui/icons/icon-gold.webp'

export type CityCommandId =
  | 'domestic'
  | 'move' | 'invade' | 'transport'
  | 'quest' | 'tree'
  | 'buy' | 'sell'

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
    commands: [{ id: 'move', label: '移動' }, { id: 'invade', label: '侵攻' }, { id: 'transport', label: '輸送' }],
  },
  { id: 'research', label: '研究', icon: iconResearch,commands: [{ id: 'quest', label: '探索' }, { id: 'tree', label: 'ツリー' }] },
  { id: 'merchant', label: '商人', icon: iconMerchant, commands: [{ id: 'buy', label: '購入' }, { id: 'sell', label: '売却' }] },
]
