import { useState } from 'react'
import type { CSSProperties } from 'react'
import { WindowFrame } from '../../src'
import { Log, useLog, Workbench } from '../Workbench'
import './WindowFrameEntry.css'

const defaults = {
  width: 640, height: 480, frameSize: 64,
  closeSize: 44, iconSize: 20, closeX: 0, closeY: 0,
  contentTop: 44, contentLeft: 30, contentRight: 25, contentBottom: 40,
  surfaceInset: 18, surfaceRadius: 20,
}

const fields: { key: keyof typeof defaults; label: string; min: number; max: number }[] = [
  { key: 'width', label: '幅（px）', min: 256, max: 1600 },
  { key: 'height', label: '高さ（px）', min: 160, max: 1000 },
  { key: 'frameSize', label: '枠の装飾サイズ（px）', min: 48, max: 128 },
  { key: 'closeX', label: '閉じる位置・横（px・正で左へ）', min: -24, max: 24 },
  { key: 'closeY', label: '閉じる位置・縦（px・正で下へ）', min: -24, max: 24 },
  { key: 'closeSize', label: '閉じる操作領域（px）', min: 32, max: 64 },
  { key: 'iconSize', label: '× のサイズ（px）', min: 12, max: 36 },
  { key: 'contentTop', label: '内容の上余白（px）', min: 0, max: 160 },
  { key: 'contentLeft', label: '内容の左余白（px）', min: 0, max: 128 },
  { key: 'contentRight', label: '内容の右余白（px）', min: 0, max: 128 },
  { key: 'contentBottom', label: '内容の下余白（px）', min: 0, max: 128 },
  { key: 'surfaceInset', label: '背景の内側への余白（px）', min: 0, max: 64 },
  { key: 'surfaceRadius', label: '背景の角丸（px）', min: 0, max: 64 },
]

export default function WindowFrameEntry() {
  const [values, setValues] = useState(defaults)
  const [fullSize, setFullSize] = useState(false)
  const [open, setOpen] = useState(true)
  const [backdrop, setBackdrop] = useState('map')
  const [surface, setSurface] = useState(true)
  const [showTarget, setShowTarget] = useState(false)
  const [content, setContent] = useState('sample')
  const [title, setTitle] = useState('フルーエンの内政')
  const [log, add] = useLog()
  const style = {
    width: fullSize ? '100%' : values.width,
    height: fullSize ? '100%' : values.height,
    '--norden-window-frame-size': `${values.frameSize}px`,
    '--norden-window-close-size': `${values.closeSize}px`,
    '--norden-window-close-icon-size': `${values.iconSize}px`,
    '--norden-window-close-x': `${values.closeX}px`,
    '--norden-window-close-y': `${values.closeY}px`,
    '--norden-window-content-top': `${values.contentTop}px`,
    '--norden-window-content-left': `${values.contentLeft}px`,
    '--norden-window-content-right': `${values.contentRight}px`,
    '--norden-window-content-bottom': `${values.contentBottom}px`,
    '--norden-window-surface-inset': `${values.surfaceInset}px`,
    '--norden-window-surface-radius': `${values.surfaceRadius}px`,
    '--norden-window-surface-opacity': surface ? 1 : 0,
  } as CSSProperties

  const reset = () => {
    setValues(defaults)
    setFullSize(false)
    setOpen(true)
    setBackdrop('map')
    setSurface(true)
    setShowTarget(false)
    setContent('sample')
    setTitle('フルーエンの内政')
    add('初期値に戻しました')
  }

  return <Workbench variant="screen" stageClassName={`window-frame-playground backdrop-${backdrop}`}
    stage={<div className="demo-window-frame-placement">
      {open ? <WindowFrame title={title || undefined} aria-label="閉じるボタン付きウィンドウのプレビュー" style={style}
        className={`demo-window-frame-preview ${showTarget ? 'show-close-target' : ''}`}
        onClose={() => { setOpen(false); add('閉じる') }}>
        {content !== 'empty' && <div className="demo-window-frame-copy">
          <h2>フルーエンの内政</h2>
          <p>右上の装飾に組み込まれた × で閉じます。</p>
          {Array.from({ length: content === 'long' ? 20 : 1 }, (_, index) => <div key={index}>
            <h3>{content === 'long' ? `${index + 1}. ` : ''}都市の記録</h3>
            <p>市場には各地からの品々が集まり、工房では新たな施設の建設に向けて物資を整えています。</p>
          </div>)}
        </div>}
      </WindowFrame> : <button className="reset-button" onClick={() => { setOpen(true); add('再表示') }}>ウィンドウを再表示</button>}
    </div>}
    controls={<>
      <h2>ウィンドウ（閉じるボタン付き）</h2>
      <p>値を変えると左のプレビューに反映されます。枠のサイズを変えると閉じる位置も追従します。</p>
      <button className="reset-button" onClick={reset}>初期値に戻す</button>
      <label htmlFor="frame-title">ウィンドウタイトル（空欄で非表示）</label>
      <input id="frame-title" type="text" value={title} onChange={event => setTitle(event.target.value)} />
      <label className="checkbox"><input type="checkbox" checked={fullSize} onChange={event => setFullSize(event.target.checked)} />プレビューいっぱいに表示</label>
      <label htmlFor="frame-backdrop">透過確認の背景</label>
      <select id="frame-backdrop" value={backdrop} onChange={event => setBackdrop(event.target.value)}>
        <option value="map">緑の背景</option><option value="light">白い背景</option><option value="dark">黒い背景</option><option value="checker">市松模様</option>
      </select>
      <label className="checkbox"><input type="checkbox" checked={surface} onChange={event => setSurface(event.target.checked)} />羊皮紙を表示する</label>
      <label className="checkbox"><input type="checkbox" checked={showTarget} onChange={event => setShowTarget(event.target.checked)} />閉じる操作領域を表示する</label>
      <label htmlFor="frame-content">プレビューの内容</label>
      <select id="frame-content" value={content} onChange={event => setContent(event.target.value)}>
        <option value="empty">空の枠</option><option value="sample">短い本文</option><option value="long">長い本文（スクロール確認）</option>
      </select>
      {fields.map(({ key, label, min, max }) => <div key={key} className="demo-window-frame-field">
        <label htmlFor={`frame-${key}`}>{label}</label>
        <input id={`frame-${key}`} type="number" min={min} max={max} step={1}
          disabled={fullSize && (key === 'width' || key === 'height')}
          value={values[key]} onChange={event => {
            const next = event.target.valueAsNumber
            if (Number.isFinite(next)) setValues(current => ({ ...current, [key]: Math.min(max, Math.max(min, next)) }))
          }} />
      </div>)}
      <label htmlFor="frame-style">再利用用の style（コピー可）</label>
      <textarea id="frame-style" readOnly rows={12} value={JSON.stringify(style, null, 2)} spellCheck={false} />
      <Log entries={log} />
    </>}
  />
}
