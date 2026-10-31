import type { HTMLAttributes, Ref } from 'react'
import './ImageFrame.css'

export interface ImageFrameProps extends HTMLAttributes<HTMLElement> {
  ref?: Ref<HTMLElement>
}

/**
 * An image-sized brass frame, with fixed corner ornaments and stretchable rails.
 * Accepts an img or a picture component (e.g. BuildingImage) as children.
 * Set --norden-image-max-height to limit images without cropping or enlarging them.
 */
export default function ImageFrame({ className = '', children, ref, ...props }: ImageFrameProps) {
  return (
    <figure ref={ref} className={`norden-image-frame ${className}`} {...props}>
      <span className="norden-image-frame-border" aria-hidden="true" />
      <div className="norden-image-frame-content">{children}</div>
    </figure>
  )
}
