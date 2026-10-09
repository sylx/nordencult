import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => { await page.goto('/#parts') })

test('resizes the ornamental button and keeps quantity controls synchronized', async ({ page }) => {
  await page.getByLabel('幅（px）').fill('250')
  await page.getByLabel('高さ（px）').fill('64')
  const button = page.getByRole('button', { name: '出撃する' })
  await expect(button).toHaveCSS('width', '250px')
  await expect(button).toHaveCSS('height', '64px')
  await button.click()
  await expect(page.getByLabel('操作ログ')).toContainText('任意サイズのボタン')

  const slider = page.getByRole('slider', { name: '兵数' })
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('spinbutton', { name: '兵数（数値）' })).toHaveValue('250')
  await page.getByRole('button', { name: '兵数を減らす' }).click()
  await expect(slider).toHaveValue('240')
})

test('previews available repository portraits and uploaded images without copying files', async ({ page }) => {
  const character = page.getByLabel('人物', { exact: true })
  const options = character.locator('option')
  const card = page.locator('.norden-knight-card').first()
  // norden-ui can also be checked out alone, without the parent game's assets.
  if (await options.count() > 1) {
    const next = await options.nth(1).getAttribute('value')
    await character.selectOption(next!)
    await expect(card.locator('.norden-knight-face image')).toHaveAttribute('href', /character\.webp/)
    await expect(card.locator('.norden-knight-name')).toHaveText(await options.nth(1).innerText())
  } else {
    await expect(card.locator('.norden-knight-initial')).toBeVisible()
  }

  await page.getByLabel('画像の表示').selectOption('upload')
  await page.getByLabel('画像ファイル').setInputFiles({
    name: 'generated-character.svg', mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#b08a44"/></svg>'),
  })
  await expect(card.locator('.norden-knight-face img')).toHaveAttribute('src', /^blob:/)
  await expect.poll(() => card.locator('.norden-knight-face img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(100)
  await page.getByLabel('名前', { exact: true }).fill('新しい騎士')
  await page.getByLabel('統率', { exact: true }).fill('95')
  await expect(card).toContainText('新しい騎士')
  await expect(card.locator('.norden-knight-stat').first()).toContainText('95')
  await page.getByRole('checkbox', { name: '新しい騎士' }).uncheck()
  await expect(page.getByRole('checkbox', { name: '新しい騎士' })).not.toBeChecked()
})
