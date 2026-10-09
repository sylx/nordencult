import { useState } from 'react'
import { Button, DateBar } from '../../src'
import iconSun from '../../src/assets/ui/icons/icon-sun.png'
import { Log, useLog, Workbench } from '../Workbench'

export default function DateBarEntry() {
  const [log, add] = useLog()
  const [text, setText] = useState('王暦312年 春　第1ターン　戦略フェーズ')
  const [withMenu, setWithMenu] = useState(true)
  const [withIcon, setWithIcon] = useState(false)
  return <Workbench
    stage={<div className="demo-center-top">
      <DateBar text={text} icon={withIcon ? <img src={iconSun} alt="" /> : undefined}>
        {withMenu ? <div className="demo-menu">
          <Button variant="quiet" onClick={() => add('セーブ')}>セーブ</Button>
          <Button variant="quiet" onClick={() => add('音量設定')}>音量設定</Button>
        </div> : undefined}
      </DateBar>
    </div>}
    controls={<>
      <h2>ターン情報</h2>
      <label htmlFor="date-text">表示する文字</label>
      <textarea id="date-text" rows={2} value={text} onChange={event => setText(event.target.value)} />
      <label className="checkbox"><input type="checkbox" checked={withMenu} onChange={event => setWithMenu(event.target.checked)} />設定メニューを付ける</label>
      <label className="checkbox"><input type="checkbox" checked={withIcon} onChange={event => setWithIcon(event.target.checked)} />アイコンを表示する</label>
      <Log entries={log} />
    </>}
  />
}
