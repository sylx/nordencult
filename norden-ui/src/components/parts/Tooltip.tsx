import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from 'react'
import { createPortal } from 'react-dom'
import './Tooltip.css'

type AnchorProps = HTMLAttributes<Element> & { ref?: Ref<Element> }

export interface TooltipProps {
  /** What it says; with nothing to say (undefined, '') the child is left alone. Line breaks in a string are kept */
  content?: ReactNode
  /** The element it is about, which takes the hover and the focus itself (no element is added around it): a disabled button will do */
  children: ReactElement<AnchorProps>
  /** Kept open, hovered or not (e.g. pinned by a click). Given, even false, a press no longer closes the tooltip */
  open?: boolean
  /** ms between the pointer arriving and the tooltip opening */
  delay?: number
  id?: string
  className?: string
}

/** Clear of the element, and of the edges of the screen */
const GAP = 4
const EDGE = 8

/**
 * A tooltip for one element, in place of the browser's `title`: below the element (above it when there is no room),
 * on hover or keyboard focus. It is drawn on the body, so a window's overflow does not cut it off
 */
export default function Tooltip({ content, children, open, delay = 300, id, className = '' }: TooltipProps) {
  const autoId = useId()
  const tipId = id ?? autoId
  const [active, setActive] = useState(false)
  const anchorRef = useRef<Element | null>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const shown = Boolean(content) && (open || active)
  useEffect(() => () => clearTimeout(timer.current), [])

  useLayoutEffect(() => {
    if (!shown) return
    const place = () => {
      const tip = tipRef.current
      const anchor = anchorRef.current?.getBoundingClientRect()
      if (!tip || !anchor) return
      const { width, height } = tip.getBoundingClientRect()
      const above = anchor.top - GAP - height
      const fitsBelow = anchor.bottom + GAP + height <= window.innerHeight - EDGE
      tip.style.top = `${fitsBelow || above < EDGE ? anchor.bottom + GAP : above}px`
      tip.style.left = `${Math.max(EDGE, Math.min(anchor.left + (anchor.width - width) / 2, window.innerWidth - EDGE - width))}px`
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [shown, content])

  const show = () => {
    clearTimeout(timer.current)
    if (delay > 0) timer.current = window.setTimeout(() => setActive(true), delay)
    else setActive(true)
  }
  const hide = () => {
    clearTimeout(timer.current)
    setActive(false)
  }

  const anchorProps = children.props
  const setAnchor = (element: Element | null) => {
    anchorRef.current = element
    const { ref } = anchorProps
    if (typeof ref === 'function') ref(element)
    else if (ref) ref.current = element
  }
  // Only a sentence adds to the element's name, and the tooltip is not in the page until it opens
  const description = typeof content === 'string' && content !== anchorProps['aria-label'] ? content : undefined

  return (
    <>
      {cloneElement(children, {
        ref: setAnchor,
        'aria-describedby': shown ? tipId : anchorProps['aria-describedby'],
        'aria-description': description ?? anchorProps['aria-description'],
        onPointerEnter: event => {
          anchorProps.onPointerEnter?.(event)
          if (event.pointerType !== 'touch') show()
        },
        onPointerLeave: event => {
          anchorProps.onPointerLeave?.(event)
          hide()
        },
        onPointerDown: event => {
          anchorProps.onPointerDown?.(event)
          if (open === undefined) hide()
        },
        onFocus: event => {
          anchorProps.onFocus?.(event)
          if (event.target.matches(':focus-visible')) show()
        },
        onBlur: event => {
          anchorProps.onBlur?.(event)
          hide()
        },
      })}
      {shown && createPortal(
        <div ref={tipRef} id={tipId} role="tooltip" className={`norden-tooltip ${className}`}>{content}</div>,
        document.body,
      )}
    </>
  )
}
