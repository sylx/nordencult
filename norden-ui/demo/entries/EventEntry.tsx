import { useState } from 'react'
import { BuildingImage, CUT_IMAGES, CUTIN_TEMPLATES, CutInLayer, EventScreen, KnightChip, useCutIn } from '../../src'
import { KNIGHTS } from '../mock/data'
import MockMap from '../mock/MockMap'
import { MOCK_RELICS, repositoryRelics } from '../repositoryRelics'
import { MOCK_TECHS, repositoryTechs, type TechSpec } from '../repositoryTechs'
import { Log, useLog, Workbench } from '../Workbench'

const FACTION = 'カルタ書院'
const knights = KNIGHTS.filter(knight => knight.cityId === 'P012')
const TECHS: readonly TechSpec[] = repositoryTechs ?? MOCK_TECHS
const RELIC = (repositoryRelics ?? MOCK_RELICS)[0]!

/** A technology researched, told as the game's eventView does: its picture and no cut-in */
function TechCompletedNotice({ tech, withPicture, onClose }: { tech: TechSpec; withPicture: boolean; onClose: () => void }) {
  const image = withPicture ? tech.image : undefined
  return (
    <EventScreen picture={<BuildingImage building={{ id: tech.id, name: tech.name, image }} />} title="研究完了"
      message={`${tech.name}の研究が完了しました。`}
      details={[
        { label: '効果', value: tech.effects.join('・') || 'なし' },
        { label: '解禁された技術', value: TECHS.filter(t => t.requires.includes(tech.id)).map(t => t.name).join('・') || 'なし' },
      ]}
      onClose={onClose} />
  )
}

/** A faction destroyed (the cut-in faction_destruction, then the notice of the event), a technology researched, or a relic completed */
export default function EventEntry() {
  const [log, add] = useLog()
  const [open, setOpen] = useState(true)
  const [kind, setKind] = useState<'faction' | 'tech' | 'relic'>('faction')
  const [techId, setTechId] = useState(TECHS[0]!.id)
  const [withPicture, setWithPicture] = useState(true)
  const cutIn = useCutIn()
  const tech = TECHS.find(t => t.id === techId)!

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
      {open && kind === 'tech' && (
        <TechCompletedNotice key={tech.id} tech={tech} withPicture={withPicture} onClose={() => { setOpen(false); add('閉じる') }} />
      )}
      {open && kind === 'relic' && (
        <EventScreen picture={<BuildingImage building={{ id: RELIC.id, name: RELIC.name, image: RELIC.image }} />} title="遺物の完成"
          message={`${RELIC.name}が完成しました。`}
          details={[{ label: '場所', value: 'フルーエン' }, { label: '使い道', value: RELIC.useLabel }]}
          onClose={() => { setOpen(false); add('閉じる') }} />
      )}
      {open && kind === 'faction' && (
        <EventScreen image={CUT_IMAGES.faction_destruction!} title="勢力滅亡"
          message={`${FACTION}はフルーエンを失い、滅亡しました。`}
          details={[
            { label: '最後の拠点', value: 'フルーエン' },
            { label: '攻め落とした勢力', value: 'レオニス帝国' },
            { label: '放浪する騎士', value: `${knights.length}人` },
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
      <label htmlFor="event-kind">通知の種類</label>
      <select id="event-kind" value={kind} onChange={event => { setKind(event.target.value as typeof kind); setOpen(true) }}>
        <option value="faction">勢力滅亡</option>
        <option value="tech">研究完了</option>
        <option value="relic">遺物の完成</option>
      </select>
      {kind === 'relic' && <p>ゲームでは修復・生産が完成した次のターンの初めに、カットインなしでこの通知を出します。法王府の修復なら場所は法王府です。</p>}
      {kind === 'faction' && <>
        <p>ゲームでは勢力が滅亡すると、カットイン <code>faction_destruction</code> のあとにこの通知を出します。</p>
        <button className="reset-button" onClick={play}>カットインから再生</button>
      </>}
      {kind === 'tech' && <>
        <p>ゲームでは研究が完了した次のターンの初めに、カットインなしでこの通知を出します。カット画像の代わりに技術の画像（<code>picture</code>）を出します。{repositoryTechs ? 'ゲームの技術データを使っています。' : ''}</p>
        <label htmlFor="event-tech">完了した技術</label>
        <select id="event-tech" value={techId} onChange={event => { setTechId(event.target.value); setOpen(true) }}>
          {TECHS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <label className="checkbox"><input type="checkbox" checked={withPicture} onChange={event => setWithPicture(event.target.checked)} />技術の画像あり（外すと未設定のときの表示）</label>
      </>}
      <button className="reset-button" onClick={() => setOpen(true)}>通知だけ出す</button>
      <Log entries={log} />
    </>}
  />
}
