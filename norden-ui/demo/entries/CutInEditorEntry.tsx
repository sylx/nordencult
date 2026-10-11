import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CUTIN_DEFAULTS, CUTIN_IN_EFFECTS, CUTIN_OUT_EFFECTS, normalizeCutInTemplate } from '../../src'
import type { CutInDir, CutInTemplate } from '../../src'
import { Log, useLog, Workbench } from '../Workbench'
import CutInPreview, { ASPECTS, BACKDROPS } from '../cutin/CutInPreview'
import type { Aspect, Backdrop } from '../cutin/CutInPreview'
import { Check, Color, Range, Section, Select } from '../cutin/fields'
import { loadGoogleFonts } from '../cutin/googleFonts'
import {
  ANCHORS, BG_TYPES, DECO_ANIMS, DECO_TYPES, DIRS, EASES, HOLD_FX, IN_FX, ORDERS, OUT_FX, SUB_FX,
} from '../cutin/labels'
import type { Options } from '../cutin/labels'
import { ALL_PRESETS, FONT_CHOICES, PRESET_GROUPS } from '../cutin/presets'

const TABS = [['preset', 'テンプレ'], ['text', '文字'], ['style', '見た目'], ['deco', '装飾'], ['motion', '動き'], ['json', 'JSON']] as const
type Tab = (typeof TABS)[number][0]
type Nested = 'fill' | 'stroke' | 'stroke2' | 'shadow' | 'glow' | 'deco' | 'bg'

// The template being edited survives a reload (this browser only)
const STORAGE_KEY = 'norden-ui:cutin-editor'
function loadSaved(): CutInTemplate {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return normalizeCutInTemplate(saved)
  } catch { /* fall through to the first preset */ }
  return normalizeCutInTemplate(ALL_PRESETS[0]!.template)
}

const fileName = (template: CutInTemplate) => `${(template.name || 'cutin').replace(/[\\/:*?"<>|\s]+/g, '_')}.json`
const toJson = (template: CutInTemplate) => `${JSON.stringify(template, null, 2)}\n`
const dirOptions = (dirs: readonly CutInDir[] | undefined): Options<CutInDir> => (dirs ?? []).map(dir => [dir, DIRS[dir]] as const)

export default function CutInEditorEntry() {
  const [template, setTemplate] = useState(loadSaved)
  const [tab, setTab] = useState<Tab>('preset')
  const [aspect, setAspect] = useState<Aspect>('16 / 9')
  const [backdrop, setBackdrop] = useState<Backdrop>('map')
  const [log, add] = useLog()

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(template)) } catch { /* storage unavailable */ }
    loadGoogleFonts(template.fontFamily, template.subFontFamily)
  }, [template])

  const update = (patch: Partial<CutInTemplate>) => setTemplate(current => ({ ...current, ...patch }))
  const updateIn = <K extends Nested>(key: K, patch: Partial<CutInTemplate[K]>) =>
    setTemplate(current => ({ ...current, [key]: { ...current[key], ...patch } }))

  const fieldsByTab: Record<Tab, () => ReactNode> = {
    preset: () => <PresetTab onPick={next => { setTemplate(next); add(`テンプレート「${next.name}」を読み込みました`) }} current={template} />,
    text: () => <TextTab template={template} update={update} />,
    style: () => <StyleTab template={template} update={update} updateIn={updateIn} />,
    deco: () => <DecoTab template={template} update={update} updateIn={updateIn} />,
    motion: () => <MotionTab template={template} update={update} />,
    json: () => <JsonTab template={template} onLoad={next => { setTemplate(next); add('JSONを読み込みました') }} onLog={add} />,
  }

  return <Workbench
    stage={<CutInPreview template={template} aspect={aspect} backdrop={backdrop} onLog={add} />}
    controls={<>
      <h2>カットインエディタ</h2>
      <div className="cutin-tabs" role="tablist" aria-label="設定の種類">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className="cutin-tab" onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div role="tabpanel" className="cutin-panel">{fieldsByTab[tab]()}</div>
      <Section title="プレビュー">
        <Select label="画面の縦横比" value={aspect} options={ASPECTS} onChange={setAspect} />
        <Select label="背景" value={backdrop} options={BACKDROPS} onChange={setBackdrop} />
      </Section>
      <Log entries={log} />
    </>}
  />
}

