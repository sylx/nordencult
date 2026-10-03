import type { CSSProperties } from 'react'
import paper from './assets/ui/ui_paper_texture.webp'
import titleCorner from './assets/ui/info_window_title_corner.png'
import titleBar from './assets/ui/info_window_titlebar.png'
import tabActive from './assets/ui/tab_active.png'
import tabInactive from './assets/ui/tab_inactive.png'
import thinFrame from './assets/ui/skins/thin-frame.png'
import mediumFrame from './assets/ui/skins/medium-frame.png'
import goddessFrame from './assets/ui/skins/goddess-frame-v2.png'

export interface WindowSkinImages {
  paper: string
  titleCorner: string
  titleBar: string
  tabActive: string
  tabInactive: string
}

export interface WindowSkinLayout {
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  /** Inset the paper so it does not fill the frame's transparent outer cutouts. */
  paperInset: number | { top: number; right: number; bottom: number; left: number }
  paperRadius: number
  titleCapWidth: number
  titleHeight: number
  titleOffset: number
  tabLeft: number
  tabTop: number
}

export interface InfoWindowSkin {
  name: string
  /** Override the paper, title and tab images. Omitted images inherit shared defaults. */
  images?: Partial<WindowSkinImages>
  /** Full transparent frame, rendered using nine-slice scaling. Defaults to medium. */
  frame?: {
    image: string
    slice: NonNullable<CSSProperties['borderImageSlice']>
    width: number
    repeat?: 'stretch' | 'repeat' | 'round'
  }
  layout?: Partial<WindowSkinLayout>
}

const sharedImages: WindowSkinImages = { paper, titleCorner, titleBar, tabActive, tabInactive }
const defaultLayout: WindowSkinLayout = {
  paddingTop: 48, paddingRight: 32, paddingBottom: 24, paddingLeft: 32,
  paperInset: 26, paperRadius: 36,
  titleCapWidth: 34, titleHeight: 51, titleOffset: -18, tabLeft: -48, tabTop: 84,
}

const mediumSkin = {
  name: 'medium',
  frame: { image: mediumFrame, slice: '25%', width: 64 },
} satisfies InfoWindowSkin

export const windowSkins = {
  medium: mediumSkin,
  /** @deprecated Use medium. The old classic preset now uses the same full-frame PNG. */
  classic: mediumSkin,
  thin: {
    name: 'thin',
    frame: { image: thinFrame, slice: '12.5%', width: 32 },
    layout: { paperInset: 10, paperRadius: 22, paddingLeft: 24, paddingRight: 24 },
  },
  goddess: {
    name: 'goddess',
    frame: { image: goddessFrame, slice: '36%', width: 112 },
    layout: { paperInset: { top: 32, right: 24, bottom: 30, left: 24 },
     paperRadius: 20, paddingTop: 96, paddingLeft: 112, paddingRight: 112, paddingBottom: 72,
      tabTop: 120 },
  },
} satisfies Record<string, InfoWindowSkin>

export function resolveWindowSkin(skin: InfoWindowSkin = windowSkins.medium) {
  const frame: NonNullable<InfoWindowSkin['frame']> = skin.frame ?? mediumSkin.frame
  return {
    ...skin,
    frame,
    images: { ...sharedImages, ...skin.images },
    layout: { ...defaultLayout, ...skin.layout },
  }
}

export function windowSkinStyle(skin: ReturnType<typeof resolveWindowSkin>): CSSProperties {
  const url = (image: string) => image ? `url(${JSON.stringify(image)})` : 'none'
  const inset = skin.layout.paperInset
  const paperInset = typeof inset === 'number' ? `${inset}px` : `${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px`
  return {
    '--norden-paper': url(skin.images.paper),
    '--norden-title-corner': url(skin.images.titleCorner),
    '--norden-title-bar': url(skin.images.titleBar),
    '--norden-tab-active': url(skin.images.tabActive),
    '--norden-tab-inactive': url(skin.images.tabInactive),
    '--norden-frame': url(skin.frame.image),
    '--norden-frame-slice': skin.frame.slice,
    '--norden-frame-width': `${skin.frame.width}px`,
    '--norden-frame-repeat': skin.frame.repeat ?? 'stretch',
    '--norden-padding-top': `${skin.layout.paddingTop}px`,
    '--norden-padding-right': `${skin.layout.paddingRight}px`,
    '--norden-padding-bottom': `${skin.layout.paddingBottom}px`,
    '--norden-padding-left': `${skin.layout.paddingLeft}px`,
    '--norden-paper-inset': paperInset,
    '--norden-paper-radius': `${skin.layout.paperRadius}px`,
    '--norden-title-cap-width': `${skin.layout.titleCapWidth}px`,
    '--norden-title-height': `${skin.layout.titleHeight}px`,
    '--norden-title-offset': `${skin.layout.titleOffset}px`,
    '--norden-tab-left': `${skin.layout.tabLeft}px`,
    '--norden-tab-top': `${skin.layout.tabTop}px`,
  } as CSSProperties
}
