import { useState } from 'react'
import { CommandToolbar } from '../../src'
import type { ToolbarCommand } from '../../src'
import iconDomestic from '../../src/assets/ui/hud/icon-territory.png'
import iconMilitary from '../../src/assets/ui/hud/icon-military.png'
import iconResearch from '../../src/assets/ui/hud/icon-knowledge.png'
import iconMerchant from '../../src/assets/ui/hud/icon-gold.png'
import iconSun from '../../src/assets/ui/hud/icon-sun.png'
import { Log, useLog, Workbench } from '../Workbench'

export default function CommandToolbarEntry() {
  const [log, add] = useLog()
  const [withChildren, setWithChildren] = useState(true)
  const [withIcons, setWithIcons] = useState(true)
  const [movable, setMovable] = useState(true)
  const [disableInvade, setDisableInvade] = useState(true)
  const [count, setCount] = useState(5)

  const leaf = (id: string, label: string, extra: Partial<ToolbarCommand> = {}): ToolbarCommand =>
    ({ id, label, onClick: () => add(`${label} を選択`), ...extra })
  const icon = (src: string) => (withIcons ? <img src={src} alt="" /> : undefined)
  const group = (id: string, label: string, src: string, children: ToolbarCommand[]): ToolbarCommand =>
    withChildren ? { id, label, icon: icon(src), children } : leaf(id, label, { icon: icon(src) })
  const commands: ToolbarCommand[] = [
    group('domestic', '内政', iconDomestic, [leaf('build', '建設'), leaf('assign', '割当')]),
    group('military', '軍事', iconMilitary, [
      leaf('move', '移動'),
      leaf('invade', '侵攻', disableInvade ? { disabled: true, title: '出撃できる騎士がいません' } : {}),
      leaf('recruit', '募兵'), leaf('transport', '輸送'),
    ]),
    leaf('research', '研究', { icon: icon(iconResearch) }),
    group('merchant', '商人', iconMerchant, [leaf('buy', '購入'), leaf('sell', '売却')]),
    leaf('end-turn', 'ターン終了', { icon: icon(iconSun), tone: 'accent' }),
  ].slice(0, count)

  return <Workbench
    stage={<div className="demo-center-bottom"><CommandToolbar commands={commands} movable={movable} /></div>}
    hint="分類を押すとサブコマンドが開く · Esc・外側クリックで閉じる"
    controls={<>
      <h2>ツールバー</h2>
      <label className="checkbox"><input type="checkbox" checked={withChildren} onChange={event => setWithChildren(event.target.checked)} />サブコマンドを使う</label>
      <label className="checkbox"><input type="checkbox" checked={withIcons} onChange={event => setWithIcons(event.target.checked)} />アイコンを表示する</label>
      <label className="checkbox"><input type="checkbox" checked={movable} onChange={event => setMovable(event.target.checked)} />端のドラッグで移動できる</label>
      <label className="checkbox"><input type="checkbox" checked={disableInvade} onChange={event => setDisableInvade(event.target.checked)} />「侵攻」を無効にする</label>
      <label htmlFor="toolbar-count">コマンド数</label>
      <select id="toolbar-count" value={count} onChange={event => setCount(Number(event.target.value))}>
        {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}個</option>)}
      </select>
      <Log entries={log} />
    </>}
  />
}
