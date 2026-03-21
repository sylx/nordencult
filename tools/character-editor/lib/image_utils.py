"""
Image processing utilities using Pillow.
"""
import io
import json
import copy
from pathlib import Path
from typing import Callable

from PIL import Image

from lib.config import (
    CELL_W, CELL_H, CELL_PADDING, SPRITE_COLS, SPRITE_ROWS,
    SPRITE_SHEET_W, SPRITE_SHEET_H,
    EXPORT_WEBP, EXPORT_JSON,
)


def _cell_box(col: int, row: int) -> tuple[int, int, int, int]:
    # Each cell starts at col*(CELL_W+PADDING), row*(CELL_H+PADDING)
    left = col * (CELL_W + CELL_PADDING)
    top = row * (CELL_H + CELL_PADDING)
    return (left, top, left + CELL_W, top + CELL_H)


def crop_character_cell(sheet_path: Path, col: int, row: int) -> Image.Image:
    """Open a sprite sheet and return the cropped character cell as RGBA PIL Image."""
    img = Image.open(sheet_path).convert("RGBA")
    return img.crop(_cell_box(col, row))


def get_cell_thumbnail_bytes(sheet_path: str, col: int, row: int, mtime: float, size: int = 80) -> bytes:
    """Return PNG bytes of a thumbnailed character cell. mtime is used for cache invalidation."""
    cell = crop_character_cell(Path(sheet_path), col, row)
    cell.thumbnail((size, size * 2), Image.LANCZOS)  # preserve 2:3 aspect ratio
    buf = io.BytesIO()
    cell.save(buf, format="PNG")
    return buf.getvalue()


def get_cell_image_bytes(sheet_path: Path, col: int, row: int, display_w: int, display_h: int) -> bytes:
    """Return PNG bytes of a character cell resized to (display_w, display_h)."""
    cell = crop_character_cell(sheet_path, col, row)
    cell = cell.resize((display_w, display_h), Image.LANCZOS)
    buf = io.BytesIO()
    cell.save(buf, format="PNG")
    return buf.getvalue()


def get_cell_pil_resized(sheet_path: Path, col: int, row: int, display_w: int, display_h: int) -> Image.Image:
    """Return a resized PIL Image of a character cell."""
    cell = crop_character_cell(sheet_path, col, row)
    return cell.resize((display_w, display_h), Image.LANCZOS)


def list_sheet_files(uploads_dir: Path) -> list[Path]:
    """Return sorted list of PNG/WebP files in the uploads directory."""
    files = []
    for ext in ("*.png", "*.PNG", "*.webp", "*.WebP", "*.jpg", "*.JPG", "*.jpeg"):
        files.extend(uploads_dir.glob(ext))
    return sorted(set(files))


def export_characters(
    characters: list[dict],
    uploads_dir: Path,
    progress_callback: Callable[[float, str], None] | None = None,
) -> tuple[Path, Path]:
    """
    Export all characters to:
    - character.webp: all sprite sheets scaled to 50%, concatenated vertically
    - characterData.json: character data with updated pixel coordinates

    Returns (webp_path, json_path).
    Raises FileNotFoundError if a required sprite sheet is missing.
    """
    # Step 1: Collect unique sprite sheet filenames (sorted for deterministic order)
    unique_sheets = sorted({
        c["imageInfo"]["sprite"]["url"]
        for c in characters
        if c.get("imageInfo", {}).get("sprite", {}).get("url")
    })

    if not unique_sheets:
        raise ValueError("エクスポート対象のキャラクターにスプライトシートが設定されていません。")

    # Step 2: Validate all sheets exist
    for filename in unique_sheets:
        path = uploads_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"スプライトシートが見つかりません: {filename}")

    # Step 3: Load and scale each sheet to 50%
    if progress_callback:
        progress_callback(0.0, "スプライトシートを読み込み中...")

    # Scaled sheet dimensions (50% of original): 5320//2=2660, 4708//2=2354
    scaled_sheet_w = SPRITE_SHEET_W // 2
    scaled_sheet_h = SPRITE_SHEET_H // 2

    scaled_sheets = []
    sheet_offsets: dict[str, int] = {}  # filename -> y_offset in combined image
    for i, filename in enumerate(unique_sheets):
        if progress_callback:
            progress_callback(i / len(unique_sheets) * 0.4, f"縮小中: {filename}")
        img = Image.open(uploads_dir / filename).convert("RGBA")
        scaled = img.resize((scaled_sheet_w, scaled_sheet_h), Image.LANCZOS)
        sheet_offsets[filename] = i * scaled_sheet_h
        scaled_sheets.append(scaled)

    # Step 4: Concatenate vertically
    if progress_callback:
        progress_callback(0.4, "画像を連結中...")
    total_height = scaled_sheet_h * len(scaled_sheets)
    combined = Image.new("RGBA", (scaled_sheet_w, total_height), (0, 0, 0, 0))
    for i, scaled in enumerate(scaled_sheets):
        combined.paste(scaled, (0, i * scaled_sheet_h))

    # Step 5: Save as WebP
    if progress_callback:
        progress_callback(0.6, "WebPとして保存中...")
    EXPORT_WEBP.parent.mkdir(parents=True, exist_ok=True)
    combined.save(str(EXPORT_WEBP), format="WEBP", quality=90, method=6)

    # Step 6: Recalculate character coordinates
    if progress_callback:
        progress_callback(0.8, "キャラクターデータを更新中...")

    # Step size in the scaled combined image (cell + padding, halved)
    SCALED_STEP_X = (CELL_W + CELL_PADDING) / 2   # (1024+50)/2 = 537
    SCALED_STEP_Y = (CELL_H + CELL_PADDING) / 2   # (1536+50)/2 = 793
    SCALED_SHEET_H = SPRITE_SHEET_H // 2           # 2354 per sheet

    export_chars = []
    for char_dict in characters:
        rec = copy.deepcopy(char_dict)
        sprite = rec["imageInfo"]["sprite"]
        filename = sprite["url"]
        col = sprite["x"]
        row = sprite["y"]

        if filename not in sheet_offsets:
            # Skip characters with no valid sprite sheet
            continue

        y_offset = sheet_offsets[filename]  # scaled sheet y_offset in combined image
        new_x = round(col * SCALED_STEP_X)
        new_y = round(y_offset + row * SCALED_STEP_Y)

        rec["imageInfo"]["sprite"]["url"] = "character.webp"
        rec["imageInfo"]["sprite"]["x"] = new_x
        rec["imageInfo"]["sprite"]["y"] = new_y

        # Scale faceRect by 50%
        fr = rec["imageInfo"]["faceRect"]
        rec["imageInfo"]["faceRect"] = {
            "x": fr["x"] * 0.5,
            "y": fr["y"] * 0.5,
            "width": fr["width"] * 0.5,
            "height": fr["height"] * 0.5,
        }

        export_chars.append(rec)

    # Step 7: Save JSON
    if progress_callback:
        progress_callback(0.95, "JSONを保存中...")
    EXPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    EXPORT_JSON.write_text(
        json.dumps(export_chars, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    if progress_callback:
        progress_callback(1.0, "完了")

    return EXPORT_WEBP, EXPORT_JSON
