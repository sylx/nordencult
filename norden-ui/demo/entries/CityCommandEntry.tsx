import { useState } from 'react'
import { CityCommandScreen, windowSkins } from '../../src'
import { TURN, cityView, playerCities } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

export default function CityCommandEntry() {
  const [log, add] = useLog()
  const [index, setIndex] = useState(0)
  const [noKnights, setNoKnights] = useState(false)
  const [endTurnDisabled, setEndTurnDisabled] = useState(false)
  const [skin, setSkin] = useState<keyof typeof windowSkins>('medium')
  const cityId = playerCities[index]!
  const step = (delta: number) => setIndex(value => (value + delta + playerCities.length) % playerCities.length)

  return <Workbench variant="screen"
    stage={<>
      <MockMap selected={cityId} />
      <CityCommandScreen key={skin} city={cityView(cityId, noKnights ? [] : undefined)} turn={TURN} skin={windowSkins[skin]}
        cityPosition={{ index, count: playerCities.length }} onPrevCity={() => step(-1)} onNextCity={() => step(1)}
        commandState={{
          invade: noKnights ? { disabled: true, reason: '出撃できる騎士がいません' } : undefined,
          research: { disabled: true, reason: '研究所がありません' },
        }}
        onCommand={id => add(`コマンド: ${id}`)} onEndTurn={() => add('ターン終了')} endTurnDisabled={endTurnDisabled}
        onSelectNeighbour={id => add(`街道の都市: ${id}`)} />
    </>}
    controls={<>
      <h2>都市コマンド画面</h2>
      <p>◀ ▶ で自勢力の都市を切り替えます。「研究」は無効の例です（理由はツールチップ）。</p>
      <label className="checkbox"><input type="checkbox" checked={noKnights} onChange={event => setNoKnights(event.target.checked)} />騎士がいない（侵攻を無効に）</label>
      <label className="checkbox"><input type="checkbox" checked={endTurnDisabled} onChange={event => setEndTurnDisabled(event.target.checked)} />ターン終了を無効にする</label>
      <label htmlFor="city-skin">ウィンドウのスキン</label>
      <select id="city-skin" value={skin} onChange={event => setSkin(event.target.value as typeof skin)}>
        <option value="thin">細いベゼル</option><option value="medium">中程度の装飾</option><option value="goddess">女神像の装飾</option>
      </select>
      <Log entries={log} />
    </>}
  />
}
