from pathlib import Path
import json

# --- Path constants ---
TOOL_DIR = Path(__file__).parent.parent
PROJECT_ROOT = TOOL_DIR.parent.parent
DATA_FILE = TOOL_DIR / "data" / "characters.json"
SETTINGS_FILE = TOOL_DIR / "data" / "settings.json"
DEFAULT_UPLOADS_DIR = TOOL_DIR / "uploads"
EXPORT_WEBP = PROJECT_ROOT / "src" / "assets" / "character.webp"
EXPORT_JSON = PROJECT_ROOT / "src" / "data" / "characterData.json"

# --- Sprite sheet constants ---
SPRITE_COLS = 5
SPRITE_ROWS = 3
CELL_W = 1024       # each character cell width
CELL_H = 1536       # each character cell height
CELL_PADDING = 50   # gap between cells (horizontal and vertical)
# Total sheet size: 5*1024 + 4*50 = 5320, 3*1536 + 2*50 = 4708
SPRITE_SHEET_W = CELL_W * SPRITE_COLS + CELL_PADDING * (SPRITE_COLS - 1)  # 5320
SPRITE_SHEET_H = CELL_H * SPRITE_ROWS + CELL_PADDING * (SPRITE_ROWS - 1)  # 4708

# --- City IDs (P000-P030) ---
CITY_IDS = [
    "P000", "P001", "P002", "P003", "P004", "P005", "P006", "P007",
    "P008", "P009", "P010", "P011", "P012", "P013", "P014", "P015",
    "P016", "P017", "P018", "P019", "P020", "P021", "P022", "P023",
    "P024", "P025", "P026", "P027", "P028", "P029", "P030",
]

# --- Faction IDs ---
FACTION_IDS = ["valhardt", "dracken", "leonis", "carta", "aqua", "rosalia", "taurus"]

# --- Character types ---
CHARACTER_TYPES = ["knight", "scholar", "politician", "magician", "hunter"]

# --- Blood relation types ---
BLOOD_RELATION_TYPES = ["father", "mother", "son", "daughter", "brother", "sister"]


def get_uploads_dir() -> Path:
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            p = Path(data.get("uploads_dir", ""))
            if p.is_dir():
                return p
        except Exception:
            pass
    return DEFAULT_UPLOADS_DIR


def set_uploads_dir(path: str) -> None:
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    data = {}
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    data["uploads_dir"] = path
    SETTINGS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