interface TabProps {
  template: CutInTemplate
  update: (patch: Partial<CutInTemplate>) => void
}
interface NestedTabProps extends TabProps {
  updateIn: <K extends Nested>(key: K, patch: Partial<CutInTemplate[K]>) => void
}

function PresetTab({ current, onPick }: { current: CutInTemplate; onPick: (template: CutInTemplate) => void }) {
  return <>
    <p>出発点にするテンプレートを選びます。いまの編集内容は置き換わります（必要ならJSONタブで保存してください）。</p>
    {PRESET_GROUPS.map(group => (
      <Section key={group.label} title={group.label}>
        <div className="cutin-presets">
          {group.templates.map(({ id, template }) => (
            <button key={id} type="button" className="cutin-button" aria-pressed={current.name === template.name}
              onClick={() => onPick(normalizeCutInTemplate(template))}>{template.name}</button>
          ))}
        </div>
      </Section>
    ))}
    <button type="button" className="reset-button" onClick={() => onPick({ ...CUTIN_DEFAULTS, name: '新規' })}>初期値から作る</button>
  </>
}

function FontFields({ label, value, onChange, allowSame }: { label: string; value: string; onChange: (stack: string) => void; allowSame?: boolean }) {
  const known = FONT_CHOICES.find(choice => choice.stack === value)
  const options: Options<string> = [
    ...(allowSame ? [['', 'メインと同じ'] as const] : []),
    ...FONT_CHOICES.map(choice => [choice.stack, `${choice.group}: ${choice.family}`] as const),
    ...(known || (allowSame && value === '') ? [] : [[value, `指定: ${value}`] as const]),
  ]
  return <>
    <Select label={label} value={value} options={options} onChange={onChange} />
    <div className="cutin-field">
      <label>
        font-family（ゲームで読み込む書体の名前）
        <input type="text" value={value} placeholder={allowSame ? '空欄でメインと同じ' : ''} onChange={event => onChange(event.target.value)} />
      </label>
    </div>
  </>
}

function weightOptions(stack: string): Options<number> {
  const names: Record<number, string> = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' }
  const weights = FONT_CHOICES.find(choice => choice.stack === stack)?.weights ?? [100, 200, 300, 400, 500, 600, 700, 800, 900]
  return weights.map(w => [w, `${w}（${names[w] ?? w}）`] as const)
}

