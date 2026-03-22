import { useMemo } from 'react'
import { CHARACTER_LIST } from '../../../data/character'
import CharacterImage from '../../../ui/components/CharacterImage'
import './KnightsPanel.css'

const CHARACTER_TYPE_LABELS: Record<string, string> = {
  knight: '騎士',
  scholar: '学者',
  politician: '政治家',
  magician: '魔法使い',
  hunter: '狩人',
}

export default function KnightsPanel({ cityId }: { cityId: string }) {
  const characters = useMemo(
    () => CHARACTER_LIST.filter((c) => c.belongTo === cityId),
    [cityId],
  )

  if (characters.length === 0) {
    return <p className="knights-panel-empty">この都市に所属する騎士はいません。</p>
  }

  return (
    <div className="knights-panel">
      {characters.map((c) => (
        <div key={c.id} className="knights-panel-item">
          <div className="knights-panel-face">
            <CharacterImage character={c} mode="face" />
          </div>
          <div className="knights-panel-info">
            <span className="knights-panel-name">{c.name}</span>
            <span className="knights-panel-type">
              {CHARACTER_TYPE_LABELS[c.type] ?? c.type}
              {c.isLord && ' / 領主'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
