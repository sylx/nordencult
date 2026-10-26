import { VolumeSlider } from 'norden-ui'
import { setVolume, useVolumes } from '../audio/volume'

/** The BGM and sound-effect volumes, for the settings (on dark panels) */
export function SoundSettings() {
  const { bgm, se } = useVolumes()
  return (
    <>
      <VolumeSlider label="BGM" value={bgm} onChange={(v) => setVolume('bgm', v)} />
      <VolumeSlider label="効果音" value={se} onChange={(v) => setVolume('se', v)} />
    </>
  )
}