function TextTab({ template: t, update }: TabProps) {
  return <>
    <Section title="文字">
      <div className="cutin-field">
        <label>名前（エディタでの呼び名）<input type="text" value={t.name} onChange={event => update({ name: event.target.value })} /></label>
      </div>
      <div className="cutin-field">
        <label>メインテキスト（見本。ゲームでは play() で差し替えられます）
          <textarea rows={2} value={t.text} onChange={event => update({ text: event.target.value })} />
        </label>
      </div>
      <div className="cutin-field">
        <label>サブテキスト（任意）<input type="text" value={t.subText} onChange={event => update({ subText: event.target.value })} /></label>
      </div>
      <Select label="サブテキストの位置" value={t.subPosition} options={[['above', t.writing === 'v' ? '右（前）' : '上'], ['below', t.writing === 'v' ? '左（後）' : '下']]} onChange={subPosition => update({ subPosition })} />
      <Select label="書字方向" value={t.writing} options={[['h', '横書き'], ['v', '縦書き']]} onChange={writing => update({ writing })} />
      <Select label="揃え" value={t.align} options={[['start', t.writing === 'v' ? '上' : '左'], ['center', '中央'], ['end', t.writing === 'v' ? '下' : '右']]} onChange={align => update({ align })} />
      <Check label="はみ出す場合は自動で縮小する" checked={t.autoFit} onChange={autoFit => update({ autoFit })} />
    </Section>
    <Section title="メインのフォント">
      <FontFields label="フォント" value={t.fontFamily} onChange={fontFamily => update({ fontFamily })} />
      <Select label="太さ" value={t.weight} options={weightOptions(t.fontFamily)} onChange={weight => update({ weight })} />
      <Check label="斜体（イタリック）" checked={t.italic} onChange={italic => update({ italic })} />
      <Range label="文字サイズ" value={t.fontSize} min={12} max={400} step={1} unit="px" onChange={fontSize => update({ fontSize })} />
      <Range label="字間" value={t.letterSpacing} min={-0.2} max={1.2} step={0.01} unit="em" onChange={letterSpacing => update({ letterSpacing })} />
      <Range label="行間" value={t.lineHeight} min={0.9} max={3.2} step={0.05} unit="倍" onChange={lineHeight => update({ lineHeight })} />
    </Section>
    <Section title="サブのフォント">
      <FontFields label="フォント" value={t.subFontFamily} allowSame onChange={subFontFamily => update({ subFontFamily })} />
      <Select label="太さ" value={t.subWeight} options={weightOptions(t.subFontFamily || t.fontFamily)} onChange={subWeight => update({ subWeight })} />
      <Check label="斜体（イタリック）" checked={t.subItalic} onChange={subItalic => update({ subItalic })} />
      <Range label="大きさ（メイン比）" value={t.subSize} min={0.1} max={0.9} step={0.01} unit="倍" onChange={subSize => update({ subSize })} />
      <Range label="字間" value={t.subLetterSpacing} min={-0.2} max={1.5} step={0.01} unit="em" onChange={subLetterSpacing => update({ subLetterSpacing })} />
      <Range label="メインとの間隔" value={t.subGap} min={0} max={1.5} step={0.01} unit="em" onChange={subGap => update({ subGap })} />
    </Section>
    <Section title="配置（1280×720 基準）">
      <Select label="基準位置" value={t.anchor} options={ANCHORS} onChange={anchor => update({ anchor })} />
      <Range label="左右の余白" value={t.marginX} min={0} max={400} step={1} unit="px" onChange={marginX => update({ marginX })} />
      <Range label="上下の余白" value={t.marginY} min={0} max={400} step={1} unit="px" onChange={marginY => update({ marginY })} />
      <Range label="横の微調整" value={t.offsetX} min={-800} max={800} step={1} unit="px" onChange={offsetX => update({ offsetX })} />
      <Range label="縦の微調整" value={t.offsetY} min={-500} max={500} step={1} unit="px" onChange={offsetY => update({ offsetY })} />
    </Section>
  </>
}

