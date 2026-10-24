import { useState } from 'react'
import { CUT_IMAGES, CUTIN_TEMPLATES, CutInLayer, EventScreen, KnightChip, useCutIn } from '../../src'
import { KNIGHTS } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

const FACTION = 'カルタ書院'
const knights = KNIGHTS.filter(knight => knight.cityId === 'P012')

/** A faction destroyed: the cut-in faction_destruction, then the notice of the event */
export default function EventEntry() {
  const [log, add] = useLog()
  const [open, setOpen] = useState(true)
  const cutIn = useCutIn()

  const play = () => {
    setOpen(false)
    const template = CUTIN_TEMPLATES.faction_destruction
    if (!template) return setOpen(true)
    cutIn.play(template, { text: `${FACTION}滅亡`, subText: '灰歴324年6月' })
      .catch((error: unknown) => add(`カットインを再生できません: ${String(error)}`))
      .then(() => setOpen(true))
  }

  return <Workbench variant="screen"
    stage={<>
      <MockMap />
      {open && (
        <EventScreen image={CUT_IMAGES.faction_destruction!} title="勢力滅亡"
          message={`${FACTION}はフルーエンを失い、滅亡しました。`}
          details={[
            { label: '最後の拠点', value: 'フルーエン' },
            { label: '攻め落とした勢力', value: 'レオニス帝国' },
            { label: '在野になった騎士', value: `${knights.length}人` },
          ]}
          onClose={() => { setOpen(false); add('閉じる') }}>
          <p className="norden-event-chips">{knights.map(knight => <KnightChip key={knight.id} knight={knight} />)}</p>
        </EventScreen>
      )}
      <CutInLayer cutIn={cutIn} />
    </>}
    controls={<>
      <h2>イベント通知</h2>
      <p>カット画像（<code>CUT_IMAGES</code>。<code>src/assets/cut/*.webp</code>）とその下のメッセージウィンドウに、起きたことと詳細を出します。閉じるボタン・Enter・Escで閉じます。</p>
      <p>ゲームでは勢力が滅亡すると、カットイン <code>faction_destruction</code> のあとにこの通知を出します。</p>
      <button className="reset-button" onClick={play}>カットインから再生</button>
      <button className="reset-button" onClick={() => setOpen(true)}>通知だけ出す</button>
      <Log entries={log} />
    </>}
  />
}
