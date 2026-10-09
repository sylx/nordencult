import { useEffect, useRef, useState } from 'react'
import { Banner, Button, Card, ChoiceGroup, CityNavigator, FactionMark, InfoWindow, KnightCard, QuantityInput } from '../../src'
import { repositoryCharacters, RepositoryPortrait } from '../repositoryCharacters'
import { FACTIONS, KNIGHTS, UNIT_TYPES } from '../mock/data'
import { Log, useLog, Workbench } from '../Workbench'

export default function PartsEntry() {
  const [log, add] = useLog()
  const [unit, setUnit] = useState('infantry')
  const [soldiers, setSoldiers] = useState(240)
  const [selected, setSelected] = useState(true)
  const [city, setCity] = useState(0)
  const [characterId, setCharacterId] = useState(repositoryCharacters[0]?.id ?? '')
  const character = repositoryCharacters.find(item => item.id === characterId)
  const [portraitMode, setPortraitMode] = useState('repository')
  const [portraitUrl, setPortraitUrl] = useState('')
  const [uploadedUrl, setUploadedUrl] = useState('')
  const uploadedRef = useRef('')
  const [name, setName] = useState(character?.name ?? KNIGHTS[1]!.name)
  const [stats, setStats] = useState({ leadership: character?.leadership ?? 84, strength: character?.strength ?? 86, intelligence: character?.intelligence ?? 52 })
  const [buttonWidth, setButtonWidth] = useState(160)
  const [buttonHeight, setButtonHeight] = useState(44)
  const [buttonMetal, setButtonMetal] = useState<'gold' | 'silver'>('gold')
  useEffect(() => () => { if (uploadedRef.current) URL.revokeObjectURL(uploadedRef.current) }, [])
  const preview = {
    name, subtitle: '騎士 / プレビュー',
    portrait: portraitMode === 'repository' && character ? <RepositoryPortrait character={character} /> : undefined,
    portraitSrc: portraitMode === 'url' ? portraitUrl : portraitMode === 'upload' ? uploadedUrl : undefined,
    stats: [{ label: '統率', value: stats.leadership }, { label: '武力', value: stats.strength }, { label: '知力', value: stats.intelligence }],
  }
  const cities = ['フルーエン', 'ヴェステル', 'ミルデン']

  return <Workbench
    stage={<>
      <InfoWindow title="羊皮紙の上の部品" x={32} y={210} minWidth={520}>
        <div className="demo-parts">
          <h3>Button</h3>
          <div className="demo-row">
            <Button metal="silver" onClick={() => add('銀装飾のボタン')}>象牙・銀</Button>
            <Button metal="gold" onClick={() => add('金装飾のボタン')}>象牙・金</Button>
            <Button variant="primary" onClick={() => add('主なボタン')}>予約</Button>
            <Button disabled>無効</Button>
            <Button size="small">小さい</Button>
            <Button metal={buttonMetal} style={{ width: buttonWidth, height: buttonHeight }} onClick={() => add('任意サイズのボタン')}>出撃する</Button>
          </div>
          <h3>ChoiceGroup（兵科）</h3>
          <ChoiceGroup label="兵科" value={unit} onChange={value => { setUnit(value); add(`兵科: ${value}`) }}
            options={UNIT_TYPES.map(type => ({ value: type.id, label: type.name, title: type.description, disabled: type.id === 'mage' }))} />
          <h3>QuantityInput（兵数）</h3>
          <QuantityInput label="兵数" unit="人" value={soldiers} max={420} onChange={setSoldiers} />
          <h3>KnightCard</h3>
          <KnightCard knight={preview} selection={{ selected, onToggle: () => setSelected(value => !value) }} aside="率兵 420" />
          <KnightCard knight={KNIGHTS[2]!} compact />
          <h3>Card</h3>
          <Card><strong>騎士団の記録</strong><p className="demo-card-description">羊皮紙とインクの装飾枠。任意の内容を配置できます。</p></Card>
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
      <h3>ボタンの寸法</h3>
      <label htmlFor="button-metal">四隅の装飾</label>
      <select id="button-metal" value={buttonMetal} onChange={event => setButtonMetal(event.target.value as 'gold' | 'silver')}>
        <option value="gold">金</option>
        <option value="silver">銀</option>
      </select>
      <label htmlFor="button-width">幅（px）</label>
      <input id="button-width" type="number" min={80} max={360} value={buttonWidth} onChange={event => setButtonWidth(Math.min(360, Math.max(80, Number(event.target.value))))} />
      <label htmlFor="button-height">高さ（px）</label>
      <input id="button-height" type="number" min={40} max={100} value={buttonHeight} onChange={event => setButtonHeight(Math.min(100, Math.max(40, Number(event.target.value))))} />
      <h3>騎士のプレビュー</h3>
      <label htmlFor="portrait-mode">画像の表示</label>
      <select id="portrait-mode" value={portraitMode} onChange={event => setPortraitMode(event.target.value)}>
        <option value="repository" disabled={!repositoryCharacters.length}>ゲームの人物素材</option>
        <option value="url">画像URL</option>
        <option value="upload">生成した画像ファイル</option>
        <option value="initial">頭文字</option>
      </select>
      {portraitMode === 'repository' && <>
        <label htmlFor="repository-character">人物</label>
        <select id="repository-character" value={characterId} disabled={!repositoryCharacters.length} onChange={event => {
          setCharacterId(event.target.value)
          const next = repositoryCharacters.find(item => item.id === event.target.value)
          if (next) { setName(next.name); setStats({ leadership: next.leadership, strength: next.strength, intelligence: next.intelligence }) }
        }}>{repositoryCharacters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {!repositoryCharacters.length && <p>親のゲーム素材がないため、頭文字を表示します。</p>}
      </>}
      {portraitMode === 'url' && <>
        <label htmlFor="portrait-url">画像URL</label>
        <input id="portrait-url" type="text" value={portraitUrl} placeholder="https://… または /assets/…" onChange={event => setPortraitUrl(event.target.value)} />
      </>}
      {portraitMode === 'upload' && <>
        <label htmlFor="portrait-file">画像ファイル</label>
        <input id="portrait-file" type="file" accept="image/*" onChange={event => {
          const file = event.target.files?.[0]
          if (!file) return
          if (uploadedRef.current) URL.revokeObjectURL(uploadedRef.current)
          uploadedRef.current = URL.createObjectURL(file)
          setUploadedUrl(uploadedRef.current)
        }} />
      </>}
      <label htmlFor="knight-name">名前</label>
      <input id="knight-name" type="text" value={name} onChange={event => setName(event.target.value)} />
      {([{ key: 'leadership', label: '統率' }, { key: 'strength', label: '武力' }, { key: 'intelligence', label: '知力' }] as const).map(stat => <div key={stat.key} className="demo-stat-control">
        <label htmlFor={`knight-${stat.key}`}>{stat.label}</label>
        <input id={`knight-${stat.key}`} type="number" min={0} max={100} value={stats[stat.key]} onChange={event => setStats(current => ({ ...current, [stat.key]: Math.min(100, Math.max(0, Number(event.target.value))) }))} />
      </div>)}
      <p>能力の色：50未満は赤、50以上は茶、75以上は緑、90以上は紫。画像ファイルはこの画面内でプレビューします。</p>
      <dl className="demo-readout"><div><dt>兵科</dt><dd>{unit}</dd></div><div><dt>兵数</dt><dd>{soldiers}</dd></div></dl>
      <Log entries={log} />
    </>}
  />
}
