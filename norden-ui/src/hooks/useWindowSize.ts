import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

export interface WindowSize { width: number; height: number }

interface Options {
  contentRef: RefObject<HTMLDivElement | null>
  titleRef: RefObject<HTMLSpanElement | null>
  width: number | 'auto'
  height: number | 'auto'
  minWidth: number
  maxWidth: number
  minHeight: number
  horizontalPadding: number
  verticalPadding: number
  titlePadding: number
  minimumSize: number
}

/** Measure intrinsic content, independently of the animated outer frame. */
export function useWindowSize({ contentRef, titleRef, width, height, minWidth, maxWidth, minHeight, horizontalPadding, verticalPadding, titlePadding, minimumSize }: Options) {
  const [size, setSize] = useState<WindowSize>({
    width: width === 'auto' ? minWidth : width,
    height: height === 'auto' ? minHeight : height,
  })
  const [widthLimit, setWidthLimit] = useState(maxWidth)

  useLayoutEffect(() => {
    const content = contentRef.current
    const title = titleRef.current
    if (!content || !title) return
    let disposed = false

    const measure = () => {
      if (disposed) return
      const limit = Math.max(minimumSize, Math.min(maxWidth, document.documentElement.clientWidth - 32 || maxWidth))
      setWidthLimit(limit)
      // Text and decorations are measured separately so title length contributes to auto width.
      const next = {
        width: Math.max(minimumSize, Math.min(limit, width === 'auto'
          ? Math.max(minWidth, content.getBoundingClientRect().width + horizontalPadding, title.getBoundingClientRect().width + titlePadding)
          : width)),
        height: Math.max(minimumSize, minHeight, height === 'auto' ? content.getBoundingClientRect().height + verticalPadding : height),
      }
      setSize(previous => previous.width === next.width && previous.height === next.height ? previous : next)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    observer.observe(title)
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    return () => {
      disposed = true
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [contentRef, titleRef, width, height, minWidth, maxWidth, minHeight, horizontalPadding, verticalPadding, titlePadding, minimumSize])

  return { size, widthLimit }
}
