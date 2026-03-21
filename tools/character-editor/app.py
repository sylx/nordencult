"""
Nordencult Tools - Character Editor
Entry point: page router + sidebar navigation.

Run: uv run streamlit run app.py
"""
# --- Compatibility patch for streamlit-drawable-canvas with Streamlit >= 1.26 ---
# streamlit-drawable-canvas 0.9.3 calls streamlit.elements.image.image_to_url,
# which was removed from Streamlit's internal API in newer versions.
import base64
import io as _io
import streamlit.elements.image as _st_image
from PIL import Image as _PILImage

if not hasattr(_st_image, "image_to_url"):
    def _image_to_url(image, width, clamp, channels, output_format, image_id, allow_emoji=False):
        if isinstance(image, _PILImage.Image):
            buf = _io.BytesIO()
            fmt = "PNG" if output_format in ("auto", "PNG", "") else output_format.upper()
            image.save(buf, format=fmt)
            data = base64.b64encode(buf.getvalue()).decode()
            return f"data:image/png;base64,{data}"
        return str(image)
    _st_image.image_to_url = _image_to_url
# ---------------------------------------------------------------------------------

import streamlit as st
from pathlib import Path

from lib.config import get_uploads_dir, set_uploads_dir

st.set_page_config(
    page_title="Nordencult - Character Editor",
    page_icon="⚔️",
    layout="wide",
)

# Initialize session state
if "page" not in st.session_state:
    st.session_state.page = "list"
if "editing_id" not in st.session_state:
    st.session_state.editing_id = None

# =====================
# Sidebar navigation
# =====================
with st.sidebar:
    st.markdown("## Nordencult Tools")
    st.divider()

    if st.button("📋 キャラクター一覧", use_container_width=True):
        st.session_state.page = "list"
        st.session_state.editing_id = None
        st.rerun()

    if st.button("📦 エクスポート", use_container_width=True):
        st.session_state.page = "export"
        st.rerun()

    st.divider()
    st.markdown("### 設定")

    current_uploads = str(get_uploads_dir())
    new_uploads = st.text_input(
        "Uploadsディレクトリ",
        value=current_uploads,
        help="スプライトシートが入っているフォルダのパス",
    )
    if new_uploads != current_uploads:
        p = Path(new_uploads)
        if p.is_dir():
            set_uploads_dir(new_uploads)
            st.success("保存しました")
        else:
            st.error("有効なディレクトリパスを入力してください")

    st.divider()
    st.caption("Character Editor v0.1.0")

# =====================
# Page routing
# =====================
page = st.session_state.page

if page == "list":
    from pages.character_list import render
    render()
elif page == "editor":
    from pages.character_editor import render
    render()
elif page == "export":
    from pages.export import render
    render()
else:
    st.error(f"Unknown page: {page}")
