/**
 * Sound effects by name. norden-ui and what is built on it (norden-battle) only name the sound;
 * the game plays it (setSoundPlayer). Without a player (the catalog, the battle editor) nothing sounds.
 */
export type SoundPlayer = (name: string) => void

let player: SoundPlayer | null = null

/** The game's player of sound effects; null stops them */
export function setSoundPlayer(next: SoundPlayer | null): void {
  player = next
}

/** Plays the named sound effect ('click' and so on), if the game has a player */
export function playSound(name: string): void {
  player?.(name)
}

/** What sounds 'click' when clicked. Other elements take part with data-sound */
const CLICKABLE = 'button, a[href], input[type="checkbox"], input[type="radio"], [role="button"], [role="tab"], [role="radio"], [role="checkbox"], [role="menuitem"], [data-sound]'

/**
 * Plays a sound for clicks on buttons, tabs, radios and checkboxes, but not disabled ones.
 * data-sound on the element (or around it) names another sound, and data-sound="none" keeps it silent
 * (drag handles). Listens in the capture phase, so a click whose propagation stops (in dialogs) still sounds.
 * Returns the undo.
 */
export function installClickSound(target: Document | HTMLElement = document): () => void {
  const onClick = (event: Event) => {
    if (!(event.target instanceof Element)) return
    const element = event.target.closest(CLICKABLE)
    if (!element || element.matches(':disabled, [aria-disabled="true"]')) return
    const name = element.closest('[data-sound]')?.getAttribute('data-sound') ?? 'click'
    if (name !== 'none') playSound(name)
  }
  target.addEventListener('click', onClick, true)
  return () => target.removeEventListener('click', onClick, true)
}
