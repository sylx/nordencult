import { resolveWindowSkin, windowSkins, windowSkinStyle } from '../../skins'

/** The same thin, nine-slice decoration as InfoWindow, scaled for a HUD strip. */
export default function ThinFrame() {
  return <span className="norden-thin-frame" aria-hidden="true" style={windowSkinStyle(resolveWindowSkin(windowSkins.thin))}>
    <span className="norden-thin-frame-surface" />
    <span className="norden-thin-frame-border" />
  </span>
}
