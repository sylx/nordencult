import { useContext, useEffect, useState } from 'react'
import { DialoguePlayer, DialogueView } from 'norden-dialogue'
import { AlertDialog } from 'norden-ui'
import { currentBgm, playBgm } from '../audio/bgm'
import { DIALOGUE_PROVIDERS, runDialogue } from '../dialogue'
import { GameContext } from '../game'
import { GameRuleError } from '../game/errors'
import { setDialogueStarter } from './playDialogue'
import './DialogueLayer.css'

/**
 * The dialogue scenes over every scene (playDialogue). A scene works on a copy of the game state, which goes into
 * the game when it ends; one stopped by the rules (GameRuleError) changes nothing and says why. While it is on it
 * covers the screen and takes every click and key; after it the song before it plays again
 */
export function DialogueLayer() {
  const store = useContext(GameContext)
  const [player] = useState(() => new DialoguePlayer(DIALOGUE_PROVIDERS))
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!store) return
    let running = false
    setDialogueStarter(async (id, input) => {
      if (running) throw new Error('ほかの会話の途中です')
      running = true
      const song = currentBgm()
      try {
        const state = await runDialogue(id, input, { state: store.getState(), player })
        store.update(() => state)
        return true
      } catch (error) {
        if (!(error instanceof GameRuleError)) console.error(error)
        setNotice(error instanceof GameRuleError ? error.message : `会話を続けられません: ${error instanceof Error ? error.message : String(error)}`)
        return false
      } finally {
        running = false
        if (currentBgm() !== song) playBgm(song)
      }
    })
    return () => {
      setDialogueStarter(null)
      player.abort()
    }
  }, [store, player])

  return (
    <>
      <div className="dialogue-layer">
        <DialogueView player={player} />
      </div>
      {notice && <AlertDialog title="会話" message={notice} onClose={() => setNotice(null)} />}
    </>
  )
}
