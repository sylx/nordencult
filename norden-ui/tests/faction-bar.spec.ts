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
  const imageWidth = await bar.locator('.norden-faction-bar-ribbon').evaluate(async element => {
    const source = getComputedStyle(element, '::before').borderImageSource
    const url = source.match(/^url\(["']?(.*?)["']?\)$/)?.[1]
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
