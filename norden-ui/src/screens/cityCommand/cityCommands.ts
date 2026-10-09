import iconDomestic from '../../assets/ui/hud/icon-territory.png'
import iconMilitary from '../../assets/ui/hud/icon-military.png'
import iconResearch from '../../assets/ui/hud/icon-knowledge.png'
import iconMerchant from '../../assets/ui/hud/icon-gold.png'

export type CityCommandId =
  | 'build' | 'assign'
  | 'move' | 'invade' | 'recruit' | 'transport'
  | 'research'
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
  { id: 'domestic', label: '内政', icon: iconDomestic, commands: [{ id: 'build', label: '建設' }, { id: 'assign', label: '割当' }] },
  {
    id: 'military', label: '軍事', icon: iconMilitary,
    commands: [{ id: 'move', label: '移動' }, { id: 'invade', label: '侵攻' }, { id: 'recruit', label: '募兵' }, { id: 'transport', label: '輸送' }],
  },
  { id: 'research', label: '研究', icon: iconResearch },
  { id: 'merchant', label: '商人', icon: iconMerchant, commands: [{ id: 'buy', label: '購入' }, { id: 'sell', label: '売却' }] },
]