function StyleTab({ template: t, update, updateIn }: NestedTabProps) {
  const gradient = t.fill.type === 'gradient'
  const glitchUsed = [t.inFx, t.holdFx, t.outFx].includes('glitch')
  return <>
    <Section title="文字の塗り">
      <Select label="塗り" value={t.fill.type} options={[['solid', '単色'], ['gradient', 'グラデーション']]} onChange={type => updateIn('fill', { type })} />
      <Color label={gradient ? '色1' : '色'} value={t.fill.color} onChange={color => updateIn('fill', { color })} />
      {gradient && <>
        <Color label="色2" value={t.fill.color2} onChange={color2 => updateIn('fill', { color2 })} />
        <Check label="色3を使う" checked={t.fill.color3 !== ''} onChange={on => updateIn('fill', { color3: on ? '#ffffff' : '' })} />
        {t.fill.color3 !== '' && <Color label="色3" value={t.fill.color3} onChange={color3 => updateIn('fill', { color3 })} />}
        <Select label="グラデーションの向き" value={t.fill.dir} options={[['v', '縦（1行ごと）'], ['h', '横（全体）'], ['d', '斜め（全体）']]} onChange={dir => updateIn('fill', { dir })} />
      </>}
      <Range label="塗りの不透明度" value={t.fillOpacity} min={0} max={1} step={0.01} onChange={fillOpacity => update({ fillOpacity })} />
    </Section>
    <Section title="サブテキストを別の色にする" enabled={t.subColorOn} onToggle={subColorOn => update({ subColorOn })}>
      <Color label="色" value={t.subColor} onChange={subColor => update({ subColor })} />
    </Section>
    <Section title="縁取り" enabled={t.stroke.on} onToggle={on => updateIn('stroke', { on })}>
      <Color label="色" value={t.stroke.color} onChange={color => updateIn('stroke', { color })} />
      <Range label="太さ" value={t.stroke.width} min={0.5} max={30} step={0.5} unit="px" onChange={width => updateIn('stroke', { width })} />
    </Section>
    <Section title="外側の縁取り" enabled={t.stroke2.on} onToggle={on => updateIn('stroke2', { on })}>
      <Color label="色" value={t.stroke2.color} onChange={color => updateIn('stroke2', { color })} />
      <Range label="太さ" value={t.stroke2.width} min={0.5} max={40} step={0.5} unit="px" onChange={width => updateIn('stroke2', { width })} />
    </Section>
    <Section title="影" enabled={t.shadow.on} onToggle={on => updateIn('shadow', { on })}>
      <Color label="色" value={t.shadow.color} onChange={color => updateIn('shadow', { color })} />
      <Range label="濃さ" value={t.shadow.opacity} min={0} max={1} step={0.01} onChange={opacity => updateIn('shadow', { opacity })} />
      <Range label="ぼかし" value={t.shadow.blur} min={0} max={80} step={1} unit="px" onChange={blur => updateIn('shadow', { blur })} />
      <Range label="横のずれ" value={t.shadow.x} min={-60} max={60} step={1} unit="px" onChange={x => updateIn('shadow', { x })} />
      <Range label="縦のずれ" value={t.shadow.y} min={-60} max={60} step={1} unit="px" onChange={y => updateIn('shadow', { y })} />
    </Section>
    <Section title="光彩（グロー）" enabled={t.glow.on} onToggle={on => updateIn('glow', { on })}>
      <Color label="色" value={t.glow.color} onChange={color => updateIn('glow', { color })} />
      <Range label="広がり" value={t.glow.size} min={2} max={150} step={1} unit="px" onChange={size => updateIn('glow', { size })} />
      <Range label="強さ" value={t.glow.strength} min={0.2} max={3} step={0.05} unit="倍" onChange={strength => updateIn('glow', { strength })} />
    </Section>
    {glitchUsed && <Section title="ノイズ（グリッチ）の色">
      <Color label="色1" value={t.glitchColor} onChange={glitchColor => update({ glitchColor })} />
      <Color label="色2" value={t.glitchColor2} onChange={glitchColor2 => update({ glitchColor2 })} />
    </Section>}
  </>
}

