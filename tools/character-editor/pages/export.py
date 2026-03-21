"""
Export page: generate final assets (character.webp + characterData.json).
"""
import json
import streamlit as st
from pathlib import Path

import lib.store as store
import lib.image_utils as image_utils
from lib.config import get_uploads_dir, EXPORT_WEBP, EXPORT_JSON


def render() -> None:
    st.title("アセットエクスポート")

    records = store.load_raw()
    uploads_dir = get_uploads_dir()

    if not records:
        st.warning("キャラクターが登録されていません。")
        return

    # Summary
    unique_sheets = sorted({
        r["imageInfo"]["sprite"]["url"]
        for r in records
        if r.get("imageInfo", {}).get("sprite", {}).get("url")
    })

    st.markdown(f"**{len(records)}** キャラクター / **{len(unique_sheets)}** スプライトシート")

    # Check for missing sheets
    missing = []
    for sheet_name in unique_sheets:
        if not (uploads_dir / sheet_name).exists():
            missing.append(sheet_name)

    if missing:
        st.error(f"以下のスプライトシートが見つかりません:\n" + "\n".join(f"- `{m}`" for m in missing))

    # Characters without sprite
    no_sprite = [r for r in records if not r.get("imageInfo", {}).get("sprite", {}).get("url")]
    if no_sprite:
        st.warning(
            f"{len(no_sprite)} 件のキャラクターにスプライトが設定されていません（エクスポートから除外されます）:\n"
            + "\n".join(f"- {r.get('id')} {r.get('name')}" for r in no_sprite)
        )

    st.divider()
    st.markdown("**出力先:**")
    st.code(str(EXPORT_WEBP))
    st.code(str(EXPORT_JSON))

    st.markdown("""
**エクスポート処理:**
1. 各スプライトシートを50%縮小 (1024×1536 → 512×768)
2. 縦方向に連結して `character.webp` として保存
3. キャラクターのスプライト座標をピクセル座標に変換
4. faceRectを50%スケールに変換
5. `characterData.json` として保存
""")

    if missing:
        st.button("エクスポート", disabled=True, type="primary", use_container_width=True)
        return

    if st.button("エクスポート実行", type="primary", use_container_width=True):
        progress_bar = st.progress(0.0)
        status_text = st.empty()

        def on_progress(pct: float, msg: str) -> None:
            progress_bar.progress(pct)
            status_text.text(msg)

        try:
            webp_path, json_path = image_utils.export_characters(
                records, uploads_dir, progress_callback=on_progress
            )
            progress_bar.progress(1.0)
            status_text.text("完了！")

            st.success("エクスポートが完了しました。")

            # Show results
            col1, col2 = st.columns(2)
            with col1:
                webp_size = webp_path.stat().st_size / 1024
                st.metric("character.webp", f"{webp_size:.1f} KB")
                from PIL import Image
                img = Image.open(webp_path)
                st.caption(f"サイズ: {img.width}×{img.height}px")
                st.image(str(webp_path), caption="character.webp プレビュー")

            with col2:
                json_size = json_path.stat().st_size / 1024
                st.metric("characterData.json", f"{json_size:.1f} KB")
                export_data = json.loads(json_path.read_text(encoding="utf-8"))
                st.caption(f"{len(export_data)} キャラクター")
                st.json(export_data[:3] if len(export_data) > 3 else export_data)

        except FileNotFoundError as e:
            st.error(str(e))
        except ValueError as e:
            st.error(str(e))
        except Exception as e:
            st.error(f"エクスポート中にエラーが発生しました: {e}")
