import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => { await page.goto('/#strategy-flow') })

test('city command → invade → pick a target on the map → invasion screen, Escape steps back', async ({ page }) => {
  const stack = page.locator('.demo-readout dd').first()
  await expect(page.getByRole('region', { name: 'カルタ書院 フルーエン' })).toBeVisible()

  await page.getByRole('button', { name: /軍事/ }).click()
  await page.getByRole('group', { name: '軍事' }).getByRole('button', { name: '侵攻' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'フルーエンからの侵攻先を選んでください' })).toBeVisible()
  await expect(stack).toHaveText('cityCommand › pickTarget')
  // Only the open targets can be picked
  await expect(page.getByRole('button', { name: 'ヴェステル' })).toBeDisabled()

  await page.getByRole('button', { name: 'アンバリア' }).click()
  await expect(page.getByRole('region', { name: '出撃する騎士' })).toBeVisible()
  await page.getByRole('checkbox', { name: /エルネスト/ }).check()
  await expect(page.getByRole('region', { name: 'エルネスト・ヴァイスの部隊' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(stack).toHaveText('cityCommand › pickTarget')
  await page.getByRole('button', { name: 'アンバリア' }).click()
  // The screen is mounted fresh: nobody is picked
  await expect(page.getByRole('checkbox', { name: /エルネスト/ })).not.toBeChecked()
  await page.getByRole('checkbox', { name: /エルネスト/ }).check()
  await page.getByRole('checkbox', { name: /リディア/ }).check()
  await page.getByRole('radiogroup', { name: 'リディア・ハーンの兵科' }).getByRole('radio', { name: '騎兵' }).click()
  await page.getByRole('button', { name: '予約' }).click()

  await expect(stack).toHaveText('cityCommand')
  await expect(page.getByRole('region', { name: '侵攻予約' })).toContainText('フルーエン → アンバリア')
  await page.getByRole('tab', { name: '騎士' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('アンバリアへ侵攻予約中')
})

test('sub-commands close on Escape before the screen goes back, and ◀ ▶ switch cities', async ({ page }) => {
  await page.getByRole('button', { name: '次の都市' }).click()
  await expect(page.getByRole('region', { name: 'カルタ書院 ヴェステル' })).toBeVisible()
  await page.getByRole('button', { name: /軍事/ }).click()
  await page.getByRole('button', { name: '侵攻' }).click()
  await page.getByRole('button', { name: '前の都市' }).waitFor({ state: 'detached' })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('region', { name: 'カルタ書院 ヴェステル' })).toBeVisible()

  await page.getByRole('button', { name: /軍事/ }).click()
  await expect(page.getByRole('group', { name: '軍事' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('group', { name: '軍事' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'カルタ書院 ヴェステル' })).toBeVisible()
})
