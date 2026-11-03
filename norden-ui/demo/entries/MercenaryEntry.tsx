import { useState } from 'react'
import { MercenaryScreen, type MercenaryContractView, type MercenaryOfferView } from '../../src'
import { KNIGHTS, UNIT_TYPES } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

const COMPANIES = ['樽盾団', 'ランツクネヒト', '鉄弦団', '黙鈴団']
const [first, second, third, fourth] = KNIGHTS.map((knight, index) => ({
  ...knight, mercenary: { company: COMPANIES[index] ?? '黙鈴団', soldiers: 500, maxSoldiers: 500 },
}))

const unit = (id: string) => {
  const type = UNIT_TYPES.find(item => item.id === id)
  return { unitType: type?.name ?? id, unitImage: type?.image }
}

const OFFERS: readonly MercenaryOfferView[] = [
  { knight: first!, company: COMPANIES[0]!, ...unit('cavalry'), soldiers: 500, maxSoldiers: 500, rank: 'D', cityName: 'フルーエン' },
  { knight: second!, company: COMPANIES[1]!, unitType: 'ランツクネヒト', soldiers: 1000, maxSoldiers: 1000, rank: 'S', cityName: 'アンバリア' },
  {
    knight: fourth!, company: COMPANIES[3]!, ...unit('mage'), soldiers: 500, maxSoldiers: 500, rank: 'C', cityName: 'シルヴァ',
    unavailableReason: '手番ではありません',
  },
]
const CONTRACTS: readonly MercenaryContractView[] = [
  { knight: third!, company: COMPANIES[2]!, ...unit('archer'), cityName: 'シルヴァ', soldiers: 350, maxSoldiers: 500, rank: 'D', monthly: 167, months: 3 },
]

export default function MercenaryEntry() {
  const [log, add] = useLog()
  const [empty, setEmpty] = useState(false)
  const [instance, setInstance] = useState(0)

  return <Workbench variant="screen"
    stage={<>
      <MockMap />
      <MercenaryScreen key={instance} cityName="フルーエン" gold={3000} offers={empty ? [] : OFFERS} contracts={empty ? [] : CONTRACTS}
        onHire={id => add(`交渉: ${id}`)} onDismiss={id => add(`打ち切り: ${id}`)} onClose={() => add('戻る')} />
    </>}
    controls={<>
      <h2>傭兵画面</h2>
      <p>軍事＞傭兵。「契約できる傭兵」で交渉し（契約金・月額は会話で明かす）、「契約中」で打ち切ります。一覧はランクの低い順に並び、傭兵団・騎士名で検索できます（能力値は出さない）。交渉できない傭兵は理由を出してボタンを押せなくします（契約に応じない傭兵は交渉でき、会話で断られます）。兵が減った傭兵を打ち切ると、確認に評判と回復のことを出します。</p>
      <label className="checkbox"><input type="checkbox" checked={empty} onChange={event => setEmpty(event.target.checked)} />傭兵がいない</label>
      <button className="reset-button" onClick={() => setInstance(value => value + 1)}>画面を開き直す</button>
      <Log entries={log} />
    </>}
  />
}
