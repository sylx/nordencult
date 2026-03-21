"""
JSON data store for character data.
Always stores raw dicts to preserve unknown keys (for future interface extensions).
"""
import json
import os
import tempfile
from pathlib import Path

from lib.config import DATA_FILE


def _ensure_data_file() -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text("[]", encoding="utf-8")


def load_raw() -> list[dict]:
    _ensure_data_file()
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_raw(records: list[dict]) -> None:
    _ensure_data_file()
    content = json.dumps(records, ensure_ascii=False, indent=2)
    # Atomic write via temp file
    tmp_fd, tmp_path = tempfile.mkstemp(dir=DATA_FILE.parent, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            f.write(content)
        os.replace(tmp_path, DATA_FILE)
    except Exception:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        raise


def get_character(char_id: str) -> dict | None:
    for rec in load_raw():
        if rec.get("id") == char_id:
            return rec
    return None


def upsert_character(record: dict) -> None:
    records = load_raw()
    char_id = record.get("id")
    for i, rec in enumerate(records):
        if rec.get("id") == char_id:
            # Merge: start from existing (preserves unknown keys), update with new data
            merged = {**rec, **record}
            records[i] = merged
            save_raw(records)
            return
    records.append(record)
    save_raw(records)


def delete_character(char_id: str) -> None:
    records = load_raw()
    records = [r for r in records if r.get("id") != char_id]
    save_raw(records)


def next_id() -> str:
    records = load_raw()
    if not records:
        return "001"
    max_num = max(int(r.get("id", "0")) for r in records if r.get("id", "").isdigit())
    return str(max_num + 1).zfill(3)


def make_default_character(char_id: str) -> dict:
    return {
        "id": char_id,
        "name": f"キャラクター{char_id}",
        "type": "knight",
        "imageInfo": {
            "sprite": {"url": "", "x": 0, "y": 0},
            "faceRect": {"x": 0, "y": 0, "width": 100, "height": 100},
        },
        "politics": 50,
        "intelligence": 50,
        "leadership": 50,
        "charm": 50,
    }
