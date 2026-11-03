import type { DialogueId, DialogueInput } from '../dialogue'

/** What DialogueLayer plays a scene with; null while it is not there */
type Start = (id: DialogueId, input: DialogueInput<DialogueId>) => Promise<boolean>

let start: Start | null = null

/** DialogueLayer, when it is mounted */
export function setDialogueStarter(starter: Start | null) {
  start = starter
}

/**
 * Plays a dialogue scene over the screen (DialogueLayer). When it ends, what it did goes into the game state at once:
 * true. When the rules stop it, nothing changes and a notice tells why: false
 */
export function playDialogue<K extends DialogueId>(id: K, input: DialogueInput<K>): Promise<boolean> {
  if (!start) return Promise.reject(new Error('会話を出す層（DialogueLayer）がありません'))
  return start(id, input)
}
