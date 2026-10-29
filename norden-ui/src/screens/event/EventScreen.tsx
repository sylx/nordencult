import { useEffect, type ReactNode } from 'react'
import Button from '../../components/parts/Button'
import ThinFrameWithTitle from '../../components/parts/ThinFrameWithTitle'
import '../screens.css'
import './EventScreen.css'

/** A line of the event's details, e.g. 最後の拠点: フルーエン */
export interface EventDetail {
  label: ReactNode
  value: ReactNode
}

export interface EventScreenProps {
  /** The cut (the event's picture) shown above the message window, e.g. CUT_IMAGES.faction_destruction */
  image?: string
  /** A picture of the host in place of the cut (e.g. a technology's picture cut from its sheet); omitted: `image` */
  picture?: ReactNode
  /** Shown on the plaque of the message window, e.g. 勢力滅亡 */
  title: ReactNode
  /** What happened, e.g. カルタ書院は滅亡しました */
  message: ReactNode
  /** The details below the message, a line each */
  details?: readonly EventDetail[]
  /** More of the host below the details, e.g. the knights it concerns */
  children?: ReactNode
  /** The button closing the notice (Enter and Esc too) */
  onClose: () => void
  closeLabel?: string
}

/**
 * A notice of an event over the whole host: the cut (the event's picture) and below it a message window with what
 * happened and its details. It takes the pointer and the keys until it is closed (Esc does not reach the screen under it)
 */
export default function EventScreen({ image, picture, title, message, details = [], children, onClose, closeLabel = '閉じる' }: EventScreenProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Enter') return
      event.preventDefault()
      event.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  return (
    <div className="norden-event" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'イベント'}>
      <div className="norden-event-body">
        {(picture || image) && (
          <figure className={`norden-event-cut ${picture ? 'is-picture' : ''}`}>
            {picture ?? <img src={image} alt="" />}
          </figure>
        )}
        <ThinFrameWithTitle as="div" title={title} className="norden-event-window">
          <p className="norden-event-message">{message}</p>
          {details.length > 0 && (
            <dl className="norden-event-details">
              {details.map((detail, index) => (
                <div key={index} className="norden-event-detail">
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {children}
          <div className="norden-event-actions">
            <Button variant="primary" onClick={onClose}>{closeLabel}</Button>
          </div>
        </ThinFrameWithTitle>
      </div>
    </div>
  )
}
