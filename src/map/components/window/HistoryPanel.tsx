import type { City } from '../../../data/city'

export default function HistoryPanel({ city }: { city: City }) {
  return (
    <div className="history-panel">
      <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
        {city.name}の歴史と略歴を確認できます。（準備中）
      </p>
    </div>
  )
}
