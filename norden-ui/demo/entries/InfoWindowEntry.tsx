import { useState } from 'react'
import type { CSSProperties } from 'react'
import { InfoWindowWithTabs, windowSkins } from '../../src'
import type { TabInfo } from '../../src'
import { resolveWindowSkin } from '../../src/skins'
import stats from '../../src/assets/ui/icons/icon_stat.webp'
import history from '../../src/assets/ui/icons/icon_history.webp'
import { createCityInfoTabs } from '../../src/screens/cityCommand/CityInfoWindow'
import { KNIGHTS, cityView } from '../mock/data'

const descriptions = {
  short: '港湾都市。',
  medium: '西岸の河口に築かれた、王国の交易を支える港湾都市。',
  long: '西岸の河口に築かれた、王国の交易を支える港湾都市。北方の山々から届く木材と、南の平原で収穫された穀物が集まる。',
}

const knightCounts = [0, 1, 4, 8, 12, 20]
/** Repeats the mock cast so the 騎士 tab can grow past the window's height */
const knightsFor = (count: number) => Array.from({ length: count }, (_, index) => ({ ...KNIGHTS[index % KNIGHTS.length]!, id: `knight-${index}` }))

export default function InfoWindowEntry() {
  const [title, setTitle] = useState('カルタ書院 フルーエン')
  const [length, setLength] = useState<keyof typeof descriptions>('medium')
  const [count, setCount] = useState(4)
  const [knightCount, setKnightCount] = useState(4)
  const [fixed, setFixed] = useState(false)
  const [resizable, setResizable] = useState(false)
  const [active, setActive] = useState(0)
  const [instance, setInstance] = useState(0)
  const [position, setPosition] = useState({ x: 72, y: 56 })
  /** null until resized by hand; InfoWindow drops the manual size on skin or fixed-size changes */
  const [manualSize, setManualSize] = useState<{ width: number; height: number } | null>(null)
  const [skin, setSkin] = useState<'thin' | 'medium' | 'goddess'>('medium')
  const [backdrop, setBackdrop] = useState('map')
  const [paperVisible, setPaperVisible] = useState(true)
  const [showTitleBar, setShowTitleBar] = useState(true)
  const [titleBarOffset, setTitleBarOffset] = useState<{ x?: number; y?: number }>({})
  const skinLayout = resolveWindowSkin(windowSkins[skin]).layout

  const cityTabs = createCityInfoTabs(cityView('P012', knightsFor(knightCount)))
  const tabs: TabInfo[] = [
    cityTabs[0],
    cityTabs[1],
    {
      id: 'stats', name: '統計', icon: stats,
      content: <div className="statistics-panel"><h2>都市の統計</h2><p>今期の収入と支出</p><dl className="facts"><div><dt>交易収入</dt><dd>+620</dd></div><div><dt>駐留費用</dt><dd>−180</dd></div><div><dt>収支</dt><dd>+440</dd></div></dl><p className="city-description">{descriptions[length]}</p></div>,
    },
    {
      id: 'history', name: '歴史', icon: history,
      content: <div className="history-panel"><h2>フルーエンの記録</h2><ol><li><span>王暦312年 春</span><p>西の港に交易船が到着。都市の市場が賑わいを見せる。</p></li><li><span>王暦311年 冬</span><p>市場の拡張工事が始まる。完成まであと2ターン。</p></li><li><span>王暦311年 秋</span><p>カルタ書院との交易協定が結ばれる。</p></li></ol></div>,
    },
  ]

  return <div className="demo-workspace">
    <section className={`demo-stage window-preview backdrop-${backdrop}`} aria-label="コンポーネントプレビュー">
      <div className="stage-caption"><span className="live-dot" /> LIVE PREVIEW</div>
      <InfoWindowWithTabs key={instance} title={title} showTitleBar={showTitleBar}
        titleBarOffset={titleBarOffset} tabs={tabs.slice(0, count)}
        x={72} y={56} activeTab={active} onActiveTabChange={setActive}
        width={fixed ? 420 : 'auto'} height={fixed ? 520 : 'auto'}
        resizable={resizable} onPositionChange={setPosition} onSizeChange={setManualSize}
        skin={windowSkins[skin]} style={paperVisible ? undefined : { '--norden-paper': 'none' } as CSSProperties}
        emptyContent={<p>表示する情報がありません。</p>}
      />
      <div className="stage-hint">{showTitleBar && 'タイトルをドラッグして移動 · '}タブは ↑ ↓ キーで切替</div>
    </section>
    <aside className="demo-controls" aria-label="表示設定">
      <span className="eyebrow">PLAYGROUND</span><h2>表示設定</h2><p>文字量やサイズを変えて、ゲーム内での振る舞いを確認できます。</p>
      <label htmlFor="window-skin">装飾スキン</label>
      <select id="window-skin" value={skin} onChange={event => {
        setSkin(event.target.value as typeof skin)
        setTitleBarOffset({})
        setManualSize(null)
      }}>
        <option value="thin">細いベゼル</option><option value="medium">中程度の装飾（medium）</option><option value="goddess">女神像の装飾</option>
      </select>
      <label htmlFor="preview-backdrop">透過確認の背景</label>
      <select id="preview-backdrop" value={backdrop} onChange={event => setBackdrop(event.target.value)}>
        <option value="map">緑の背景</option><option value="light">白い背景</option><option value="dark">黒い背景</option><option value="checker">市松模様</option>
      </select>
      <label className="checkbox"><input type="checkbox" checked={paperVisible} onChange={event => setPaperVisible(event.target.checked)} />羊皮紙を表示する</label>
      <label className="checkbox"><input type="checkbox" checked={showTitleBar} onChange={event => setShowTitleBar(event.target.checked)} />タイトルバーを表示する</label>
      <label htmlFor="title-offset-x">タイトルバーの横オフセット（px）</label>
      <input id="title-offset-x" type="number" step="1" value={titleBarOffset.x ?? skinLayout.titleOffsetX}
        onChange={event => setTitleBarOffset(offset => ({ ...offset, x: event.target.value === '' ? undefined : event.target.valueAsNumber }))} />
      <label htmlFor="title-offset-y">タイトルバーの縦オフセット（px）</label>
      <input id="title-offset-y" type="number" step="1" value={titleBarOffset.y ?? skinLayout.titleOffset}
        onChange={event => setTitleBarOffset(offset => ({ ...offset, y: event.target.value === '' ? undefined : event.target.valueAsNumber }))} />
      <button className="reset-button" onClick={() => setTitleBarOffset({})}>スキンのタイトル位置に戻す</button>
      <label htmlFor="window-title">ウィンドウのタイトル</label>
      <textarea id="window-title" value={title} onChange={event => setTitle(event.target.value)} rows={3} />
      <label htmlFor="content-length">本文の長さ（統計タブ）</label>
      <select id="content-length" value={length} onChange={event => {
        setLength(event.target.value as keyof typeof descriptions)
        if (count >= 3) setActive(2)
      }}><option value="short">短い文章</option><option value="medium">標準の文章</option><option value="long">長い文章</option></select>
      <label htmlFor="tab-count">タブ数</label>
      <select id="tab-count" value={count} onChange={event => setCount(Number(event.target.value))}>{[0, 1, 2, 3, 4].map(value => <option key={value} value={value}>{value}個</option>)}</select>
      <label htmlFor="knight-count">騎士の人数（騎士タブ）</label>
      <select id="knight-count" value={knightCount} onChange={event => {
        setKnightCount(Number(event.target.value))
        if (count >= 2) setActive(1)
      }}>{knightCounts.map(value => <option key={value} value={value}>{value}人</option>)}</select>
      <label className="checkbox"><input type="checkbox" checked={fixed} onChange={event => { setFixed(event.target.checked); setManualSize(null) }} />固定サイズ（420 × 520）</label>
      <label className="checkbox"><input type="checkbox" checked={resizable} onChange={event => setResizable(event.target.checked)} />手動リサイズを有効にする</label>
      <button className="reset-button" onClick={() => { setInstance(value => value + 1); setPosition({ x: 72, y: 56 }); setManualSize(null) }}>位置・手動サイズをリセット</button>
      <dl className="demo-readout"><div><dt>位置</dt><dd>{Math.round(position.x)}, {Math.round(position.y)}</dd></div><div><dt>サイズ</dt><dd>{manualSize ? `${Math.round(manualSize.width)} × ${Math.round(manualSize.height)} px` : '自動'}</dd></div><div><dt>選択中</dt><dd>{count ? tabs[Math.min(active, count - 1)]?.name : 'なし'}</dd></div><div><dt>幅の上限</dt><dd>720 px</dd></div></dl>
    </aside>
  </div>
}
