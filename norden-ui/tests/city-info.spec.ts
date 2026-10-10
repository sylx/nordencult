import { expect, test } from '@playwright/test'

test('city information uses graphic meters and icon tabs, and previews real character art', async ({ page }, testInfo) => {
  await page.goto('/#city-command')
  for (const name of ['農業', '商業', '生産']) {
    await expect(page.getByRole('meter', { name })).toBeVisible()
  }
  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(3)
  for (const tab of await tabs.all()) {
    await expect(tab).toHaveText('')
    await expect(tab.locator('img')).toBeVisible()
  }
  await expect(page.getByRole('list', { name: '特徴' }).getByText('港')).toHaveCSS('font-size', '16px')

  const lordChoice = page.getByLabel('領主画像')
  if (await lordChoice.locator('option').count() > 2) {
    await lordChoice.selectOption('001')
    const lord = page.getByRole('img', { name: 'セラフィナ・ルクスの立ち絵' })
    await expect(lord).toBeVisible()
    await expect(lord.locator('svg')).toHaveAttribute('viewBox', '0 0 512 768')
    expect(await lord.locator('image').evaluate(async element => {
      const img = new Image()
      img.src = element.getAttribute('href')!
      await img.decode()
      return img.naturalWidth
    })).toBe(2560)
    await lordChoice.selectOption('017')
    await expect(page.getByRole('img', { name: 'ゲルハルト・アイゼンの立ち絵' })).toBeVisible()
  }

  for (const skin of ['thin', 'medium', 'goddess']) {
    await page.getByLabel('ウィンドウのスキン').selectOption(skin)
    const viewport = page.locator('.norden-info-window-content')
    await expect.poll(() => viewport.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
    const stageBounds = (await page.getByRole('region', { name: 'プレビュー' }).boundingBox())!
    const windowBounds = (await page.locator('.norden-info-window').boundingBox())!
    expect(windowBounds.width).toBeGreaterThan(480)
    // CityInfoWindow's maximum size; the 都市情報 panel scrolls past it
    expect(windowBounds.width).toBeLessThanOrEqual(544 + 1)
    expect(windowBounds.height).toBeLessThanOrEqual(633 + 1)
    expect(windowBounds.x + windowBounds.width).toBeLessThanOrEqual(stageBounds.x + stageBounds.width)
    expect((await tabs.first().boundingBox())!.x).toBeGreaterThanOrEqual(stageBounds.x)
    await page.screenshot({ path: testInfo.outputPath(`city-${skin}.png`), fullPage: true })
  }
  await page.getByRole('tab', { name: '騎士', exact: true }).click()
  await expect(page.locator('.norden-knight-card')).toHaveCount(4)
  if (await lordChoice.locator('option').count() > 2) {
    await expect(page.locator('.norden-knight-face image')).toHaveCount(4)
    await expect(page.locator('.norden-knight-initial')).toHaveCount(0)
  }
  await page.screenshot({ path: testInfo.outputPath('city-knights.png'), fullPage: true })
  await page.getByRole('tab', { name: '都市情報' }).click()
  await lordChoice.selectOption('none')
  await expect(page.locator('.norden-city-info-lord')).toHaveCount(0)
  await expect(page.getByRole('meter', { name: '生産' })).toBeVisible()
})


test('basic window and city command share city panels, knight cards and window defaults', async ({ page }) => {
  const previews = []
  for (const route of ['city-command', 'info-window']) {
    await page.goto(`/#${route}`)
    await expect(page.getByRole('meter', { name: '生産' })).toBeVisible()
    const city = await page.locator('.norden-city-info').evaluate(element => ({
      content: (element as HTMLElement).innerText,
      lord: element.querySelector('.norden-city-info-lord svg')?.getAttribute('viewBox'),
      bottomPadding: getComputedStyle(element.closest('.norden-info-window-measure')!).paddingBottom,
      tabIcons: Array.from(element.closest('.norden-info-window')!.querySelectorAll('.norden-tab')).slice(0, 2).map(tab => ({
        label: tab.getAttribute('aria-label'),
        text: tab.textContent,
        width: getComputedStyle(tab.querySelector('img')!).width,
      })),
    }))
    await page.getByRole('tab', { name: '騎士', exact: true }).click()
    await expect(page.locator('.norden-knight-card')).toHaveCount(4)
    const knights = await page.locator('.norden-city-knights').evaluate(element => ({
      names: Array.from(element.querySelectorAll('.norden-knight-name'), name => name.textContent),
      portraits: Array.from(element.querySelectorAll('.norden-knight-face svg'), portrait => portrait.getAttribute('viewBox')),
      bottomPadding: getComputedStyle(element.closest('.norden-info-window-measure')!).paddingBottom,
    }))
    previews.push({ city, knights })
  }
  expect(previews[1]).toEqual(previews[0])
})
