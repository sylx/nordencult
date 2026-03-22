import { NextResponse } from "next/server";
import { loadCharacters } from "@/lib/store";
import { EXPORT_JSON, EXPORT_WEBP, SPRITE_COLS, SPRITE_ROWS, CELL_W, CELL_H, CELL_PADDING, DEFAULT_UPLOADS_DIR } from "@/lib/config";
import fs from "fs";
import path from "path";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const SHEET_W = CELL_W * SPRITE_COLS + CELL_PADDING * (SPRITE_COLS - 1);
const SHEET_H = CELL_H * SPRITE_ROWS + CELL_PADDING * (SPRITE_ROWS - 1);
const SCALED_SHEET_W = Math.floor(SHEET_W / 2);
const SCALED_SHEET_H = Math.floor(SHEET_H / 2);

export async function GET() {
  const characters = loadCharacters();
  const uploadsDir = DEFAULT_UPLOADS_DIR;

  const sheets = [...new Set(characters.filter((c) => c.imageInfo.sprite.url).map((c) => c.imageInfo.sprite.url))].sort();
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
  const uploadsDir = DEFAULT_UPLOADS_DIR;

  // Collect unique sheets (deterministic order)
  const sheets = [...new Set(characters.filter((c) => c.imageInfo.sprite.url).map((c) => c.imageInfo.sprite.url))].sort();

  // Filter out missing sheets
  const existingSheets = sheets.filter((s) => fs.existsSync(path.join(uploadsDir, s)));

  if (existingSheets.length === 0) {
    return NextResponse.json({ error: "No sprite sheets found" }, { status: 400 });
  }

  // Load and scale each sheet to 50%
  const scaledBuffers: Buffer[] = [];
  for (const s of existingSheets) {
    const filePath = path.join(uploadsDir, s);
    const buf = await sharp(filePath)
      .resize(SCALED_SHEET_W, SCALED_SHEET_H)
      .toBuffer();
    scaledBuffers.push(buf);
  }

  // Concatenate vertically into single image
  const totalHeight = SCALED_SHEET_H * existingSheets.length;
  const compositeInputs = scaledBuffers.map((buf, i) => ({
    input: buf,
    top: i * SCALED_SHEET_H,
    left: 0,
  }));

  const combined = await sharp({
    create: {
      width: SCALED_SHEET_W,
      height: totalHeight,
      channels: 4 as const,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeInputs)
    .webp({ quality: 90, effort: 6 })
    .toBuffer();

  // Save combined WebP
  const webpDir = path.dirname(EXPORT_WEBP);
  if (!fs.existsSync(webpDir)) fs.mkdirSync(webpDir, { recursive: true });
  fs.writeFileSync(EXPORT_WEBP, combined);

  // Compute Y offsets per sheet
  const sheetYOffsets: Record<string, number> = {};
  existingSheets.forEach((s, i) => {
    sheetYOffsets[s] = i * SCALED_SHEET_H;
  });

  // Build exported character data with recalculated coordinates
  const exportData = characters
    .filter((c) => c.imageInfo.sprite.url && existingSheets.includes(c.imageInfo.sprite.url))
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
  const jsonDir = path.dirname(EXPORT_JSON);
  if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir, { recursive: true });
  fs.writeFileSync(EXPORT_JSON, JSON.stringify(exportData, null, 2), "utf-8");

  const webpSizeKB = (combined.length / 1024).toFixed(1);

  return NextResponse.json({
    ok: true,
    jsonPath: EXPORT_JSON,
    webpPath: EXPORT_WEBP,
    characterCount: exportData.length,
    webpSize: `${webpSizeKB} KB`,
    imageSize: `${SCALED_SHEET_W}x${totalHeight}`,
  });
}
