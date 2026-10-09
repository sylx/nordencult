import type { ButtonHTMLAttributes } from 'react'
import './parts.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** normal: on parchment, primary: the main action, quiet: on dark HUD panels */
  variant?: 'normal' | 'primary' | 'quiet'
  size?: 'normal' | 'small'
}

export default function Button({ variant = 'normal', size = 'normal', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`norden-button is-${variant} ${size === 'small' ? 'is-small' : ''} ${className}`} {...props} />
}
