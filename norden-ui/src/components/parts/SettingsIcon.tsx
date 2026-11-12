import type { SVGProps } from 'react'

/** The gear of the settings (DateBar's, a Button's `icon`…). Drawn in the text color; decorative, so name the control it is on */
export default function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false" {...props}>
      <path d="m9 3 1-2h4l1 2 2 1 2-.2 2 3.4-1.2 1.8v3l1.2 1.8-2 3.4-2-.2-2 1-1 2h-4l-1-2-2-1-2 .2-2-3.4L4.2 12V9L3 7.2l2-3.4 2 .2Z" transform="translate(0 1)" />
      <circle cx="12" cy="11.5" r="3.5" />
    </svg>
  )
}
