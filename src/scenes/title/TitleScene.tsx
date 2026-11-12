import { useState } from 'react'
import { GameSettingsWindow } from '../../components/GameSettingsWindow'
import { useScene } from '../sceneContext'
import logoUrl from '../../assets/logo.webp'
import { TitleFog } from './TitleFog'
import './TitleScene.css'

export default function TitleScene() {
  const { goTo } = useScene()
  const [settingsOpen, setSettingsOpen] = useState(false)
  return (
    <main className="title-scene">
      {/* シームレス羊皮紙タイル背景 */}
      <div className="title-scene__bg" aria-hidden="true" />

      {/* ロゴ背後のスポットライト（炎の照り返しのように揺らぐ） */}
      <div className="title-scene__spotlight" aria-hidden="true" />

      {/* 足元を流れる霧（速さの違う 2 層） */}
      <TitleFog />

      {/* タイトル画面コンテンツ */}
      <div className="title-scene__content">
        <h1 className="title-scene__logo-wrap">
          <img src={logoUrl} alt="Nordencult" className="title-scene__logo" />
          {/* ロゴの形で切り抜いた光沢。ときどき斜めのハイライトが走る */}
          <span className="title-scene__logo-shine" aria-hidden="true" />
        </h1>
        <nav className="title-scene__menu" aria-label="タイトルメニュー">
          <button type="button" onClick={() => goTo('strategy')}>はじめる</button>
          <button type="button" onClick={() => setSettingsOpen(true)}>設定</button>
        </nav>
      </div>

      {settingsOpen && <GameSettingsWindow onClose={() => setSettingsOpen(false)} />}
    </main>
  )
}
