import path from "path";

// Re-export client-safe constants for server-side code
export * from "./constants";

// Server-only path constants
export const TOOL_DIR = process.cwd();
export const PROJECT_ROOT = path.resolve(TOOL_DIR, "../..");
export const DATA_FILE = path.join(TOOL_DIR, "data", "characters.json");
export const SETTINGS_FILE = path.join(TOOL_DIR, "data", "settings.json");
export const DEFAULT_UPLOADS_DIR = path.join(TOOL_DIR, "uploads");
export const EXPORT_WEBP = path.join(PROJECT_ROOT, "src", "assets", "character.webp");
export const EXPORT_JSON = path.join(PROJECT_ROOT, "src", "data", "characterData.json");

