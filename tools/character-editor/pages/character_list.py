"""
Character list page: browse, create, and delete characters.
"""
import io
import streamlit as st
from pathlib import Path

import lib.store as store
import lib.image_utils as image_utils
from lib.config import get_uploads_dir


@st.cache_data
def _cached_cell_thumb(sheet_path: str, col: int, row: int, mtime: float) -> bytes:
    return image_utils.get_cell_thumbnail_bytes(sheet_path, col, row, mtime, size=64)


def _get_sprite_thumb(rec: dict) -> bytes | None:
    sprite = rec.get("imageInfo", {}).get("sprite", {})
    url = sprite.get("url", "")
    if not url:
        return None
    uploads_dir = get_uploads_dir()
    sheet_path = uploads_dir / url
    if not sheet_path.exists():
        return None
    try:
        mtime = sheet_path.stat().st_mtime
        return _cached_cell_thumb(str(sheet_path), sprite.get("x", 0), sprite.get("y", 0), mtime)
    except Exception:
        return None


def render() -> None:
    st.title("キャラクター一覧")

    col_new, col_spacer = st.columns([1, 3])
    with col_new:
        if st.button("+ 新規キャラクター", type="primary", use_container_width=True):
            new_id = store.next_id()
            new_char = store.make_default_character(new_id)
            store.upsert_character(new_char)
            st.session_state.editing_id = new_id
            st.session_state.page = "editor"
            st.rerun()

    records = store.load_raw()

    if not records:
        st.info("キャラクターがいません。「+ 新規キャラクター」ボタンで作成してください。")
        return

    st.markdown(f"**{len(records)}** 件のキャラクター")
    st.divider()

    # Confirmation state for delete
    if "confirm_delete_id" not in st.session_state:
        st.session_state.confirm_delete_id = None

    for rec in records:
        char_id = rec.get("id", "")
        char_name = rec.get("name", "（名前なし）")
        char_type = rec.get("type", "")

        thumb = _get_sprite_thumb(rec)

        cols = st.columns([1, 4, 1, 1], gap="small")
        with cols[0]:
            if thumb:
                st.image(thumb, width=64)
            else:
                st.markdown("🔲")

        with cols[1]:
            type_labels = {
                "knight": "騎士",
                "scholar": "学者",
                "politician": "政治家",
                "magician": "魔法使い",
                "hunter": "狩人",
            }
            type_jp = type_labels.get(char_type, char_type)
            st.markdown(f"**{char_name}**  \n`{char_id}` · {type_jp}")

        with cols[2]:
            if st.button("編集", key=f"edit_{char_id}", use_container_width=True):
                st.session_state.editing_id = char_id
                st.session_state.page = "editor"
                # Clear draft state
                for key in ("draft", "draft_face_rect", "draft_sprite_x", "draft_sprite_y"):
                    st.session_state.pop(key, None)
                st.rerun()

        with cols[3]:
            if st.session_state.confirm_delete_id == char_id:
                if st.button("確認", key=f"confirm_del_{char_id}", type="primary", use_container_width=True):
                    store.delete_character(char_id)
                    st.session_state.confirm_delete_id = None
                    st.rerun()
            else:
                if st.button("削除", key=f"del_{char_id}", use_container_width=True):
                    st.session_state.confirm_delete_id = char_id
                    st.rerun()

        st.divider()
