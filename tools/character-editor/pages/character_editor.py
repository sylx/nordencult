"""
Character editor page: sprite selector, faceRect editor, data form.
"""
import io
import streamlit as st
from pathlib import Path
from PIL import Image, ImageDraw

import lib.store as store
import lib.image_utils as image_utils
from lib.config import (
    get_uploads_dir, CELL_W, SPRITE_COLS, SPRITE_ROWS,
    CHARACTER_TYPES, CITY_IDS, FACTION_IDS, BLOOD_RELATION_TYPES,
)

# faceRect canvas display dimensions (1024:1536 = 2:3 aspect ratio)
CANVAS_DISPLAY_W = 200
CANVAS_DISPLAY_H = 300


@st.cache_data
def _cached_cell_thumb(sheet_path: str, col: int, row: int, mtime: float, size: int = 80) -> bytes:
    return image_utils.get_cell_thumbnail_bytes(sheet_path, col, row, mtime, size)



def render() -> None:
    editing_id = st.session_state.get("editing_id")
    if not editing_id:
        st.warning("編集するキャラクターが選択されていません。")
        return

    # Load draft (or fresh from store)
    if "draft" not in st.session_state or st.session_state.get("_draft_id") != editing_id:
        raw = store.get_character(editing_id) or store.make_default_character(editing_id)
        st.session_state.draft = raw
        st.session_state._draft_id = editing_id
        sprite = raw.get("imageInfo", {}).get("sprite", {})
        st.session_state.draft_sprite_x = sprite.get("x", 0)
        st.session_state.draft_sprite_y = sprite.get("y", 0)
        st.session_state.draft_face_rect = raw.get("imageInfo", {}).get("faceRect", {})

    draft = st.session_state.draft
    uploads_dir = get_uploads_dir()

    st.title(f"キャラクター編集: {draft.get('name', '')} [{editing_id}]")

    if st.button("← 一覧に戻る"):
        st.session_state.page = "list"
        st.rerun()

    st.divider()

    left_col, right_col = st.columns([1, 1], gap="large")

    # =====================
    # LEFT: Sprite selector + faceRect
    # =====================
    with left_col:
        st.subheader("スプライト選択")

        # Sheet selector
        sheet_files = image_utils.list_sheet_files(uploads_dir)
        sheet_names = [f.name for f in sheet_files]

        current_url = draft.get("imageInfo", {}).get("sprite", {}).get("url", "")
        default_idx = sheet_names.index(current_url) if current_url in sheet_names else 0

        if not sheet_names:
            st.warning(f"スプライトシートが見つかりません。\nuploadsディレクトリ: `{uploads_dir}`")
            selected_sheet_name = None
            selected_sheet_path = None
        else:
            selected_sheet_name = st.selectbox(
                "スプライトシート",
                options=sheet_names,
                index=default_idx,
                key="sheet_select",
            )
            selected_sheet_path = uploads_dir / selected_sheet_name

        # Grid selector
        if selected_sheet_path and selected_sheet_path.exists():
            st.markdown("**キャラクター位置を選択**")
            mtime = selected_sheet_path.stat().st_mtime
            cur_x = st.session_state.draft_sprite_x
            cur_y = st.session_state.draft_sprite_y

            for row in range(SPRITE_ROWS):
                cols = st.columns(SPRITE_COLS, gap="small")
                for col in range(SPRITE_COLS):
                    with cols[col]:
                        thumb = _cached_cell_thumb(str(selected_sheet_path), col, row, mtime, size=80)
                        is_selected = (col == cur_x and row == cur_y)
                        border = "3px solid #ff4400" if is_selected else "1px solid #444"
                        st.markdown(
                            f'<div style="border:{border};border-radius:4px;overflow:hidden;margin-bottom:2px">',
                            unsafe_allow_html=True,
                        )
                        st.image(thumb, use_container_width=True)
                        st.markdown("</div>", unsafe_allow_html=True)
                        btn_label = "✓" if is_selected else f"{col},{row}"
                        if st.button(btn_label, key=f"sel_{col}_{row}", use_container_width=True):
                            st.session_state.draft_sprite_x = col
                            st.session_state.draft_sprite_y = row
                            st.rerun()

        st.divider()
        st.subheader("顔エリア (faceRect) 設定")

        if selected_sheet_path and selected_sheet_path.exists():
            from streamlit_image_coordinates import streamlit_image_coordinates

            cur_x = st.session_state.draft_sprite_x
            cur_y = st.session_state.draft_sprite_y

            # CELL_W/CANVAS_DISPLAY_W == CELL_H/CANVAS_DISPLAY_H == 5.12 (uniform scale)
            SCALE = CELL_W / CANVAS_DISPLAY_W

            cell_img = image_utils.get_cell_pil_resized(
                selected_sheet_path, cur_x, cur_y, CANVAS_DISPLAY_W, CANVAS_DISPLAY_H
            )

            current_face_rect = st.session_state.get("draft_face_rect") or {}
            fr_x = int(round(current_face_rect.get("x", 0) / SCALE))
            fr_y = int(round(current_face_rect.get("y", 0) / SCALE))
            stored_w = current_face_rect.get("width", 0)
            fr_size = int(round(stored_w / SCALE)) if stored_w else 100
            fr_size = max(1, fr_size)

            face_key = f"{editing_id}_{cur_x}_{cur_y}"
            sk_x = f"fr_x_{face_key}"
            sk_y = f"fr_y_{face_key}"
            sk_size = f"fr_size_{face_key}"
            click_key = f"img_click_{face_key}"
            last_click_key = f"last_click_{face_key}"

            # Initialize slider session state from stored face_rect on first render
            if sk_x not in st.session_state:
                st.session_state[sk_x] = min(max(0, fr_x), CANVAS_DISPLAY_W - 1)
            if sk_y not in st.session_state:
                st.session_state[sk_y] = min(max(0, fr_y), CANVAS_DISPLAY_H - 1)
            if sk_size not in st.session_state:
                st.session_state[sk_size] = max(1, min(fr_size, CANVAS_DISPLAY_W))

            # Process click BEFORE sliders are instantiated (avoids "cannot modify after instantiation" error)
            raw_coords = st.session_state.get(click_key)
            if raw_coords is not None and raw_coords != st.session_state.get(last_click_key):
                st.session_state[last_click_key] = raw_coords
                cx, cy = raw_coords["x"], raw_coords["y"]
                cur_size = st.session_state[sk_size]
                st.session_state[sk_x] = max(0, min(cx - cur_size // 2, CANVAS_DISPLAY_W - 1))
                st.session_state[sk_y] = max(0, min(cy - cur_size // 2, CANVAS_DISPLAY_H - 1))

            # Size slider has a fixed max so it never gets auto-clamped by Streamlit
            # when X/Y position changes. Rectangle is clipped to image bounds when drawing.
            FACE_SIZE_MAX = min(CANVAS_DISPLAY_W, CANVAS_DISPLAY_H)
            slider_x = st.slider("X", 0, CANVAS_DISPLAY_W - 1, key=sk_x)
            slider_y = st.slider("Y", 0, CANVAS_DISPLAY_H - 1, key=sk_y)
            slider_size = st.slider("サイズ", 1, FACE_SIZE_MAX, key=sk_size)

            # Clamp rect to image bounds for stored values
            eff_w = min(slider_size, CANVAS_DISPLAY_W - slider_x)
            eff_h = min(slider_size, CANVAS_DISPLAY_H - slider_y)

            st.session_state.draft_face_rect = {
                "x": slider_x * SCALE,
                "y": slider_y * SCALE,
                "width": eff_w * SCALE,
                "height": eff_h * SCALE,
            }

            # Build composite image (character + rectangle overlay)
            x2 = min(slider_x + slider_size, CANVAS_DISPLAY_W)
            y2 = min(slider_y + slider_size, CANVAS_DISPLAY_H)
            preview = cell_img.convert("RGBA")
            overlay = Image.new("RGBA", preview.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            draw.rectangle(
                [slider_x, slider_y, x2 - 1, y2 - 1],
                fill=(255, 165, 0, 76),
                outline=(255, 68, 0, 255),
                width=2,
            )
            composite = Image.alpha_composite(preview, overlay)

            # Clickable image: clicking moves rect center to clicked point
            st.caption("クリックで顔エリアの中心を移動")
            streamlit_image_coordinates(composite, key=click_key, width=CANVAS_DISPLAY_W)

            # Face crop preview
            crop_box = [slider_x, slider_y, x2, y2]
            face_crop = cell_img.crop(crop_box)
            if face_crop.width > 0 and face_crop.height > 0:
                st.caption("顔プレビュー（80×80）")
                st.image(face_crop.resize((80, 80), Image.LANCZOS), width=80)

            face = st.session_state.draft_face_rect
            st.caption(
                f"x={face['x']:.1f}, y={face['y']:.1f}, "
                f"w={face['width']:.1f}, h={face['height']:.1f}"
            )
        else:
            st.info("スプライトシートを選択するとfaceRectを設定できます。")

    # =====================
    # RIGHT: Data form
    # =====================
    with right_col:
        st.subheader("キャラクターデータ")

        with st.form("character_form"):
            char_id = draft.get("id", editing_id)
            st.text_input("ID", value=char_id, disabled=True)

            name = st.text_input("名前", value=draft.get("name", ""))

            type_index = CHARACTER_TYPES.index(draft.get("type", "knight")) if draft.get("type") in CHARACTER_TYPES else 0
            type_labels = ["騎士 (knight)", "学者 (scholar)", "政治家 (politician)", "魔法使い (magician)", "狩人 (hunter)"]
            type_sel = st.selectbox("タイプ", options=type_labels, index=type_index)
            char_type = CHARACTER_TYPES[type_labels.index(type_sel)]

            st.markdown("**能力値**")
            stat_col1, stat_col2 = st.columns(2)
            with stat_col1:
                politics = st.slider("政治", 0, 100, draft.get("politics", 50))
                intelligence = st.slider("知力", 0, 100, draft.get("intelligence", 50))
            with stat_col2:
                leadership = st.slider("統率", 0, 100, draft.get("leadership", 50))
                charm = st.slider("魅力", 0, 100, draft.get("charm", 50))

            with st.expander("オプションフィールド"):
                # Mercenary info
                is_mercenary = st.checkbox(
                    "傭兵",
                    value=bool(draft.get("mercenaryInfo")),
                )
                merc_name = ""
                merc_fee = 0
                if is_mercenary:
                    m = draft.get("mercenaryInfo") or {}
                    merc_name = st.text_input("傭兵名", value=m.get("name", ""))
                    merc_fee = st.number_input("傭兵費用", min_value=0, value=m.get("fee", 0), step=100)

                # belongTo
                city_options = ["（なし）"] + CITY_IDS
                belong_to_val = draft.get("belongTo")
                city_idx = city_options.index(belong_to_val) if belong_to_val in city_options else 0
                belong_to_sel = st.selectbox("所属都市", options=city_options, index=city_idx)
                belong_to = belong_to_sel if belong_to_sel != "（なし）" else None

                # belongToFaction
                faction_options = ["（なし）"] + FACTION_IDS
                belong_faction_val = draft.get("belongToFaction")
                faction_idx = faction_options.index(belong_faction_val) if belong_faction_val in faction_options else 0
                belong_faction_sel = st.selectbox("所属派閥", options=faction_options, index=faction_idx)
                belong_faction = belong_faction_sel if belong_faction_sel != "（なし）" else None

                # Blood relations (read-only display; dynamic editing via session state below form)
                blood_relations = draft.get("bloodRelations") or []
                if blood_relations:
                    st.markdown("**血縁関係**")
                    for br in blood_relations:
                        st.caption(f"{br.get('relation')} → {br.get('characterId')}")

            submitted = st.form_submit_button("保存", type="primary", use_container_width=True)

        # Blood relation editor (outside form, uses session state)
        with st.expander("血縁関係の編集"):
            if "blood_relations_draft" not in st.session_state or st.session_state.get("_br_draft_id") != editing_id:
                st.session_state.blood_relations_draft = list(draft.get("bloodRelations") or [])
                st.session_state._br_draft_id = editing_id

            br_list = st.session_state.blood_relations_draft
            for i, br in enumerate(br_list):
                br_cols = st.columns([2, 2, 1])
                with br_cols[0]:
                    rel_idx = BLOOD_RELATION_TYPES.index(br.get("relation", "father")) if br.get("relation") in BLOOD_RELATION_TYPES else 0
                    new_rel = st.selectbox("関係", BLOOD_RELATION_TYPES, index=rel_idx, key=f"br_rel_{i}")
                    br["relation"] = new_rel
                with br_cols[1]:
                    new_cid = st.text_input("キャラクターID", value=br.get("characterId", ""), key=f"br_cid_{i}")
                    br["characterId"] = new_cid
                with br_cols[2]:
                    if st.button("削除", key=f"br_del_{i}"):
                        st.session_state.blood_relations_draft.pop(i)
                        st.rerun()

            if st.button("+ 血縁関係を追加"):
                st.session_state.blood_relations_draft.append({"relation": "father", "characterId": ""})
                st.rerun()

        if submitted:
            # Build updated record (preserve unknown keys from draft)
            updated = dict(draft)
            updated["name"] = name
            updated["type"] = char_type
            updated["politics"] = politics
            updated["intelligence"] = intelligence
            updated["leadership"] = leadership
            updated["charm"] = charm

            # Sprite info
            sprite_url = selected_sheet_name if (selected_sheet_name and selected_sheet_path and selected_sheet_path.exists()) else draft.get("imageInfo", {}).get("sprite", {}).get("url", "")
            updated["imageInfo"] = {
                "sprite": {
                    "url": sprite_url,
                    "x": st.session_state.draft_sprite_x,
                    "y": st.session_state.draft_sprite_y,
                },
                "faceRect": st.session_state.get("draft_face_rect") or draft.get("imageInfo", {}).get("faceRect", {"x": 0, "y": 0, "width": 0, "height": 0}),
            }

            # Optional fields
            if is_mercenary:
                updated["mercenaryInfo"] = {"name": merc_name, "fee": int(merc_fee)}
            else:
                updated.pop("mercenaryInfo", None)

            updated["belongTo"] = belong_to
            updated["belongToFaction"] = belong_faction

            blood = [br for br in st.session_state.blood_relations_draft if br.get("characterId")]
            updated["bloodRelations"] = blood if blood else None

            store.upsert_character(updated)
            st.session_state.draft = updated
            st.success("保存しました。")
            st.rerun()
