import { useState } from 'react'
import { Button, ChoiceGroup, FactionMark, SettingsItem, SettingsSection, SettingsWindow, VolumeSlider } from '../../src'
import type { ChoiceOption } from '../../src'
import { FACTIONS, PLAYER } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

type Scene = 'title' | 'strategy' | 'battle'

const DIFFICULTIES: readonly ChoiceOption[] = [{ value: 'easy', label: '易しい' }, { value: 'normal', label: '普通' }, { value: 'hard', label: '難しい' }]
const SPEEDS: readonly ChoiceOption[] = [1, 2, 3].map(v => ({ value: String(v), label: `×${v}` }))
const WATCH: readonly ChoiceOption[] = [{ value: 'watch', label: '観戦する' }, { value: 'skip', label: '結果だけ' }]

const DEFAULTS = { bgm: 1, se: 1, difficulty: 'normal', speed: '1', watch: 'skip' }

export default function SettingsWindowEntry() {
  const [log, add] = useLog()
  const [open, setOpen] = useState(true)
  const [scene, setScene] = useState<Scene>('strategy')
  const [footer, setFooter] = useState(true)
  const [width, setWidth] = useState(580)
  const [values, setValues] = useState(DEFAULTS)
  const set = <K extends keyof typeof DEFAULTS>(key: K, value: (typeof DEFAULTS)[K]) => setValues(v => ({ ...v, [key]: value }))
  return <Workbench variant="screen"
    stage={<>
      <MockMap selected="P012" />
      <div className="demo-top-left"><Button size="small" onClick={() => setOpen(true)}>設定を開く</Button></div>
      {open && <SettingsWindow onClose={() => { setOpen(false); add('閉じる') }} style={{ width: `min(${width}px, 100%)` }}
        footer={footer ? <Button size="small" variant="quiet" onClick={() => { setValues(DEFAULTS); add('初期値に戻す') }}>初期値に戻す</Button> : undefined}>
        {scene === 'strategy' && (
          <SettingsSection title="ゲーム">
            <SettingsItem label="プレイヤーの勢力"><FactionMark faction={FACTIONS[PLAYER]} /></SettingsItem>
          </SettingsSection>
        )}
        <SettingsSection title="サウンド">
          <SettingsItem label="BGM">
            <VolumeSlider label="BGM" hideLabel value={values.bgm} onChange={v => set('bgm', v)} />
          </SettingsItem>
          <SettingsItem label="効果音">
            <VolumeSlider label="効果音" hideLabel value={values.se} onChange={v => set('se', v)} />
          </SettingsItem>
        </SettingsSection>
        <SettingsSection title="戦闘">
          <SettingsItem label="難易度" description="プレイヤーと戦う CPU の強さ">
            <ChoiceGroup label="難易度" options={DIFFICULTIES} value={values.difficulty} onChange={v => set('difficulty', v)} />
          </SettingsItem>
          <SettingsItem label="戦闘の速度" description="戦闘の途中でも変えられます">
            <ChoiceGroup label="戦闘の速度" options={SPEEDS} value={values.speed} onChange={v => set('speed', v)} />
          </SettingsItem>
          <SettingsItem label="CPU同士の戦闘" description={scene === 'battle' ? '次の戦闘から' : '観戦しないときは結果だけを出します'}>
            <ChoiceGroup label="CPU同士の戦闘" options={WATCH} value={values.watch} onChange={v => set('watch', v)} />
          </SettingsItem>
        </SettingsSection>
        {scene === 'strategy' && (
          <SettingsSection title="画面">
            <SettingsItem label="UIの配置" description="動かしたウィンドウを初めの位置に戻します">
              <Button size="small" onClick={() => add('UIの配置を初期化')}>UI位置の初期化</Button>
            </SettingsItem>
          </SettingsSection>
        )}
      </SettingsWindow>}
    </>}
    controls={<>
      <h2>設定ウィンドウ</h2>
      <p>SettingsWindow は配置先（position: relative）の中央にマスク付きで出るモーダルです。× ・Esc・マスクのクリックで閉じ、キーは下の画面に届きません。中身は SettingsSection（見出し）と SettingsItem（左に名前と説明、右に操作）で組み、幅が狭いと名前を操作の上に置きます。下の例はゲームの各場面の設定です。</p>
      <label htmlFor="settings-scene">場面</label>
      <select id="settings-scene" value={scene} onChange={event => setScene(event.target.value as Scene)}>
        <option value="title">タイトル画面</option>
        <option value="strategy">戦略画面</option>
        <option value="battle">戦闘画面</option>
      </select>
      <label htmlFor="settings-width">幅（px）: {width}</label>
      <input id="settings-width" type="range" min={320} max={800} step={10} value={width} onChange={event => setWidth(event.target.valueAsNumber)} />
      <label className="checkbox"><input type="checkbox" checked={footer} onChange={event => setFooter(event.target.checked)} />フッター（初期値に戻す）</label>
      <Button size="small" onClick={() => setOpen(true)}>設定を開く</Button>
      <Log entries={log} />
    </>}
  />
}
