import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import InfoWindow from './InfoWindow'
import { windowSkins } from '../skins'
import type { InfoWindowSkin } from '../skins'

describe('InfoWindow decoration skins', () => {
  it('uses the medium full-frame PNG by default', () => {
    render(<InfoWindow title="都市">本文</InfoWindow>)
    const window = screen.getByRole('region', { name: '都市' })
    expect(window).toHaveAttribute('data-skin', 'medium')
    expect(window.querySelectorAll('.norden-info-window-frame')).toHaveLength(1)
    expect(window.querySelector('.norden-info-window-frame')).toBeEmptyDOMElement()
    expect(window.style.getPropertyValue('--norden-frame')).toContain('medium-frame.png')
  })

  it('replaces individual images while inheriting unspecified assets', () => {
    const skin: InfoWindowSkin = { name: 'custom', images: { titleBar: '/custom/title.png', paper: '' } }
    render(<InfoWindow title="都市" skin={skin}>本文</InfoWindow>)
    const window = screen.getByRole('region', { name: '都市' })
    expect(window.style.getPropertyValue('--norden-title-bar')).toBe('url("/custom/title.png")')
    expect(window.style.getPropertyValue('--norden-paper')).toBe('none')
    expect(window.style.getPropertyValue('--norden-frame')).toContain('medium-frame.png')
  })

  it('switches skins without remounting the frame or content', () => {
    const { rerender } = render(<InfoWindow title="都市" skin={windowSkins.thin}><input aria-label="メモ" defaultValue="保持する内容" /></InfoWindow>)
    const input = screen.getByRole('textbox')
    const frame = screen.getByRole('region').querySelector('.norden-info-window-frame')
    expect(frame).toBeInTheDocument()
    rerender(<InfoWindow title="都市" skin={windowSkins.goddess}><input aria-label="メモ" defaultValue="保持する内容" /></InfoWindow>)
    expect(screen.getByRole('region')).toHaveAttribute('data-skin', 'goddess')
    expect(screen.getByRole('textbox')).toBe(input)
    rerender(<InfoWindow title="都市"><input aria-label="メモ" defaultValue="保持する内容" /></InfoWindow>)
    expect(screen.getByRole('region')).toHaveAttribute('data-skin', 'medium')
    expect(screen.getByRole('region').querySelector('.norden-info-window-frame')).toBe(frame)
  })

  it('keeps classic as an alias of medium', () => {
    expect(windowSkins.classic).toBe(windowSkins.medium)
    render(<InfoWindow title="都市" skin={windowSkins.classic}>本文</InfoWindow>)
    expect(screen.getByRole('region')).toHaveAttribute('data-skin', 'medium')
  })
})
