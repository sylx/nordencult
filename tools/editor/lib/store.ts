import fs from "fs";
import path from "path";
import { DATA_FILE } from "./config";
import type { Character } from "./types";

function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadCharacters(): Character[] {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
    return [];
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

export function saveCharacters(characters: Character[]) {
  ensureDir();
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(characters, null, 2), "utf-8");
  fs.renameSync(tmp, DATA_FILE);
}

export function getNextId(characters: Character[]): string {
  if (characters.length === 0) return "001";
  const maxId = Math.max(...characters.map((c) => parseInt(c.id, 10)));
  return String(maxId + 1).padStart(3, "0");
}

export function createDefaultCharacter(id: string): Character {
  return {
    id,
    name: `キャラクター${id}`,
    type: "knight",
    imageInfo: {
      sprite: { url: "", x: 0, y: 0 },
      faceRect: { x: 0, y: 0, width: 100, height: 100 },
    },
    politics: 50,
    intelligence: 50,
    leadership: 50,
    strength: 50,
    charm: 50,
    belongTo: null,
    belongToFaction: null,
    relations: null,
  };
}
