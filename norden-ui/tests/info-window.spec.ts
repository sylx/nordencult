import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

async function settledSize(window: Locator) {
  await window.evaluate(async () => { await document.fonts.ready })
  // Wait until the actual frame reaches its measured target, including the CSS transition.
  await expect.poll(async () => window.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    const style = (element as HTMLElement).style
    return Math.abs(bounds.width - parseFloat(style.width)) + Math.abs(bounds.height - parseFloat(style.height))
  })).toBeLessThan(1)
  await expect(window).toHaveCSS('opacity', '1')
  return (await window.boundingBox())!
}

test.beforeEach(async ({ page }) => { await page.goto('/') })

test('demo inherits skin title positions until an axis is edited and can restore them', async ({ page }) => {
  const skinOffsets = await page.evaluate(async () => {
    // Read the runtime presets so this regression stays valid when artwork positions change.
    const moduleUrl = '/src/skins.ts'
    const { resolveWindowSkin, windowSkins } = await import(moduleUrl) as typeof import('../src/skins')
    return Object.fromEntries((['medium', 'goddess'] as const).map(name => {
      const { titleOffsetX: x, titleOffset: y } = resolveWindowSkin(windowSkins[name]).layout
      return [name, { x, y }]
    })) as Record<string, { x: number; y: number }>
  })
  const window = page.locator('.norden-info-window')
  const title = window.locator('.norden-info-window-title')
  const xInput = page.getByLabel('タイトルバーの横オフセット（px）')
  const yInput = page.getByLabel('タイトルバーの縦オフセット（px）')
  const expectPosition = async ({ x, y }: { x: number; y: number }) => {
    await expect(xInput).toHaveValue(String(x))
    await expect(yInput).toHaveValue(String(y))
    await expect(title).toHaveCSS('top', `${y}px`)
    await settledSize(window)
    expect(await title.evaluate(element => {
      const title = element.getBoundingClientRect()
      const frame = element.parentElement!.getBoundingClientRect()
      return title.x + title.width / 2 - frame.x - frame.width / 2
    })).toBeCloseTo(x, 0)
  }
  await expectPosition(skinOffsets.medium!)
  await xInput.fill('24')
  await expectPosition({ ...skinOffsets.medium!, x: 24 })
  await yInput.fill('0')
  await expectPosition({ x: 24, y: 0 })
  await page.getByRole('button', { name: 'スキンのタイトル位置に戻す' }).click()
  await expectPosition(skinOffsets.medium!)
  await yInput.fill('-40')
  await page.getByLabel('装飾スキン').selectOption('goddess')
  await expectPosition(skinOffsets.goddess!)
  await yInput.fill('-40')
  await yInput.fill('')
  await expectPosition(skinOffsets.goddess!)
})

test('title grows and shrinks the window width within its maximum', async ({ page }) => {
  const window = page.locator('.norden-info-window')
  await page.getByRole('tab', { name: '統計', exact: true }).click()
  await page.getByLabel('ウィンドウのタイトル').fill('都市')
  const short = await settledSize(window)
  await page.getByLabel('ウィンドウのタイトル').fill('カルタ書院 フルーエン西岸の港湾都市')
  await expect.poll(async () => (await window.boundingBox())!.width).toBeGreaterThan(short.width + 60)
  const long = await settledSize(window)
  expect(long.width).toBeLessThanOrEqual(720)
  await page.getByLabel('ウィンドウのタイトル').fill('都市')
  await expect.poll(async () => (await window.boundingBox())!.width).toBeLessThan(long.width - 60)
})

test('hiding the title bar excludes its text from auto sizing and preserves tabs', async ({ page }) => {
  const window = page.locator('.norden-info-window')
  await page.getByRole('tab', { name: '統計', exact: true }).click()
  await page.getByLabel('ウィンドウのタイトル').fill('とても長いタイトル'.repeat(8))
  const visible = await settledSize(window)
  await page.getByLabel('タイトルバーを表示する').uncheck()
  await expect(window.locator('.norden-info-window-title')).toHaveCount(0)
  await expect(window).toHaveAccessibleName('とても長いタイトル'.repeat(8))
  const hidden = await settledSize(window)
  expect(hidden.width).toBeLessThan(visible.width)
  await page.getByLabel('ウィンドウのタイトル').fill('都市')
  expect((await settledSize(window)).width).toBe(hidden.width)
  await page.getByRole('tab', { name: '騎士', exact: true }).click()
  await expect(page.getByRole('tabpanel', { name: '騎士' })).toBeVisible()
  await page.getByLabel('タイトルバーを表示する').check()
  await expect(window.locator('.norden-info-window-title-text')).toHaveText('都市')
})

