import type { ReactNode } from 'react'
import { CITY_MAP } from 'norden-strategy'
import { FactionLabel } from '../../components/FactionLabel'
import { isPlayerTurn, type GameState, type InvasionOrder } from '../../game'
import './Hud.css'

const PHASE_LABELS = { strategy: '戦略フェーズ', march: '行軍フェーズ' } as const

const cityName = (id: string) => CITY_MAP[id]?.name ?? id

/** Turn, phase and whose turn it is, with the button ending the player's turn */
export function TurnBar({ game, onEndTurn }: { game: GameState; onEndTurn: () => void }) {
  const playerTurn = isPlayerTurn(game)
  return (
    <header className="hud-bar" aria-label="ターン">
      <span className="hud-bar__turn">第 <b>{game.turn}</b> ターン</span>
      <span className="hud-bar__phase">{PHASE_LABELS[game.phase]}</span>
      <span className="hud-bar__active">
        {game.activeFaction
          ? <><FactionLabel factionId={game.activeFaction} /><span>の手番</span></>
          : <span>全勢力の侵攻を解決中</span>}
      </span>
      <button type="button" className="hud-button hud-button--primary" disabled={!playerTurn} onClick={onEndTurn}>
        ターン終了
      </button>
      <span className="hud-bar__player">プレイヤー <FactionLabel factionId={game.playerFaction} /></span>
    </header>
  )
}

interface OrderListProps {
  game: GameState
  onCancel: (orderId: string) => void
  onSelectCity: (id: string) => void
}

/** The player's invasions ordered this turn; in the march phase every order still to resolve */
export function OrderList({ game, onCancel, onSelectCity }: OrderListProps) {
  const playerTurn = isPlayerTurn(game)
  const march = game.march
  const orders: InvasionOrder[] = march
    ? game.orders.filter((o) => march.queue.includes(o.id) || march.current?.orderId === o.id)
    : game.orders.filter((o) => o.factionId === game.playerFaction)
  if (orders.length === 0 && game.phase === 'march') return null
  return (
    <section className="hud-panel hud-orders" aria-label="侵攻予約">
      <h2 className="hud-panel__title">{march ? '行軍' : '侵攻予約'}</h2>
      {orders.length === 0
        ? <p className="hud-orders__empty">予約はありません。自勢力の都市を選んで「侵攻」を押してください。</p>
        : (
          <ol className="hud-orders__list">
            {orders.map((o) => (
              <li key={o.id} className={march?.current?.orderId === o.id ? 'hud-orders__item--current' : undefined}>
                {march && <FactionLabel factionId={o.factionId} className="hud-orders__faction" />}
                <button type="button" className="hud-orders__route" onClick={() => onSelectCity(o.from)}>
                  {cityName(o.from)} → {cityName(o.to)}
                </button>
                <span className="hud-orders__count">{o.knights.length}人</span>
                {playerTurn && o.factionId === game.playerFaction && (
                  <button type="button" className="hud-button hud-button--small" onClick={() => onCancel(o.id)}>取消</button>
                )}
              </li>
            ))}
          </ol>
        )}
    </section>
  )
}

/** A short notice in the middle of the top, e.g. a CPU faction's turn or the guide for choosing a target */
export function Banner({ children }: { children: ReactNode }) {
  return <div className="hud-banner" role="status">{children}</div>
}
