import type { ImgHTMLAttributes } from 'react'
import iconSettings from '../../assets/ui/icons/icon-settings.webp'

/** The gear of the settings (DateBar's, a Button's `icon`…); decorative, so name the control it is on */
export default function SettingsIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <img src={iconSettings} alt="" aria-hidden="true" {...props} />
}
