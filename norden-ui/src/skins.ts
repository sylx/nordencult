import type { CSSProperties } from 'react'
import paper from './assets/ui/ui_paper_texture.webp'
import corner from './assets/ui/info_window_corner.png'
import horizontalEdge from './assets/ui/info_window_bar.png'
import verticalEdge from './assets/ui/info_window_sidebar.png'
import titleCorner from './assets/ui/info_window_title_corner.png'
import titleBar from './assets/ui/info_window_titlebar.png'
import tabActive from './assets/ui/tab_active.png'
import tabInactive from './assets/ui/tab_inactive.png'
import thinFrame from './assets/ui/skins/thin-frame.png'
import goddessFrame from './assets/ui/skins/goddess-frame-v2.png'

export interface WindowSkinImages {
  paper: string
  corner: string
  horizontalEdge: string
  verticalEdge: string
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
  cornerSize: number
  edgeSize: number
  titleCapWidth: number
  titleHeight: number
  titleOffset: number
  tabLeft: number
  tabTop: number
}

export interface InfoWindowSkin {
  name: string
  /** Override individual images. Omitted images inherit the classic skin. */
  images?: Partial<WindowSkinImages>
  /** Optional full transparent frame, rendered using nine-slice scaling. */
  frame?: {
    image: string
    slice: NonNullable<CSSProperties['borderImageSlice']>
    width: number
    repeat?: 'stretch' | 'repeat' | 'round'
  }
  layout?: Partial<WindowSkinLayout>
}

const classicImages: WindowSkinImages = { paper, corner, horizontalEdge, verticalEdge, titleCorner, titleBar, tabActive, tabInactive }
const classicLayout: WindowSkinLayout = {
  paddingTop: 48, paddingRight: 32, paddingBottom: 24, paddingLeft: 32,
  paperInset: 0, paperRadius: 0, cornerSize: 94, edgeSize: 18,
  titleCapWidth: 34, titleHeight: 51, titleOffset: -18, tabLeft: -48, tabTop: 84,
}

export const windowSkins = {
  classic: { name: 'classic' },
  thin: {
    name: 'thin',
    frame: { image: thinFrame, slice: '12.5%', width: 32 },
    layout: { paperInset: 10, paperRadius: 22, paddingLeft: 24, paddingRight: 24 },
  },
  goddess: {
    name: 'goddess',
    frame: { image: goddessFrame, slice: '36%', width: 112 },
    layout: { paperInset: { top: 32, right: 24, bottom: 30, left: 24 }, paperRadius: 20, paddingTop: 96, paddingLeft: 112, paddingRight: 112, paddingBottom: 72, tabTop: 120 },
  },
} satisfies Record<string, InfoWindowSkin>

export function resolveWindowSkin(skin: InfoWindowSkin = windowSkins.classic) {
  return { ...skin, images: { ...classicImages, ...skin.images }, layout: { ...classicLayout, ...skin.layout } }
}

export function windowSkinStyle(skin: ReturnType<typeof resolveWindowSkin>): CSSProperties {
  const url = (image: string) => image ? `url(${JSON.stringify(image)})` : 'none'
  const inset = skin.layout.paperInset
  const paperInset = typeof inset === 'number' ? `${inset}px` : `${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px`
  return {
    '--norden-paper': url(skin.images.paper),
    '--norden-corner': url(skin.images.corner),
    '--norden-horizontal-edge': url(skin.images.horizontalEdge),
    '--norden-vertical-edge': url(skin.images.verticalEdge),
    '--norden-title-corner': url(skin.images.titleCorner),
    '--norden-title-bar': url(skin.images.titleBar),
    '--norden-tab-active': url(skin.images.tabActive),
    '--norden-tab-inactive': url(skin.images.tabInactive),
    '--norden-frame': skin.frame ? url(skin.frame.image) : 'none',
    '--norden-frame-slice': skin.frame?.slice ?? 0,
    '--norden-frame-width': `${skin.frame?.width ?? 0}px`,
    '--norden-frame-repeat': skin.frame?.repeat ?? 'stretch',
    '--norden-padding-top': `${skin.layout.paddingTop}px`,
    '--norden-padding-right': `${skin.layout.paddingRight}px`,
    '--norden-padding-bottom': `${skin.layout.paddingBottom}px`,
    '--norden-padding-left': `${skin.layout.paddingLeft}px`,
    '--norden-paper-inset': paperInset,
    '--norden-paper-radius': `${skin.layout.paperRadius}px`,
    '--norden-corner-size': `${skin.layout.cornerSize}px`,
    '--norden-edge-size': `${skin.layout.edgeSize}px`,
    '--norden-title-cap-width': `${skin.layout.titleCapWidth}px`,
    '--norden-title-height': `${skin.layout.titleHeight}px`,
    '--norden-title-offset': `${skin.layout.titleOffset}px`,
    '--norden-tab-left': `${skin.layout.tabLeft}px`,
    '--norden-tab-top': `${skin.layout.tabTop}px`,
  } as CSSProperties
}
