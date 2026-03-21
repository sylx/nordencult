import { NextResponse } from "next/server";
import { loadCharacters } from "@/lib/store";
import { EXPORT_JSON, SPRITE_COLS, SPRITE_ROWS, CELL_W, CELL_H, CELL_PADDING, DEFAULT_UPLOADS_DIR } from "@/lib/config";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const characters = loadCharacters();
  const uploadsDir = DEFAULT_UPLOADS_DIR;

  // Collect unique sheets
  const sheets = [...new Set(characters.filter((c) => c.imageInfo.sprite.url).map((c) => c.imageInfo.sprite.url))].sort();

  // Check which sheets exist
  const missing = sheets.filter((s) => !fs.existsSync(path.join(uploadsDir, s)));
  const noSprite = characters.filter((c) => !c.imageInfo.sprite.url);

  return NextResponse.json({
    totalCharacters: characters.length,
    totalSheets: sheets.length,
    missingSheets: missing,
    noSpriteCharacters: noSprite.map((c) => ({ id: c.id, name: c.name })),
  });
}

export async function POST() {
  const characters = loadCharacters();

  // Compute exported character data (scale coords by 50%)
  const sheets = [...new Set(characters.filter((c) => c.imageInfo.sprite.url).map((c) => c.imageInfo.sprite.url))].sort();

  const sheetYOffsets: Record<string, number> = {};
  let yOffset = 0;
  const scaledSheetH = Math.floor((CELL_H * SPRITE_ROWS + CELL_PADDING * (SPRITE_ROWS - 1)) / 2);
  for (const s of sheets) {
    sheetYOffsets[s] = yOffset;
    yOffset += scaledSheetH;
  }

  const exportData = characters
    .filter((c) => c.imageInfo.sprite.url)
    .map((c) => {
      const { sprite, faceRect } = c.imageInfo;
      const cellX = sprite.x * (CELL_W + CELL_PADDING);
      const cellY = sprite.y * (CELL_H + CELL_PADDING);
      const scaledX = Math.floor(cellX / 2);
      const scaledY = Math.floor(cellY / 2) + (sheetYOffsets[sprite.url] || 0);

      return {
        ...c,
        imageInfo: {
          sprite: {
            url: "character.webp",
            x: scaledX,
            y: scaledY,
          },
          faceRect: {
            x: faceRect.x / 2,
            y: faceRect.y / 2,
            width: faceRect.width / 2,
            height: faceRect.height / 2,
          },
        },
      };
    });

  // Save JSON
  const dir = path.dirname(EXPORT_JSON);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(EXPORT_JSON, JSON.stringify(exportData, null, 2), "utf-8");

  return NextResponse.json({
    ok: true,
    jsonPath: EXPORT_JSON,
    characterCount: exportData.length,
  });
}
