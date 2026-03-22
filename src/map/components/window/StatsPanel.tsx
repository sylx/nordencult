import type { City } from '../../../data/city'

export default function StatsPanel({ city }: { city: City }) {
  return (
    <div className="stats-panel">
      <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
        {city.name}の成長をグラフで確認できます。（準備中）
      </p>
    </div>
  )
}
