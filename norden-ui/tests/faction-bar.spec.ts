import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1600, height: 1000 } })

test('the orb drags the whole bar, keeps its position after a city change, and resets', async ({ page }) => {
  await page.goto('/#faction-bar')
  const bar = page.getByRole('group', { name: '勢力', exact: true })
  const orb = page.getByRole('button', { name: 'カルタ書院のバーを移動' })
  const initial = (await bar.boundingBox())!
  const handle = (await orb.boundingBox())!
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle.x + handle.width / 2 + 90, handle.y + handle.height / 2 + 120, { steps: 8 })
  await page.mouse.up()
  const moved = (await bar.boundingBox())!
  expect(moved.x).toBeCloseTo(initial.x + 90, 1)
  expect(moved.y).toBeCloseTo(initial.y + 120, 1)
  await expect(bar).not.toHaveClass(/is-dragging/)
  await page.getByRole('button', { name: '次の都市', exact: true }).click()
  await expect(bar).toContainText('ヴェステル')
  expect((await bar.boundingBox())!.x).toBeCloseTo(moved.x, 1)
  await page.getByRole('button', { name: '位置をリセット' }).click()
  const reset = (await bar.boundingBox())!
  expect(reset.x).toBeCloseTo(initial.x, 1)
  expect(reset.y).toBeCloseTo(initial.y, 1)
})

test('navigation does not drag the bar, and its decorative image decodes', async ({ page }) => {
  await page.goto('/#faction-bar')
  const bar = page.getByRole('group', { name: '勢力', exact: true })
  const initial = await bar.boundingBox()
  await page.getByRole('button', { name: '次の都市', exact: true }).click()
  expect(await bar.boundingBox()).toEqual(initial)
  const imageWidth = await bar.locator('.norden-faction-bar-cap.is-right image').evaluate(async element => {
    const url = element.getAttribute('href')
    if (!url) return 0
    const image = new Image()
    image.src = url
    await image.decode()
    return image.naturalWidth
  })
  expect(imageWidth).toBeGreaterThan(0)
  await page.getByLabel('球をドラッグして移動する').uncheck()
  await expect(page.getByRole('button', { name: 'カルタ書院のバーを移動' })).toBeDisabled()
})

test('only the middle stretches when ribbon width changes, while both caps retain their proportions', async ({ page }) => {
  await page.goto('/#faction-bar')
  const bar = page.getByRole('group', { name: '勢力', exact: true })
  const left = bar.locator('.norden-faction-bar-cap.is-left')
  const right = bar.locator('.norden-faction-bar-cap.is-right')
  await page.getByLabel('内容に幅を合わせる').uncheck()
  for (const height of [56, 120]) {
    await page.getByLabel('バー部分の高さ（px）').fill(String(height))
    let firstMiddleWidth: number | undefined
    for (const width of [500, 640, 800]) {
      await page.getByLabel('バー全体の幅（px）').fill(String(width))
      await expect(bar).toHaveCSS('width', `${width}px`)
      const leftBounds = (await left.boundingBox())!
      const rightBounds = (await right.boundingBox())!
      expect(leftBounds.height).toBe(height)
      expect(rightBounds.height).toBe(height)
      expect(leftBounds.width / leftBounds.height).toBeCloseTo(102 / 333, 2)
      expect(rightBounds.width / rightBounds.height).toBeCloseTo(313 / 333, 2)
      const middle = (await bar.locator('.norden-faction-bar-middle').boundingBox())!
      expect(leftBounds.x + leftBounds.width).toBeCloseTo(middle.x, 1)
      expect(middle.x + middle.width).toBeCloseTo(rightBounds.x, 1)
      if (firstMiddleWidth !== undefined) expect(middle.width).toBeGreaterThan(firstMiddleWidth)
      else firstMiddleWidth = middle.width
    }
  }
})

test('ribbon height changes independently of the round orb and retains vertical content padding', async ({ page }) => {
  await page.goto('/#faction-bar')
  const bar = page.getByRole('group', { name: '勢力', exact: true })
  const orb = page.getByRole('button', { name: 'カルタ書院のバーを移動' })
  const content = bar.locator('.norden-faction-bar-content')
  const initial = (await orb.boundingBox())!
  expect(initial.width).toBe(initial.height)
  for (const height of [56, 80, 120]) {
    await page.getByLabel('バー部分の高さ（px）').fill(String(height))
    await expect(content).toHaveCSS('height', `${height}px`)
    await expect(content).toHaveCSS('padding-top', '10px')
    await expect(content).toHaveCSS('padding-bottom', '10px')
    const sphere = (await orb.boundingBox())!
    expect(sphere.width).toBe(initial.width)
    expect(sphere.height).toBe(initial.height)
    const ribbon = (await bar.locator('.norden-faction-bar-ribbon').boundingBox())!
    expect(sphere.y + sphere.height / 2).toBeCloseTo(ribbon.y + ribbon.height / 2, 1)
  }
})
