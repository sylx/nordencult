import { useScene } from '../sceneContext'
import logoUrl from '../../assets/logo.png'
import { TitleParticles } from './TitleParticles'
import './TitleScene.css'

export default function TitleScene() {
  const { goTo } = useScene()
  return (
    <main className="title-scene">
      {/* シームレス羊皮紙タイル背景 */}
      <div className="title-scene__bg" aria-hidden="true" />

      {/* ロゴ背後のスポットライト */}
      <div className="title-scene__spotlight" aria-hidden="true" />

      {/* 3Dゴールドパーティクル（奥・手前） */}
      <TitleParticles />

      {/* タイトル画面コンテンツ */}
      <div className="title-scene__content">
        <h1 className="title-scene__logo-wrap">
          <img src={logoUrl} alt="Nordencult" className="title-scene__logo" />
        </h1>
        <nav className="title-scene__menu" aria-label="タイトルメニュー">
          <button type="button" onClick={() => goTo('strategy')}>はじめる</button>
        </nav>
      </div>
    </main>
  )
}
