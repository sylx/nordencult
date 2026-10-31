import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' })

for (const size of [{ width: 160, height: 90 }, { width: 2400, height: 800 }, { width: 300, height: 1400 }]) {
  test(`fits the frame to a ${size.width} × ${size.height} image without enlarging or cropping it`, async ({ page }) => {
    await page.route('**/faction_destruction.webp*', route => {
      if (route.request().resourceType() !== 'image') return route.continue()
      return route.fulfill({
        contentType: 'image/svg+xml',
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}"><rect width="100%" height="100%" fill="#856038"/></svg>`,
      })
    })
    await page.goto('/#event')
    const frame = page.locator('.norden-event-cut')
    const image = frame.locator('img')
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(size.width)

    for (const viewportWidth of [1600, 800]) {
      await page.setViewportSize({ width: viewportWidth, height: 1000 })
      const bounds = await image.boundingBox()
      const frameBounds = await frame.boundingBox()
      const bodyBounds = await page.locator('.norden-event-body').boundingBox()
      expect(bounds!.width).toBeLessThanOrEqual(size.width)
      expect(bounds!.height).toBeLessThanOrEqual(Math.min(size.height, 520))
      expect(bounds!.width / bounds!.height).toBeCloseTo(size.width / size.height, 2)
      expect(frameBounds!.width).toBeCloseTo(bounds!.width + 32, 1)
      expect(frameBounds!.height).toBeCloseTo(bounds!.height + 32, 1)
      expect(frameBounds!.width).toBeLessThanOrEqual(bodyBounds!.width)
    }

    const decorationWidth = await frame.locator('.norden-image-frame-border').evaluate(async element => {
      const source = getComputedStyle(element).borderImageSource
      const url = source.match(/^url\(["']?(.*?)["']?\)$/)?.[1]
      const decoration = new Image()
      decoration.src = url ?? ''
      await decoration.decode()
      return decoration.naturalWidth
    })
    expect(decorationWidth).toBe(240)
  })
}

test('fits technology sprites and their image-free placeholders', async ({ page }) => {
  await page.goto('/#event')
  await page.getByLabel('通知の種類').selectOption('tech')
  const frame = page.locator('.norden-event-cut')
  const picture = frame.locator('.norden-building-image')
  for (const withPicture of [true, false]) {
    await page.getByRole('checkbox', { name: /技術の画像あり/ }).setChecked(withPicture)
    const bounds = (await picture.boundingBox())!
    const frameBounds = (await frame.boundingBox())!
    expect(bounds.width).toBe(220)
    expect(bounds.height).toBeGreaterThan(30)
    expect(frameBounds.width).toBeCloseTo(bounds.width + 32, 1)
    expect(frameBounds.height).toBeCloseTo(bounds.height + 32, 1)
    if (!withPicture) expect(bounds.width).toBeCloseTo(bounds.height, 1)
  }
})
