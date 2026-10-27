import { describe, expect, it } from 'vitest'
import { seName } from './se'

describe('seName', () => {
  it('is the file name without the extension', () => {
    expect(seName('../assets/se/click.ogg')).toBe('click')
    expect(seName('../assets/se/ui.confirm.mp3')).toBe('ui.confirm')
  })
})
