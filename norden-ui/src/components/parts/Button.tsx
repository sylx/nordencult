import type { ButtonHTMLAttributes } from 'react'
import './parts.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** normal: on parchment, primary: the main action, quiet: on dark HUD panels */
  variant?: 'normal' | 'primary' | 'quiet'
  /** Corner inlays on the ivory surface. Defaults to gold for primary, silver otherwise. */
  metal?: 'gold' | 'silver'
  size?: 'normal' | 'small'
}

export default function Button({ variant = 'normal', metal = variant === 'primary' ? 'gold' : 'silver', size = 'normal', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`norden-button is-${variant} is-${metal} ${size === 'small' ? 'is-small' : ''} ${className}`} {...props} />
}