test('a single title image preserves transparent cutouts and fixed cap widths', async ({ page }, testInfo) => {
  const title = page.locator('.norden-info-window-title')
  await settledSize(page.locator('.norden-info-window'))
  const rendering = await title.evaluate(async element => {
    const decoration = getComputedStyle(element, '::before')
    const image = new Image()
    image.src = decoration.borderImageSource.slice(5, -2)
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, image.width, image.height).data
    const alphaAt = (x: number, y: number) => pixels[(y * image.width + x) * 4 + 3]!
    return {
      cornerAlpha: alphaAt(0, 0),
      centerAlpha: alphaAt(Math.floor(image.width / 2), Math.floor(image.height / 2)),
      translucentEdge: pixels.some((value, index) => index % 4 === 3 && value > 1 && value < 255),
      slice: decoration.borderImageSlice,
      capWidth: decoration.borderLeftWidth,
      background: getComputedStyle(element).backgroundColor,
      textBackground: getComputedStyle(element.querySelector('.norden-info-window-title-text')!).backgroundImage,
    }
  })
  expect(rendering.cornerAlpha).toBe(0)
  // The generated plaque has slight sub-visual alpha variation in its dark texture.
  expect(rendering.centerAlpha).toBeGreaterThanOrEqual(250)
  expect(rendering.translucentEdge).toBe(true)
  expect(rendering.slice).toBe('0 8% fill')
  expect(rendering.capWidth).toBe('34px')
  expect(rendering.background).toBe('rgba(0, 0, 0, 0)')
  expect(rendering.textBackground).toBe('none')
  await page.getByLabel('ウィンドウのタイトル').fill('とても長いタイトル'.repeat(8))
  await settledSize(page.locator('.norden-info-window'))
  expect(await title.evaluate(element => getComputedStyle(element, '::before').borderLeftWidth)).toBe(rendering.capWidth)
  expect(await title.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
  await page.getByLabel('固定サイズ（420 × 520）').check()
  await settledSize(page.locator('.norden-info-window'))
  for (const backdrop of ['light', 'dark', 'checker']) {
    await page.getByLabel('透過確認の背景').selectOption(backdrop)
    await expect(title).toBeVisible()
    const path = testInfo.outputPath(`title-${backdrop}.png`)
    await title.screenshot({ path })
    await testInfo.attach(`title-${backdrop}`, { path, contentType: 'image/png' })
  }
})

test('body text expands width and wraps without horizontal overflow at the limit', async ({ page }) => {
  const window = page.locator('.norden-info-window')
  await page.getByLabel('ウィンドウのタイトル').fill('都市')
  await page.getByLabel('本文の長さ').selectOption('short')
  const short = await settledSize(window)
  await page.getByLabel('本文の長さ').selectOption('long')
  await expect.poll(async () => (await window.boundingBox())!.width).toBeGreaterThan(short.width + 80)
  const long = await settledSize(window)
  expect(long.width).toBeLessThanOrEqual(720)
  const viewport = page.locator('.norden-info-window-content')
  expect(await viewport.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
})

test('tabs adjust dimensions and play the panel entrance animation', async ({ page }) => {
  const window = page.locator('.norden-info-window')
  await page.getByLabel('ウィンドウのタイトル').fill('都市')
  const city = await settledSize(window)
  await page.getByRole('tab', { name: '統計', exact: true }).click()
  await expect(page.getByRole('tabpanel', { name: '統計' })).toBeVisible()
  const stats = await settledSize(window)
  expect(stats.width).toBeLessThan(city.width)
  expect(stats.height).toBeLessThan(city.height)
  expect(await page.getByRole('tabpanel').evaluate(element => getComputedStyle(element).animationName)).toBe('norden-panel-enter')
  expect(await window.evaluate(element => getComputedStyle(element).transitionProperty)).toContain('width')
})

test('dragging moves the window and releases capture', async ({ page }) => {
  const window = page.locator('.norden-info-window')
  const before = await settledSize(window)
  const title = (await page.locator('.norden-info-window-title').boundingBox())!
  await page.mouse.move(title.x + 70, title.y + 20)
  await page.mouse.down()
  await page.mouse.move(title.x + 150, title.y + 70, { steps: 8 })
  await page.mouse.up()
  const after = (await window.boundingBox())!
  expect(after.x - before.x).toBeCloseTo(80, 0)
  expect(after.y - before.y).toBeCloseTo(50, 0)
  await expect(window).not.toHaveClass(/is-dragging/)
})

test('fixed dimensions stay constant when contents change and overflow can scroll', async ({ page }) => {
  const window = page.locator('.norden-info-window')
  await page.getByLabel('固定サイズ（420 × 520）').check()
  const before = await settledSize(window)
  expect(before.width).toBe(420)
  expect(before.height).toBe(520)
  await page.getByLabel('本文の長さ').selectOption('long')
  await page.getByRole('tab', { name: '歴史', exact: true }).click()
  const after = await settledSize(window)
  expect(after.width).toBe(before.width)
  expect(after.height).toBe(before.height)
  expect(await page.locator('.norden-info-window-content').evaluate(element => getComputedStyle(element).overflowY)).toBe('auto')
})

test('manual resize supports keyboard and pointer input', async ({ page }) => {
  const window = page.locator('.norden-info-window')
  await page.getByLabel('手動リサイズを有効にする').check()
  const before = await settledSize(window)
  const handle = page.getByRole('button', { name: 'ウィンドウのサイズ変更' })
  await handle.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  const keyboard = await settledSize(window)
  expect(keyboard.width).toBeCloseTo(before.width + 10, 0)
  expect(keyboard.height).toBeCloseTo(before.height + 10, 0)
  const bounds = (await handle.boundingBox())!
  await page.mouse.move(bounds.x + 10, bounds.y + 10)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 40, bounds.y + 40, { steps: 5 })
  await page.mouse.up()
  const pointer = await settledSize(window)
  expect(pointer.width).toBeCloseTo(keyboard.width + 30, 0)
  expect(pointer.height).toBeCloseTo(keyboard.height + 30, 0)
})

