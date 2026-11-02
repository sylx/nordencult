import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './parts.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** normal: on parchment, primary: the main action, quiet: on dark HUD panels */
  variant?: 'normal' | 'primary' | 'quiet'
  /** Corner inlays on the ivory surface; none uses plain ivory. Defaults to gold for primary, silver otherwise. */
  metal?: 'gold' | 'silver' | 'none'
  size?: 'normal' | 'small'
  /** Shown before the label (an image or an svg); decorative, so the label must say what the button does */
  icon?: ReactNode
}

export default function Button({ variant = 'normal', metal = variant === 'primary' ? 'gold' : 'silver', size = 'normal', icon, className = '', type = 'button', children, ...props }: ButtonProps) {
  return (
    <button type={type} className={`norden-button is-${variant} is-${metal} ${size === 'small' ? 'is-small' : ''} ${icon ? 'has-icon' : ''} ${className}`} {...props}>
      {icon && <span className="norden-button-icon" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  )
}
