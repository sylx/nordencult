import { useState } from 'react'
import type { CSSProperties } from 'react'
import { NavigationWindow } from '../../src'
import { Log, useLog, Workbench } from '../Workbench'
import './WindowFrameEntry.css'

const pages = [
  { title: '都市の概要', heading: 'フルーエン', body: '川と街道が交わる交易都市。豊かな農地と市場が人々の暮らしを支えています。' },
  { title: '都市の記録', heading: '市場と工房', body: '市場には各地からの品々が集まり、工房では新たな施設の建設に向けて物資を整えています。' },
  { title: '都市の歴史', heading: '街道の先へ', body: '街道が隣の都市まで延び、商人たちは新たな交易路を開きました。この記録が最後のページです。' },
]

export default function NavigationWindowEntry() {
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(true)
  const [backDisabled, setBackDisabled] = useState(false)
  const [forwardDisabled, setForwardDisabled] = useState(false)
  const [title, setTitle] = useState('都市の記録')
  const [width, setWidth] = useState(640)
  const [height, setHeight] = useState(480)
  const [frameSize, setFrameSize] = useState(64)
  const [backdrop, setBackdrop] = useState('map')
  const [surface, setSurface] = useState(true)
  const [background, setBackground] = useState<'parchment' | 'dark'>('parchment')
  const [longContent, setLongContent] = useState(false)
  const [showTarget, setShowTarget] = useState(false)
  const [draggable, setDraggable] = useState(true)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [log, add] = useLog()
  const current = pages[page]!
  const style = {
    width, height,
    '--norden-window-frame-size': `${frameSize}px`,
    '--norden-window-surface-opacity': surface ? 1 : 0,
  } as CSSProperties
  const navigate = (next: number) => {
    setPage(next)
    setTitle(pages[next]!.title)
    add(`${next < page ? '戻る' : '進む'}：${pages[next]!.title}`)
  }
  const reset = () => {
    setPage(1); setOpen(true); setBackDisabled(false); setForwardDisabled(false)
    setTitle('都市の記録'); setWidth(640); setHeight(480); setFrameSize(64)
    setBackdrop('map'); setSurface(true); setBackground('parchment'); setLongContent(false); setShowTarget(false)
    setDraggable(true); setPosition({ x: 0, y: 0 })
    add('初期値に戻しました')
  }

  return <Workbench variant="screen" stageClassName={`window-frame-playground backdrop-${backdrop}`}
    stage={<div className="demo-window-frame-placement">
      {open ? <NavigationWindow title={title || undefined} aria-label="戻る・進むボタン付きウィンドウのプレビュー"
        style={style} background={background} className={`demo-window-frame-preview ${showTarget ? 'show-navigation-targets' : ''}`}
        draggable={draggable} position={position} onPositionChange={setPosition}
        onBack={() => navigate(Math.max(0, page - 1))} onForward={() => navigate(Math.min(pages.length - 1, page + 1))}
        backDisabled={backDisabled || page === 0} forwardDisabled={forwardDisabled || page === pages.length - 1}
        onClose={() => { setOpen(false); add('閉じる') }}>
        <div className="demo-window-frame-copy" aria-live="polite">
          <p className="demo-navigation-position">記録 {page + 1} / {pages.length}</p>
          <h2>{current.heading}</h2>
          <p>{current.body}</p>
          <h3>都市の便り</h3>
          {Array.from({ length: longContent ? 24 : 1 }, (_, index) =>
            <p key={index}>今日も街道を行き交う人々が、新しい知らせを運んできます。左上の矢印で前後の記録を開けます。</p>)}
        </div>
      </NavigationWindow> : <button className="reset-button" onClick={() => { setOpen(true); add('再表示') }}>ウィンドウを再表示</button>}
    </div>}
    controls={<>
      <h2>ウィンドウ（戻る・進むボタン付き）</h2>
      <p>左上の金の装飾に戻る・進むを埋め込んだ汎用ウィンドウです。前後の記録へ移動し、先頭・末尾では該当する矢印が無効になります。</p>
      <button className="reset-button" onClick={reset}>初期値に戻す</button>
      <p>タイトルをドラッグして移動できます。タイトルにフォーカスして矢印キーでも移動できます（Shiftで1px、Homeで元の位置）。</p>
      <label className="checkbox"><input type="checkbox" checked={draggable} onChange={event => setDraggable(event.target.checked)} />タイトルをドラッグして移動する</label>
      <button className="reset-button" onClick={() => { setPosition({ x: 0, y: 0 }); add('位置をリセット') }}>位置をリセット</button>
      <label className="checkbox"><input type="checkbox" checked={backDisabled} onChange={event => setBackDisabled(event.target.checked)} />戻るを無効にする</label>
      <label className="checkbox"><input type="checkbox" checked={forwardDisabled} onChange={event => setForwardDisabled(event.target.checked)} />進むを無効にする</label>
      <label htmlFor="navigation-title">ウィンドウタイトル（空欄で非表示）</label>
      <input id="navigation-title" value={title} onChange={event => setTitle(event.target.value)} />
      {[
        { id: 'width', label: '幅（px）', value: width, set: setWidth, min: 280, max: 1600 },
        { id: 'height', label: '高さ（px）', value: height, set: setHeight, min: 160, max: 1000 },
        { id: 'frame-size', label: '枠の装飾サイズ（px）', value: frameSize, set: setFrameSize, min: 48, max: 96 },
      ].map(field => <div key={field.id} className="demo-window-frame-field">
        <label htmlFor={`navigation-${field.id}`}>{field.label}</label>
        <input id={`navigation-${field.id}`} type="number" min={field.min} max={field.max} value={field.value}
          onChange={event => {
            const next = event.target.valueAsNumber
            if (Number.isFinite(next)) field.set(Math.min(field.max, Math.max(field.min, next)))
          }} />
      </div>)}
      <label htmlFor="navigation-background">ウィンドウの背景</label>
      <select id="navigation-background" value={background}
        onChange={event => setBackground(event.target.value as 'parchment' | 'dark')}>
        <option value="parchment">羊皮紙（デフォルト）</option><option value="dark">暗い地</option>
      </select>
      <label htmlFor="navigation-backdrop">透過確認の背景</label>
      <select id="navigation-backdrop" value={backdrop} onChange={event => setBackdrop(event.target.value)}>
        <option value="map">緑の背景</option><option value="light">白い背景</option>
        <option value="dark">黒い背景</option><option value="checker">市松模様</option>
      </select>
      <label className="checkbox"><input type="checkbox" checked={surface} onChange={event => setSurface(event.target.checked)} />背景の地を表示する</label>
      <label className="checkbox"><input type="checkbox" checked={longContent} onChange={event => setLongContent(event.target.checked)} />長い本文（スクロール確認）</label>
      <label className="checkbox"><input type="checkbox" checked={showTarget} onChange={event => setShowTarget(event.target.checked)} />ボタンの操作領域を表示する</label>
      <Log entries={log} />
    </>}
  />
}