function DecoTab({ template: t, updateIn }: NestedTabProps) {
  const d = t.deco
  const is = (...types: string[]) => types.includes(d.type)
  const lineLike = is('box', 'frame', 'lines', 'underline', 'sides', 'bar', 'corners')
  return <>
    <Section title="装飾">
      <Select label="種類" value={d.type} options={DECO_TYPES} onChange={type => updateIn('deco', { type })} />
      {is('band', 'box', 'frame') && <>
        <Color label="塗り" value={d.color} onChange={color => updateIn('deco', { color })} />
        <Range label="塗りの濃さ" value={d.opacity} min={0} max={1} step={0.01} onChange={opacity => updateIn('deco', { opacity })} />
      </>}
      {lineLike && <>
        <Color label="線" value={d.color2} onChange={color2 => updateIn('deco', { color2 })} />
        <Range label={is('box', 'frame') ? '枠線の太さ（0で枠なし）' : '線の太さ'} value={d.thickness} min={0} max={16} step={0.5} unit="px" onChange={thickness => updateIn('deco', { thickness })} />
      </>}
      {lineLike && !is('box') && (t.stroke.on || t.stroke2.on) &&
        <Check label="線にも文字と同じ縁取りをつける" checked={d.outline} onChange={outline => updateIn('deco', { outline })} />}
      {is('tape') && <>
        <Color label="テープ" value={d.tapeColor} onChange={tapeColor => updateIn('deco', { tapeColor })} />
        <Color label="しま模様" value={d.tapeStripe} onChange={tapeStripe => updateIn('deco', { tapeStripe })} />
        <Range label="テープの太さ" value={d.tapeSize} min={8} max={120} step={1} unit="px" onChange={tapeSize => updateIn('deco', { tapeSize })} />
        <Range label="流れる速さ（0で止まる）" value={d.tapeSpeed} min={0} max={400} step={5} unit="px/秒" onChange={tapeSpeed => updateIn('deco', { tapeSpeed })} />
        <Range label="点滅（0で点滅しない）" value={d.tapeBlink} min={0} max={1} step={0.01} onChange={tapeBlink => updateIn('deco', { tapeBlink })} />
      </>}
      {d.type !== 'none' && <Range label="文字との余白" value={d.pad} min={0} max={2} step={0.01} unit="em" onChange={pad => updateIn('deco', { pad })} />}
      {is('lines', 'underline', 'sides') && <Range label="線の長さ" value={d.extend} min={0} max={4} step={0.05} unit="em" onChange={extend => updateIn('deco', { extend })} />}
      {is('frame') && <Range label="枠の広がり（画面の端で止まる）" value={d.extend} min={0} max={12} step={0.1} unit="em" onChange={extend => updateIn('deco', { extend })} />}
      {is('band') && <>
        <Range label="ふちのぼかし" value={d.soft} min={0} max={1} step={0.01} onChange={soft => updateIn('deco', { soft })} />
        <Range label="両端のフェード" value={d.sideFade} min={0} max={1} step={0.01} onChange={sideFade => updateIn('deco', { sideFade })} />
      </>}
      {is('box') && <Range label="角の丸み" value={d.radius} min={0} max={1} step={0.01} unit="em" onChange={radius => updateIn('deco', { radius })} />}
      {d.type !== 'none' && <>
        <Select label="装飾のアニメーション" value={d.anim} options={DECO_ANIMS} onChange={anim => updateIn('deco', { anim })} />
        {d.anim !== 'none' && <Range label="アニメーションの時間" value={d.dur} min={0.1} max={2.5} step={0.05} unit="秒" onChange={dur => updateIn('deco', { dur })} />}
      </>}
    </Section>
    <Section title="背景（画面全体）">
      <Select label="種類" value={t.bg.type} options={BG_TYPES} onChange={type => updateIn('bg', { type })} />
      {t.bg.type !== 'none' && <>
        <Color label="色" value={t.bg.color} onChange={color => updateIn('bg', { color })} />
        <Range label="濃さ" value={t.bg.opacity} min={0} max={1} step={0.01} onChange={opacity => updateIn('bg', { opacity })} />
        <Check label="文字の登場・退場に合わせてフェード" checked={t.bg.sync} onChange={sync => updateIn('bg', { sync })} />
      </>}
    </Section>
  </>
}

