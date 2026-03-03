import React, { useEffect, useState } from 'react'
import MagBackground from '../../assets/map/map_background.webp'
import './Bg.css'

interface BgProps {
  children?: React.ReactNode
}

export default function Bg({ children }: BgProps) {
  const computeScale = () => window.innerWidth / 7170 * 1.25
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

    </div>
  )
}

