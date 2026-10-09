import { useState } from 'react'
import { Banner, Button, ChoiceGroup, CityNavigator, FactionMark, InfoWindow, KnightCard, QuantityInput } from '../../src'
import { FACTIONS, KNIGHTS, UNIT_TYPES } from '../mock/data'
import { Log, useLog, Workbench } from '../Workbench'

export default function PartsEntry() {
  const [log, add] = useLog()
  const [unit, setUnit] = useState('infantry')
  const [soldiers, setSoldiers] = useState(240)
  const [selected, setSelected] = useState(true)
  const [city, setCity] = useState(0)
  const cities = ['フルーエン', 'ヴェステル', 'ミルデン']

  return <Workbench
    stage={<>
      <InfoWindow title="羊皮紙の上の部品" x={32} y={48} minWidth={460}>
        <div className="demo-parts">
          <h3>Button</h3>
          <div className="demo-row">
            <Button onClick={() => add('通常のボタン')}>通常</Button>
            <Button variant="primary" onClick={() => add('主なボタン')}>予約</Button>
            <Button disabled>無効</Button>
            <Button size="small">小さい</Button>
          </div>
          <h3>ChoiceGroup（兵科）</h3>
          <ChoiceGroup label="兵科" value={unit} onChange={value => { setUnit(value); add(`兵科: ${value}`) }}
            options={UNIT_TYPES.map(type => ({ value: type.id, label: type.name, title: type.description, disabled: type.id === 'mage' }))} />
          <h3>QuantityInput（兵数）</h3>
          <QuantityInput label="兵数" unit="人" value={soldiers} max={420} onChange={setSoldiers} />
          <h3>KnightCard</h3>
          <KnightCard knight={KNIGHTS[1]!} selection={{ selected, onToggle: () => setSelected(value => !value) }} aside="率兵 420" />
          <KnightCard knight={KNIGHTS[2]!} compact />
          <h3>FactionMark</h3>
          <div className="demo-row"><FactionMark faction={FACTIONS.carta} /><FactionMark faction={FACTIONS.leonis} /><FactionMark /></div>
        </div>
      </InfoWindow>
      <div className="demo-dark-parts">
        <CityNavigator name={cities[city]!} position={{ index: city, count: cities.length }}
          onPrev={() => setCity(value => (value + cities.length - 1) % cities.length)}
          onNext={() => setCity(value => (value + 1) % cities.length)} />
        <Banner actions={<Button variant="quiet" size="small" onClick={() => add('やめる')}>やめる</Button>}>
          フルーエンからの侵攻先を選んでください
        </Banner>
      </div>
    </>}
    controls={<>
      <h2>UIパーツ</h2>
      <p>ChoiceGroup は矢印キーで選択を移動できます。QuantityInput はスライダー・± ボタン・数値入力が連動し、範囲外の値は丸めます。</p>
      <dl className="demo-readout"><div><dt>兵科</dt><dd>{unit}</dd></div><div><dt>兵数</dt><dd>{soldiers}</dd></div></dl>
      <Log entries={log} />
    </>}
  />
}