function MotionTab({ template: t, update }: TabProps) {
  const inDef = CUTIN_IN_EFFECTS[t.inFx]
  const outDef = CUTIN_OUT_EFFECTS[t.outFx]
  return <>
    <Section title="登場">
      <Select label="効果" value={t.inFx} options={IN_FX} onChange={inFx => update({ inFx })} />
      {inDef.dirs && <Select label="方向" value={inDef.dirs.includes(t.inDir) ? t.inDir : inDef.dirs[0]!} options={dirOptions(inDef.dirs)} onChange={inDir => update({ inDir })} />}
      {t.inFx !== 'typewriter' && <Range label="時間" value={t.inDur} min={0.05} max={4} step={0.05} unit="秒" onChange={inDur => update({ inDur })} />}
      {inDef.level === 'glyph' && <>
        <Range label="文字ごとのずらし" value={t.inStagger} min={0} max={0.6} step={0.01} unit="秒" onChange={inStagger => update({ inStagger })} />
        <Select label="順番" value={t.inOrder} options={ORDERS} onChange={inOrder => update({ inOrder })} />
      </>}
      {t.inFx !== 'typewriter' && <Select label="動きのカーブ" value={t.inEase} options={EASES} onChange={inEase => update({ inEase })} />}
      {!['fade', 'typewriter'].includes(t.inFx) && <Range label="強さ" value={t.inPower} min={0.2} max={2.5} step={0.05} unit="倍" onChange={inPower => update({ inPower })} />}
    </Section>
    <Section title="表示中">
      <Range label="表示時間" value={t.hold} min={0} max={10} step={0.1} unit="秒" onChange={hold => update({ hold })} />
      <Select label="表示中の動き" value={t.holdFx} options={HOLD_FX} onChange={holdFx => update({ holdFx })} />
      {t.holdFx !== 'none' && <Range label="強さ" value={t.holdPower} min={0.2} max={3} step={0.05} unit="倍" onChange={holdPower => update({ holdPower })} />}
    </Section>
    <Section title="退場">
      <Select label="効果" value={t.outFx} options={OUT_FX} onChange={outFx => update({ outFx })} />
      {outDef.dirs && <Select label="方向" value={outDef.dirs.includes(t.outDir) ? t.outDir : outDef.dirs[0]!} options={dirOptions(outDef.dirs)} onChange={outDir => update({ outDir })} />}
      {t.outFx !== 'erase' && <Range label="時間" value={t.outDur} min={0.05} max={4} step={0.05} unit="秒" onChange={outDur => update({ outDur })} />}
      {outDef.level === 'glyph' && <>
        <Range label="文字ごとのずらし" value={t.outStagger} min={0} max={0.6} step={0.01} unit="秒" onChange={outStagger => update({ outStagger })} />
        <Select label="順番" value={t.outOrder} options={ORDERS} onChange={outOrder => update({ outOrder })} />
      </>}
      {t.outFx !== 'erase' && <Select label="動きのカーブ" value={t.outEase} options={EASES} onChange={outEase => update({ outEase })} />}
      {!['fade', 'erase'].includes(t.outFx) && <Range label="強さ" value={t.outPower} min={0.2} max={2.5} step={0.05} unit="倍" onChange={outPower => update({ outPower })} />}
    </Section>
    <Section title="タイミング">
      <Select label="サブテキストの登場" value={t.subFx} options={SUB_FX} onChange={subFx => update({ subFx })} />
      <Range label="サブの登場（メイン登場完了からの差）" value={t.subDelay} min={-2} max={2} step={0.05} unit="秒" onChange={subDelay => update({ subDelay })} />
      <Range label="開始前の空白" value={t.startDelay} min={0} max={3} step={0.05} unit="秒" onChange={startDelay => update({ startDelay })} />
      <Range label="終了後の空白" value={t.endDelay} min={0} max={5} step={0.05} unit="秒" onChange={endDelay => update({ endDelay })} />
    </Section>
  </>
}

function JsonTab({ template, onLoad, onLog }: { template: CutInTemplate; onLoad: (template: CutInTemplate) => void; onLog: (text: string) => void }) {
  const [draft, setDraft] = useState(() => toJson(template))
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  // Follow the edits made on the other tabs
  useEffect(() => { setDraft(toJson(template)); setError('') }, [template])

  const apply = (text: string) => {
    try {
      onLoad(normalizeCutInTemplate(text))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toJson(template))
      onLog('JSONをコピーしました')
    } catch {
      onLog('コピーできませんでした（ブラウザがクリップボードを許可していません）')
    }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([toJson(template)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName(template)
    link.click()
    URL.revokeObjectURL(url)
    onLog(`${fileName(template)} をダウンロードしました`)
  }
  const readFile = async (file: File | undefined) => {
    if (file) apply(await file.text())
  }

  return <>
    <p>ゲームでは <code>useCutIn().play(json, {'{ text }'})</code> にこのJSONを渡します。足りない項目は初期値で補います。</p>
    <div className="cutin-presets">
      <button type="button" className="cutin-button" onClick={copy}>コピー</button>
      <button type="button" className="cutin-button" onClick={download}>ダウンロード</button>
      <button type="button" className="cutin-button" onClick={() => fileRef.current?.click()}>ファイルを開く</button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={event => { void readFile(event.target.files?.[0]); event.target.value = '' }} />
    </div>
    <div className="cutin-field">
      <label>JSON（貼り付けて「反映」）
        <textarea className="cutin-json" rows={18} spellCheck={false} value={draft} onChange={event => setDraft(event.target.value)} />
      </label>
    </div>
    {error && <p className="cutin-error" role="alert">{error}</p>}
    <button type="button" className="reset-button" onClick={() => apply(draft)}>反映</button>
  </>
}
