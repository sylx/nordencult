import { useState } from 'react'
import type { CSSProperties } from 'react'
import { InfoWindowWithTabs, windowSkins } from '../src'
import type { TabInfo } from '../src'
import home from '../src/assets/ui/icons/icon_home.webp'
import people from '../src/assets/ui/icons/icon_people.webp'
import stats from '../src/assets/ui/icons/icon_stat.webp'
import history from '../src/assets/ui/icons/icon_history.webp'
import city from './assets/place_city.webp'

const descriptions = {
  short: '港湾都市。',
  medium: '西岸の河口に築かれた、王国の交易を支える港湾都市。',
  long: '西岸の河口に築かれた、王国の交易を支える港湾都市。北方の山々から届く木材と、南の平原で収穫された穀物が集まる。',
}

export default function App() {
  const [title, setTitle] = useState('カルタ書院 フルーエン')
  const [length, setLength] = useState<keyof typeof descriptions>('medium')
  const [count, setCount] = useState(4)
  const [fixed, setFixed] = useState(false)
  const [resizable, setResizable] = useState(false)
  const [active, setActive] = useState(0)
  const [instance, setInstance] = useState(0)
  const [position, setPosition] = useState({ x: 72, y: 56 })
  const [skin, setSkin] = useState<'thin' | 'medium' | 'goddess'>('medium')
  const [backdrop, setBackdrop] = useState('map')
  const [paperVisible, setPaperVisible] = useState(true)

  const tabs: TabInfo[] = [
    {
      id: 'city', name: '都市情報', icon: home,
      content: <div className="city-panel">
        <div className="city-heading"><span className="city-mark">✦</span><div><h2>フルーエン</h2><span>西岸地方・港湾都市</span></div></div>
        <div className="city-overview"><dl className="facts">
          <div><dt>領主</dt><dd>マルクス・カルタ</dd></div>
          <div><dt>人口</dt><dd>11,000</dd></div>
          <div><dt>規模</dt><dd>大きな街</dd></div>
        </dl><img className="city-illustration" src={city} alt="フルーエンの街並み" /></div>
        <p className="city-description">{descriptions[length]}</p>
        <h3>都市の状況</h3>
        <div className="city-metrics"><div>治安<strong>82</strong></div><div>民忠<strong>76</strong></div><div>収支<strong className="positive">+440</strong></div></div>
        <h3>産業</h3>
        <div className="industry"><span>農業</span><progress value={220} max={640} /><span>220</span></div>
        <div className="industry"><span>商業</span><progress value={440} max={640} /><span>440</span></div>
        <div className="industry"><span>軍事</span><progress value={220} max={640} /><span>220</span></div>
      </div>,
    },
    {
      id: 'knights', name: '騎士', icon: people,
      content: <div className="knights-panel"><h2>駐留する騎士</h2><p>都市を守る二人の騎士。</p><table><thead><tr><th>名前</th><th>兵科</th><th>兵力</th></tr></thead><tbody><tr><td>エルネスト</td><td>重装歩兵</td><td>240</td></tr><tr><td>リディア</td><td>弓兵</td><td>180</td></tr></tbody></table></div>,
    },
    {
      id: 'stats', name: '統計', icon: stats,
      content: <div className="statistics-panel"><h2>都市の統計</h2><p>今期の収入と支出</p><dl className="facts"><div><dt>交易収入</dt><dd>+620</dd></div><div><dt>駐留費用</dt><dd>−180</dd></div><div><dt>収支</dt><dd>+440</dd></div></dl></div>,
    },
    {
      id: 'history', name: '歴史', icon: history,
      content: <div className="history-panel"><h2>フルーエンの記録</h2><ol><li><span>王暦312年 春</span><p>西の港に交易船が到着。都市の市場が賑わいを見せる。</p></li><li><span>王暦311年 冬</span><p>市場の拡張工事が始まる。完成まであと2ターン。</p></li><li><span>王暦311年 秋</span><p>カルタ書院との交易協定が結ばれる。</p></li></ol></div>,
    },
  ]

  return <main className="demo">
    <header className="demo-header"><div><span className="eyebrow">NORDENCULT / COMPONENT LIBRARY</span><h1>norden<span>ui</span></h1></div><div className="demo-version">InfoWindowWithTabs <span>v0.1.0</span></div></header>
    <div className="demo-workspace">
      <section className={`demo-stage backdrop-${backdrop}`} aria-label="コンポーネントプレビュー">
        <div className="stage-caption"><span className="live-dot" /> LIVE PREVIEW</div>
        <InfoWindowWithTabs key={instance} title={title} tabs={tabs.slice(0, count)}
          x={72} y={56} activeTab={active} onActiveTabChange={setActive}
          width={fixed ? 420 : 'auto'} height={fixed ? 520 : 'auto'}
          resizable={resizable} onPositionChange={setPosition}
          skin={windowSkins[skin]} style={paperVisible ? undefined : { '--norden-paper': 'none' } as CSSProperties}
          emptyContent={<p>表示する情報がありません。</p>}
        />
        <div className="stage-hint">タイトルをドラッグして移動 · タブは ↑ ↓ キーで切替</div>
      </section>
      <aside className="demo-controls" aria-label="表示設定">
        <span className="eyebrow">PLAYGROUND</span><h2>表示設定</h2><p>文字量やサイズを変えて、ゲーム内での振る舞いを確認できます。</p>
        <label htmlFor="window-skin">装飾スキン</label>
        <select id="window-skin" value={skin} onChange={event => setSkin(event.target.value as typeof skin)}>
          <option value="thin">細いベゼル</option><option value="medium">中程度の装飾（medium）</option><option value="goddess">女神像の装飾</option>
        </select>
        <label htmlFor="preview-backdrop">透過確認の背景</label>
        <select id="preview-backdrop" value={backdrop} onChange={event => setBackdrop(event.target.value)}>
          <option value="map">緑の背景</option><option value="light">白い背景</option><option value="dark">黒い背景</option><option value="checker">市松模様</option>
        </select>
        <label className="checkbox"><input type="checkbox" checked={paperVisible} onChange={event => setPaperVisible(event.target.checked)} />羊皮紙を表示する</label>
        <label htmlFor="window-title">ウィンドウのタイトル</label>
        <textarea id="window-title" value={title} onChange={event => setTitle(event.target.value)} rows={3} />
        <label htmlFor="content-length">本文の長さ</label>
        <select id="content-length" value={length} onChange={event => setLength(event.target.value as keyof typeof descriptions)}><option value="short">短い文章</option><option value="medium">標準の文章</option><option value="long">長い文章</option></select>
        <label htmlFor="tab-count">タブ数</label>
        <select id="tab-count" value={count} onChange={event => setCount(Number(event.target.value))}>{[0, 1, 2, 3, 4].map(value => <option key={value} value={value}>{value}個</option>)}</select>
        <label className="checkbox"><input type="checkbox" checked={fixed} onChange={event => setFixed(event.target.checked)} />固定サイズ（420 × 520）</label>
        <label className="checkbox"><input type="checkbox" checked={resizable} onChange={event => setResizable(event.target.checked)} />手動リサイズを有効にする</label>
        <button className="reset-button" onClick={() => { setInstance(value => value + 1); setPosition({ x: 72, y: 56 }) }}>位置・手動サイズをリセット</button>
        <dl className="demo-readout"><div><dt>位置</dt><dd>{Math.round(position.x)}, {Math.round(position.y)}</dd></div><div><dt>選択中</dt><dd>{count ? tabs[Math.min(active, count - 1)]?.name : 'なし'}</dd></div><div><dt>幅の上限</dt><dd>720 px</dd></div></dl>
      </aside>
    </div>
    <footer className="demo-footer"><span>羊皮紙と金の装飾。ゲームの情報を、ひとつの窓に。</span><span>React + TypeScript</span></footer>
  </main>
}
