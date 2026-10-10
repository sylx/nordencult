import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

// Headless Chromium hides scrollbars; show them so they take up width as in the game.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } })

async function settledSize(window: Locator) {
  await window.evaluate(async () => { await document.fonts.ready })
  await expect.poll(async () => window.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    const style = (element as HTMLElement).style
    return Math.abs(bounds.width - parseFloat(style.width)) + Math.abs(bounds.height - parseFloat(style.height))
  })).toBeLessThan(1)
  await expect(window).toHaveCSS('opacity', '1')
  return (await window.boundingBox())!
}

/** Scrolls vertically with a visible scrollbar, and never horizontally */
async function expectVerticalScrollOnly(page: Page, message: string) {
  const viewport = page.locator('.norden-info-window-content')
  expect(await viewport.evaluate(element => (element as HTMLElement).offsetWidth - element.clientWidth), message).toBeGreaterThan(0)
  await expect.poll(() => viewport.evaluate(element => element.scrollWidth - element.clientWidth), { message }).toBeLessThanOrEqual(0)
}

test('many knights keep the window within its maximum height and scroll inside it', async ({ page }) => {
  await page.goto('/#info-window')
  const window = page.locator('.norden-info-window')
  const viewport = window.locator('.norden-info-window-content')
  await page.getByRole('tab', { name: '騎士', exact: true }).click()
  const few = await settledSize(window)
  await page.getByLabel('騎士の人数（騎士タブ）').selectOption('20')
  await expect(page.locator('.norden-knight-card')).toHaveCount(20)
  for (const skin of ['thin', 'medium', 'goddess']) {
    await page.getByLabel('装飾スキン').selectOption(skin)
    const many = await settledSize(window)
    // Like the width, the height is capped by the screen: 16px clear above and below.
    const limit = await page.evaluate(() => document.documentElement.clientHeight - 32)
    expect(many.height, skin).toBeGreaterThan(few.height)
    expect(many.height, skin).toBeLessThanOrEqual(limit)
    expect(await viewport.evaluate(element => element.scrollHeight - element.clientHeight), skin).toBeGreaterThan(0)
    await expectVerticalScrollOnly(page, skin)
  }
  await page.getByLabel('騎士の人数（騎士タブ）').selectOption('1')
  await expect(page.locator('.norden-knight-card')).toHaveCount(1)
  expect((await settledSize(window)).height).toBeLessThan(few.height + 1)
})

test('the city window\'s knight list never scrolls sideways', async ({ page }) => {
  await page.goto('/#city-command')
  const window = page.locator('.norden-info-window')
  await page.getByRole('tab', { name: '騎士', exact: true }).click()
  await expect(page.locator('.norden-knight-card')).toHaveCount(4)
  for (const skin of ['thin', 'medium', 'goddess']) {
    await page.getByLabel('ウィンドウのスキン').selectOption(skin)
    await page.getByRole('tab', { name: '騎士', exact: true }).click()
    const bounds = await settledSize(window)
    expect(bounds.width, skin).toBeLessThanOrEqual(544 + 1)
    expect(bounds.height, skin).toBeLessThanOrEqual(633 + 1)
    await expect.poll(() => page.locator('.norden-info-window-content').evaluate(element => element.scrollWidth - element.clientWidth), { message: skin })
      .toBeLessThanOrEqual(0)
  }
})

test('at the width limit the content narrows for the scrollbar instead', async ({ page }) => {
  await page.setViewportSize({ width: 560, height: 720 })
  await page.goto('/#info-window')
  const window = page.locator('.norden-info-window')
  await page.getByRole('tab', { name: '騎士', exact: true }).click()
  await page.getByLabel('騎士の人数（騎士タブ）').selectOption('20')
  const bounds = await settledSize(window)
  expect(bounds.width).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth - 32))
  await expectVerticalScrollOnly(page, 'narrow screen')
})
