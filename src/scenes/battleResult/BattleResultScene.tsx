import { useEffect } from 'react'
import { playBgm } from '../../audio/bgm'
import { FactionLabel } from '../../components/FactionLabel'
import { KnightList } from '../../components/KnightList'
import { CHARACTER_MAP, type Character } from '../../data/character'
import { CITY_MAP } from '../../data/city'
import { isPlayerFaction, summonCharacter, useGame, type BattleEndReason, type BattleReport, type CharacterMove, type MoveKind } from '../../game'
import { useScene } from '../sceneContext'
import { relicWorkLabel } from '../strategy/views'
import type { SceneProps } from '../types'
import './BattleResultScene.css'

const MOVE_LABELS: Readonly<Record<MoveKind, string>> = {
  enter: '入城',
  return: '帰還',
  retreat: '退却',
  rejoin: '君主のもとへ帰還',
  wander: '放浪',
  released: '契約解除',
}

const REASON_LABELS: Readonly<Record<BattleEndReason, string>> = {
  eliminated: '敵軍の殲滅・退却',
  stronghold: '防衛拠点への入城',
  commander: '軍団長部隊の全滅',
  commanderRetreat: '軍団長部隊の退却',
  undefended: '守り手の不在（領主・兵がいない）',
}

const cityName = (id: string | null) => (id ? CITY_MAP[id]?.name ?? id : '')

/** The characters of a battle: the data's, and its summoned units as it started (some are gone after it) */
const reportCharacter = (report: BattleReport) => (id: string) =>
  (report.summons[id] ? summonCharacter(id, report.summons[id]) : CHARACTER_MAP[id])

/** Outcome of a battle: who won, whether the city changed hands, where the knights went, who became lords */
export default function BattleResultScene({ params }: SceneProps<'battleResult'>) {
  const { state: game } = useGame()
  const { goTo } = useScene()
  const report = game.lastBattle
  if (!report || report.battle.id !== params.battleId) {
    return (
      <div className="battle-result battle-result--missing">
        <p>戦闘 {params.battleId} の結果はありません。</p>
        <button type="button" className="battle-result__button" onClick={() => goTo('strategy')}>戦略マップへ</button>
      </div>
    )
  }

  const { battle, winner, reason, cityCaptured, moves, retreats, wipeouts, governors, soldiers, prisoners, freed, lostRelicWork, lostSummons } = report
  const characterOf = reportCharacter(report)
  // Knights captured retreating, wiped out or in a city taken without a battle, how, and where they are held
  // (those the losing side captured are set free: they are not prisoners)
  const how = new Map([
    ...retreats.flatMap((r) => (r.captured && r.knightId ? [[r.knightId, '退却に失敗し'] as const] : [])),
    ...wipeouts.flatMap((w) => (w.captured && w.knightId ? [[w.knightId, '殲滅され'] as const] : [])),
    ...report.captives.map((id) => [id, '捕縛され'] as const),
  ])
  const captives = new Map(prisoners.map((p) => [p.characterId, `${how.get(p.characterId) ?? ''}${cityName(p.cityId)}で捕虜に`]))
  const winnerFaction = winner === 'attacker' ? battle.attacker.factionId : battle.defender.factionId
  const city = cityName(battle.cityId)
  const kinds = (Object.keys(MOVE_LABELS) as MoveKind[]).filter((k) => moves.some((m) => m.kind === k))
  const isWinner = isPlayerFaction(game, winnerFaction)

  useEffect(() => {
    playBgm(isWinner ? 'victor-accolade' : 'fallen-requiem')
  }, [isWinner])

  return (
    <div className="battle-result">
      <div className="battle-result__panel">
        <p className="battle-result__city">{city}攻防戦</p>
        <h1 className="battle-result__title">
          {winner === 'attacker' ? '攻撃側の勝利' : '防衛側の勝利'}
        </h1>
        <p className="battle-result__winner"><FactionLabel factionId={winnerFaction} /></p>
        {reason && <p className="battle-result__reason">{reason === 'undefended' ? `${REASON_LABELS[reason]}により戦闘なし` : `${REASON_LABELS[reason]}による決着`}</p>}

        <section className="battle-result__section">
          <h2>{city}</h2>
          {cityCaptured ? (
            <p className="battle-result__owner">
              <FactionLabel factionId={battle.defender.factionId} />
              <span className="battle-result__arrow">→</span>
              <FactionLabel factionId={battle.attacker.factionId} />
              <span>の領地になりました</span>
            </p>
          ) : (
            <p className="battle-result__owner">
              <FactionLabel factionId={battle.defender.factionId} />
              <span>が守り抜きました</span>
            </p>
          )}
        </section>

        {lostRelicWork && (
          <section className="battle-result__section">
            <h2>失われた遺物</h2>
            <p className="battle-result__owner">{relicWorkLabel(lostRelicWork)}が都市とともに失われました</p>
          </section>
        )}

        {soldiers.length > 0 && (
          <section className="battle-result__section">
            <h2>兵</h2>
            <ul className="battle-result__soldiers">
              {soldiers.map((r) => (
                <li key={r.cityId}>
                  {cityName(r.cityId)}に{r.soldiers.toLocaleString()}人
                  <span className="battle-result__soldiers-after">（{cityName(r.cityId)}の兵 {game.cities[r.cityId]?.troops.toLocaleString()}人）</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {kinds.map((kind) => (
          <section key={kind} className="battle-result__section">
            <h2>{MOVE_LABELS[kind]}</h2>
            <MoveList moves={moves.filter((m) => m.kind === kind)} characterOf={characterOf} />
          </section>
        ))}

        {lostSummons.length > 0 && (
          <section className="battle-result__section">
            <h2>召喚ユニットの消滅</h2>
            <KnightList ids={lostSummons} compact characterOf={characterOf} aside={() => '失われた'} />
          </section>
        )}

        {governors.length > 0 && (
          <section className="battle-result__section">
            <h2>領主の任命</h2>
            <KnightList
              ids={governors.map((g) => g.characterId)}
              compact
              aside={(id) => `${cityName(governors.find((g) => g.characterId === id)!.cityId)}の領主に`}
            />
          </section>
        )}

        {captives.size > 0 && (
          <section className="battle-result__section">
            <h2>捕虜</h2>
            <KnightList ids={[...captives.keys()]} compact aside={(id) => captives.get(id)} />
          </section>
        )}

        {freed.length > 0 && (
          <section className="battle-result__section">
            <h2>捕虜の解放</h2>
            <KnightList ids={freed} compact aside={() => `${city}で解放され、そのまま仕える`} />
          </section>
        )}

        <button type="button" className="battle-result__button" onClick={() => goTo('strategy')}>戦略マップへ</button>
      </div>
    </div>
  )
}

function MoveList({ moves, characterOf }: { moves: readonly CharacterMove[]; characterOf: (id: string) => Character | undefined }) {
  const byId = new Map(moves.map((m) => [m.characterId, m]))
  const describe = (id: string) => {
    const m = byId.get(id)!
    switch (m.kind) {
      case 'enter': return `${cityName(m.to)}に入城`
      case 'return': return `${cityName(m.to)}へ帰還`
      case 'retreat': return `${cityName(m.to)}へ退却`
      case 'rejoin': return `退却先が無く${cityName(m.to)}へ`
      case 'wander': return '退却先が無く放浪'
      case 'released': return '傭兵の契約が切れた'
    }
  }
  return <KnightList ids={moves.map((m) => m.characterId)} compact aside={describe} characterOf={characterOf} />
}
