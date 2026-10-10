import { useState } from 'react'
import { CityCommandScreen, windowSkins } from '../../src'
import { TURN, cityView, playerCities } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'
import { repositoryCharacters, RepositoryCharacterArt } from '../repositoryCharacters'

export default function CityCommandEntry() {
  const [log, add] = useLog()
  const [index, setIndex] = useState(0)
  const [noKnights, setNoKnights] = useState(false)
  const [endTurnDisabled, setEndTurnDisabled] = useState(false)
  const [skin, setSkin] = useState<keyof typeof windowSkins>('medium')
  const [lordId, setLordId] = useState('city')
  const cityId = playerCities[index]!
  const city = cityView(cityId, noKnights ? [] : undefined)
  const lordCharacter = repositoryCharacters.find(character => character.id === lordId)
  const lord = lordId === 'city' ? city.lord : lordCharacter
    ? { name: lordCharacter.name, image: <RepositoryCharacterArt character={lordCharacter} /> } : undefined
  const step = (delta: number) => setIndex(value => (value + delta + playerCities.length) % playerCities.length)

  return <Workbench variant="screen" stageClassName="city-command-preview"
    stage={<>
      <MockMap selected={cityId} />
      <CityCommandScreen key={skin} city={{ ...city, lord }} turn={TURN} skin={windowSkins[skin]}
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
      <label htmlFor="city-lord">領主画像</label>
      <select id="city-lord" value={lordId} onChange={event => setLordId(event.target.value)}>
        <option value="city">都市の領主</option>
        <option value="none">領主なし</option>
        {repositoryCharacters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
      </select>
      <p>領主を切り替えて、立ち絵の大きさと配置を確認できます。</p>
      <label htmlFor="city-skin">ウィンドウのスキン</label>
      <select id="city-skin" value={skin} onChange={event => setSkin(event.target.value as typeof skin)}>
        <option value="thin">細いベゼル</option><option value="medium">中程度の装飾</option><option value="goddess">女神像の装飾</option>
      </select>
      <Log entries={log} />
    </>}
  />
}
