import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => { await page.goto('/#navigation-window') })

test('preview navigates to both boundaries, disables each control, and reopens', async ({ page }) => {
  const window = page.getByRole('region', { name: '戻る・進むボタン付きウィンドウのプレビュー' })
  const back = window.getByRole('button', { name: '戻る', exact: true })
  const forward = window.getByRole('button', { name: '進む', exact: true })
  await expect(back).toBeEnabled()
  await expect(forward).toBeEnabled()
  await back.click()
  await expect(window.getByRole('heading', { name: 'フルーエン', exact: true })).toBeVisible()
  await expect(back).toBeDisabled()
  await forward.click()
  await forward.click()
  await expect(forward).toBeDisabled()
  await back.click()
  await page.getByLabel('戻るを無効にする').check()
  await page.getByLabel('進むを無効にする').check()
  await expect(back).toBeDisabled()
  await expect(forward).toBeDisabled()
  await page.getByLabel('戻るを無効にする').uncheck()
  await expect(back).toBeEnabled()
  await expect(forward).toBeDisabled()
  await window.getByRole('button', { name: '閉じる' }).click()
  await expect(window).toHaveCount(0)
  await page.getByRole('button', { name: 'ウィンドウを再表示' }).click()
  await expect(window).toBeVisible()
})

test('decoration is transparent and buttons remain clear of the title at small widths', async ({ page }, testInfo) => {
  const frame = page.locator('.norden-window-frame-with-navigation')
  const decoration = page.locator('.norden-window-frame-navigation-decoration')
  const alpha = await decoration.evaluate(async element => {
    const image = new Image()
    image.src = getComputedStyle(element).backgroundImage.slice(5, -2)
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width; canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, image.width, image.height).data
    const at = (x: number, y: number) => pixels[(y * image.width + x) * 4 + 3]!
    return { corner: at(0, 0), face: at(Math.round(image.width * .3), Math.round(image.height * .5)) }
  })
  expect(alpha.corner).toBe(0)
  expect(alpha.face).toBeGreaterThanOrEqual(250)
  await page.getByLabel('進むを無効にする').check()
  await frame.screenshot({ path: testInfo.outputPath('navigation-window.png') })
  for (const size of [48, 64, 96]) {
    await page.getByLabel('枠の装飾サイズ（px）').fill(String(size))
    await page.getByLabel('幅（px）', { exact: true }).fill('280')
    const back = await frame.getByRole('button', { name: '戻る', exact: true }).boundingBox()
    const forward = await frame.getByRole('button', { name: '進む', exact: true }).boundingBox()
    const close = await frame.getByRole('button', { name: '閉じる', exact: true }).boundingBox()
    const title = await frame.locator('.norden-window-frame-title').boundingBox()
    expect(back!.x + back!.width).toBeLessThanOrEqual(forward!.x)
    expect(forward!.x + forward!.width).toBeLessThanOrEqual(title!.x)
    expect(title!.x + title!.width).toBeLessThanOrEqual(close!.x)
  }
  await page.getByLabel('長い本文（スクロール確認）').check()
  expect(await frame.locator('.norden-window-frame-content').evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
})

test('dragging the title moves the entire window, keeps its offset across navigation, and resets', async ({ page }) => {
  const frame = page.locator('.norden-window-frame-with-navigation')
  const title = frame.getByRole('button', { name: 'ウィンドウを移動', exact: true })
  const initial = (await frame.boundingBox())!
  const dragTitle = async (dx: number, dy: number) => {
    const bounds = (await title.boundingBox())!
    const x = bounds.x + bounds.width / 2
    const y = bounds.y + bounds.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx, y + dy, { steps: 5 })
    await expect(frame).toHaveClass(/is-dragging/)
    await page.mouse.up()
    await expect(frame).not.toHaveClass(/is-dragging/)
    expect(await title.evaluate(element => element.hasPointerCapture(1))).toBe(false)
  }
  await dragTitle(60, 40)
  let moved = (await frame.boundingBox())!
  expect(moved.x - initial.x).toBeCloseTo(60, 0)
  expect(moved.y - initial.y).toBeCloseTo(40, 0)
  expect(moved.width).toBe(initial.width)
  expect(moved.height).toBe(initial.height)
  await dragTitle(-20, -15)
  moved = (await frame.boundingBox())!
  expect(moved.x - initial.x).toBeCloseTo(40, 0)
  expect(moved.y - initial.y).toBeCloseTo(25, 0)
  await frame.getByRole('button', { name: '戻る', exact: true }).click()
  await expect(frame.getByRole('button', { name: '戻る', exact: true })).toBeDisabled()
  expect((await frame.boundingBox())!.x).toBeCloseTo(moved.x, 0)
  expect((await frame.boundingBox())!.y).toBeCloseTo(moved.y, 0)
  await page.getByRole('button', { name: '位置をリセット', exact: true }).click()
  expect((await frame.boundingBox())!.x).toBeCloseTo(initial.x, 0)
  expect((await frame.boundingBox())!.y).toBeCloseTo(initial.y, 0)
})

test('keyboard movement, drag cancellation, and disabling movement preserve a usable window', async ({ page }) => {
  const frame = page.locator('.norden-window-frame-with-navigation')
  const title = frame.locator('.norden-window-frame-title')
  const initial = (await frame.boundingBox())!
  await title.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Shift+ArrowDown')
  expect((await frame.boundingBox())!.x - initial.x).toBeCloseTo(10, 0)
  expect((await frame.boundingBox())!.y - initial.y).toBeCloseTo(1, 0)
  await page.keyboard.press('Home')
  expect((await frame.boundingBox())!.x).toBeCloseTo(initial.x, 0)
  expect((await frame.boundingBox())!.y).toBeCloseTo(initial.y, 0)
  const bounds = (await title.boundingBox())!
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 20, y + 20, { steps: 3 })
  await title.dispatchEvent('pointercancel', { pointerId: 1 })
  await expect(frame).not.toHaveClass(/is-dragging/)
  const cancelled = (await frame.boundingBox())!
  await page.mouse.move(x + 50, y + 50, { steps: 3 })
  await page.mouse.up()
  expect((await frame.boundingBox())!.x).toBeCloseTo(cancelled.x, 0)
  expect((await frame.boundingBox())!.y).toBeCloseTo(cancelled.y, 0)
  await page.getByLabel('タイトルをドラッグして移動する').uncheck()
  await expect(title).not.toHaveAttribute('tabindex')
  const locked = (await title.boundingBox())!
  await page.mouse.move(locked.x + locked.width / 2, locked.y + locked.height / 2)
  await page.mouse.down()
  await page.mouse.move(locked.x + locked.width / 2 + 30, locked.y + locked.height / 2 + 20)
  await page.mouse.up()
  expect((await frame.boundingBox())!.x).toBeCloseTo(cancelled.x, 0)
  expect((await frame.boundingBox())!.y).toBeCloseTo(cancelled.y, 0)
  await frame.getByRole('button', { name: '閉じる', exact: true }).click()
  await expect(frame).toHaveCount(0)
})
