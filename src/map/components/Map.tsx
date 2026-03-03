import React, { useEffect, useState } from 'react'
import MagBackground from '../../assets/map/map_background.webp'
import MapStrategy from '../../assets/map/map_strategy.webp'
import './Map.css'

interface MapProps {
  children?: React.ReactNode
}

export default function Map({ children }: MapProps) {
  const computeScale = () => Math.max(800,window.innerWidth) / 7170 * 1.25
  const [scale, setScale] = useState<number>(() => computeScale())

  useEffect(() => {
    let raf = 0
    const handleResize = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setScale(computeScale())
      })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="background">
      <img
        src={MagBackground}
        alt="Map Background"
        className="background-image"
        style={{ transform: `scale(${scale})` }}
      />
      <img
        src={MapStrategy}
        alt="Map Strategy"
        className="strategy-image"
        style={{ transform: `scale(0.2)` }}
      />
    </div>
  )
}

