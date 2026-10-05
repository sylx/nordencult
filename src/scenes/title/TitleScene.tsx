import { useScene } from '../sceneContext'
import './TitleScene.css'

export default function TitleScene() {
  const { goTo } = useScene()
  return (
    <main className="title-scene">
      <h1 className="title-scene__name">Nordencult</h1>
      <nav className="title-scene__menu" aria-label="タイトルメニュー">
        <button type="button" onClick={() => goTo('strategy')}>はじめる</button>
      </nav>
    </main>
  )
}
