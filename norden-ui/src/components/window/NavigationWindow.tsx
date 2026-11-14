import WindowFrame from './WindowFrame'
import type { WindowFrameNavigation, WindowFrameProps } from './WindowFrame'

export interface NavigationWindowProps extends Omit<WindowFrameProps, 'navigation'>, WindowFrameNavigation {}

/** General-purpose window with back/forward controls embedded in the frame. Navigation state belongs to the caller. */
export default function NavigationWindow({
  onBack, onForward, backDisabled, forwardDisabled, backLabel, forwardLabel, background = 'parchment', draggable = true, ...props
}: NavigationWindowProps) {
  return <WindowFrame {...props} background={background} draggable={draggable} navigation={{ onBack, onForward, backDisabled, forwardDisabled, backLabel, forwardLabel }} />
}
