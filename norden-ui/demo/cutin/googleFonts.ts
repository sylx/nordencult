import { FONT_CHOICES } from './presets'

const loaded = new Set<string>()

/** Family names of a CSS font-family list */
export function familyNames(stack: string) {
  return stack.split(',').map(name => name.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
}

/** Load the families of the list that the editor knows from Google Fonts (the game loads its fonts itself) */
export function loadGoogleFonts(...stacks: string[]) {
  for (const name of stacks.flatMap(familyNames)) {
    const choice = FONT_CHOICES.find(item => item.family === name)
    if (!choice || loaded.has(choice.family)) continue
    loaded.add(choice.family)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${choice.family.replace(/ /g, '+')}:wght@${choice.weights.join(';')}&display=swap`
    document.head.appendChild(link)
  }
}
