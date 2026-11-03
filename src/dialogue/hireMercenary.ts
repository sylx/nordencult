import { CHARACTER_MAP } from '../data/character'
import { GameRuleError } from '../game/errors'
import { citiesOf, contractPrice, hireMercenary, hireProblem, isMercenary, mercenaryMarket, prideProblem } from '../game'
import { gameScene } from './define'
import script from './hireMercenary.json'

/**
 * Hiring a mercenary (the mercenary screen's 交渉): they come up and name themselves; those who will not sign with
 * the faction (prideProblem) turn it away there, before any price. The others name their price, and the player signs
 * or not. Short of gold, 契約する cannot be chosen, and says why. The lines change with the mercenary's 口調, and some
 * mercenaries have lines of their own
 */
export const hireMercenaryScene = gameScene(script, { city: 'city', merc: 'character' }, async (ctx, { city, merc }) => {
  const factionId = ctx.state.activeFaction
  if (!factionId) throw new GameRuleError('手番ではありません')
  if (!isMercenary(merc)) throw new GameRuleError(`${CHARACTER_MAP[merc]?.name ?? merc} は傭兵ではありません`)
  const { fee, monthly } = contractPrice(ctx.state, factionId, merc)
  ctx.bind({ merc, city, company: CHARACTER_MAP[merc].mercenaryInfo!.name, price: fee, monthly })
  await ctx.play('greet')
  if (prideProblem(ctx.state, factionId, merc)) {
    await ctx.play('refuse')
    return
  }
  await ctx.play('offer')
  const pick = await ctx.choose('hire', { disabled: { yes: hireProblem(ctx.state, city, merc) } })
  if (pick === 'yes') {
    ctx.update((s) => hireMercenary(s, city, merc))
    await ctx.play('accept')
  } else {
    await ctx.play('decline')
  }
}, (state) => {
  // A city of the faction playing that has a mercenary within reach, and the first of them
  const cities = state.activeFaction ? citiesOf(state, state.activeFaction) : []
  const city = cities.find((id) => mercenaryMarket(state, id).length > 0)
  return city ? { city, merc: mercenaryMarket(state, city)[0] } : null
})
