import { buySupplies, buySuppliesProblem, citiesOf, flagOf, setFlag } from '../game'
import { gameScene } from './define'
import script from './travelingMerchant.json'

/** The chance a haggle comes off; otherwise the merchant leaves offended, and remembers it */
const HAGGLE_CHANCE = 0.5
/** What a haggle takes off the price */
const HAGGLE_RATE = 0.7

/**
 * A travelling merchant (a random event): they offer supplies for gold, to buy, haggle over or turn down.
 * They remember how many times they came (travelingMerchant:met) and a haggle that offended them (…:offended)
 */
export const travelingMerchantScene = gameScene(script, { city: 'city' }, async (ctx, { city }) => {
  const met = flagOf(ctx.state, 'travelingMerchant:met')
  const visits = (typeof met === 'number' ? met : 0) + 1
  const supplies = 100 * (2 + Math.floor(ctx.random() * 3))
  const price = supplies
  const cheap = Math.round(price * HAGGLE_RATE)
  ctx.bind({ city, supplies, price, cheap, visits })
  ctx.update((s) => setFlag(s, 'travelingMerchant:met', visits))
  if (visits === 1) {
    await ctx.play('first')
  } else {
    await ctx.play('again')
    if (flagOf(ctx.state, 'travelingMerchant:offended')) await ctx.play('grudge')
  }
  const pick = await ctx.choose('trade', {
    disabled: { buy: buySuppliesProblem(ctx.state, city, price), haggle: buySuppliesProblem(ctx.state, city, cheap) },
  })
  if (pick === 'buy') {
    ctx.update((s) => buySupplies(s, city, supplies, price))
    await ctx.play('bought')
  } else if (pick === 'haggle') {
    if (ctx.random() < HAGGLE_CHANCE) {
      ctx.update((s) => setFlag(buySupplies(s, city, supplies, cheap), 'travelingMerchant:offended', false))
      await ctx.play('haggled')
    } else {
      ctx.update((s) => setFlag(s, 'travelingMerchant:offended', true))
      await ctx.play('offended')
    }
  } else {
    await ctx.play('declined')
  }
}, (state) => {
  const city = state.activeFaction ? citiesOf(state, state.activeFaction)[0] : undefined
  return city ? { city } : null
})