test('handles empty tabs and restores an accessible selection', async ({ page }) => {
  await page.getByRole('tab', { name: '歴史', exact: true }).click()
  await page.getByLabel('タブ数').selectOption('0')
  await expect(page.getByRole('tablist')).toHaveCount(0)
  await expect(page.getByText('表示する情報がありません。')).toBeVisible()
  await page.getByLabel('タブ数').selectOption('1')
  await expect(page.getByRole('tab', { name: '都市情報' })).toHaveAttribute('aria-selected', 'true')
})

test('respects reduced motion and narrow viewport limits', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 600, height: 900 })
  await page.getByLabel('ウィンドウのタイトル').fill('とても長いタイトル'.repeat(12))
  const window = page.locator('.norden-info-window')
  const bounds = await settledSize(window)
  expect(bounds.width).toBeLessThanOrEqual(568)
  expect(await window.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s')
  expect(await page.getByRole('tabpanel').evaluate(element => getComputedStyle(element).animationName)).toBe('none')
})

for (const [skin, cornerWidth] of [['thin', '32px'], ['medium', '64px'], ['goddess', '112px']] as const) {
  test(`${skin} preserves alpha and uses nine-slice without a center fill`, async ({ page }) => {
    await page.getByLabel('装飾スキン').selectOption(skin)
    const window = page.locator('.norden-info-window')
    await expect(window).toHaveAttribute('data-skin', skin)
    await settledSize(window)
    const frame = window.locator('.norden-info-window-frame')
    expect(await frame.evaluate(element => getComputedStyle(element).borderImageSlice)).not.toContain('fill')
    const alpha = await frame.evaluate(async element => {
      const source = getComputedStyle(element).borderImageSource
      const url = source.slice(5, -2)
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, image.width, image.height).data
      let centerMax = 0
      let transparent = 0
      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          const opacity = pixels[(y * image.width + x) * 4 + 3]!
          if (opacity === 0) transparent++
          if (x > image.width * .4 && x < image.width * .6 && y > image.height * .4 && y < image.height * .6) centerMax = Math.max(centerMax, opacity)
        }
      }
      return { centerMax, transparent: transparent / (image.width * image.height), corner: pixels[3] }
    })
    // Alpha=1 is sub-visual generation noise, never a painted opaque matte.
    expect(alpha.centerMax).toBeLessThanOrEqual(1)
    expect(alpha.transparent).toBeGreaterThan(.5)
    expect(alpha.corner).toBe(0)
    await page.getByLabel('羊皮紙を表示する').uncheck()
    await expect(window.locator('.norden-info-window-paper')).toHaveCSS('background-image', 'none')
    await page.getByLabel('透過確認の背景').selectOption('checker')
    await expect(page.locator('.demo-stage')).toHaveClass(/backdrop-checker/)
    const before = await settledSize(window)
    await page.getByLabel('ウィンドウのタイトル').fill('とても長いタイトル'.repeat(6))
    const after = await settledSize(window)
    expect(after.width).toBeGreaterThanOrEqual(before.width)
    // Corner destination size stays constant when the window changes size.
    await expect(frame).toHaveCSS('border-top-width', cornerWidth)
    await page.getByRole('tab', { name: '騎士', exact: true }).click()
    await expect(page.getByRole('tabpanel')).toHaveAccessibleName('騎士')
  })
}
