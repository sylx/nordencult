import './InfoWindow.css'

export interface InfoWindowProps {
  title: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  resizeable?: boolean
  width?: number
  height?: number | 'auto',
  x?: number
  y?: number
}

export default function InfoWindow({
  title,
  children,
  className,
  style,
  resizeable = false,
  width = 300,
  height = 'auto',
  x = 0,
  y = 0,
}: InfoWindowProps) {

  return (
    <div
      className={`info-window ${resizeable ? 'resizeable' : ''} ${className || ''}`}
      style={{ width, height,left: x, top: y+50, ...style }}
    >
      <div className="info-window-bg-container">
        <div className="info-window-corner --left-top" />
        <div className="info-window-top"></div>
        <div className="info-window-corner --right-top" />
        <div className="info-window-left" />
        <div className="info-window-center"></div>
        <div className="info-window-right" />
        <div className="info-window-corner --left-bottom" />
        <div className="info-window-bottom" />
        <div className="info-window-corner --right-bottom" />
      </div>
      <div className="info-window-title">
        <span className="info-window-title-corner" />
        <span className="info-window-title-text">{title}</span>
        <span className="info-window-title-corner" />
      </div>
      <div className="info-window-content">
        {children}
      </div>
    </div>
  )
}
