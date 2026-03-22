import { NextResponse } from "next/server";
import { loadCharacters } from "@/lib/store";
import { EXPORT_JSON, EXPORT_WEBP, SPRITE_COLS, SPRITE_ROWS, CELL_W, CELL_H, CELL_PADDING, DEFAULT_UPLOADS_DIR } from "@/lib/config";
import fs from "fs";
import path from "path";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const NOPAD_SHEET_W = CELL_W * SPRITE_COLS;
const NOPAD_SHEET_H = CELL_H * SPRITE_ROWS;
const SCALED_SHEET_W = Math.floor(NOPAD_SHEET_W / 2);
const SCALED_SHEET_H = Math.floor(NOPAD_SHEET_H / 2);

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

/**
 * Remove inter-cell padding from a sprite sheet using raw pixel buffer copy.
 * Reads the source once, copies cell regions directly — no per-cell sharp decode.
 */
/**
 * Remove inter-cell padding and scale to 50%.
 * Reads the source once as raw pixels, copies cell regions via Buffer.copy,
 * then pipes the result back through sharp for resize.
 */
async function removePaddingAndScale(filePath: string): Promise<Buffer> {
  const { data: src, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = 4; // ensureAlpha guarantees RGBA
  const srcRowBytes = info.width * ch;
  const dstRowBytes = NOPAD_SHEET_W * ch;
  const dst = Buffer.alloc(NOPAD_SHEET_H * dstRowBytes);

  for (let row = 0; row < SPRITE_ROWS; row++) {
    for (let col = 0; col < SPRITE_COLS; col++) {
      const srcLeft = col * (CELL_W + CELL_PADDING);
      const srcTop = row * (CELL_H + CELL_PADDING);
      const dstLeft = col * CELL_W;
      const dstTop = row * CELL_H;
      const copyBytes = CELL_W * ch;

      for (let y = 0; y < CELL_H; y++) {
        const srcOff = (srcTop + y) * srcRowBytes + srcLeft * ch;
        const dstOff = (dstTop + y) * dstRowBytes + dstLeft * ch;
        src.copy(dst, dstOff, srcOff, srcOff + copyBytes);
      }
    }
  }

  // Convert raw pixels back to PNG buffer for downstream composite
  return sharp(dst, {
    raw: { width: NOPAD_SHEET_W, height: NOPAD_SHEET_H, channels: ch as 4 },
  })
    .resize(SCALED_SHEET_W, SCALED_SHEET_H)
    .png()
    .toBuffer();
}

function ndjson(obj: Record<string, unknown>): string {
  return JSON.stringify(obj) + "\n";
}

export async function POST() {
  const characters = loadCharacters();
  const uploadsDir = DEFAULT_UPLOADS_DIR;

  const sheets = [...new Set(characters.filter((c) => c.imageInfo.sprite.url).map((c) => c.imageInfo.sprite.url))].sort();
  const existingSheets = sheets.filter((s) => fs.existsSync(path.join(uploadsDir, s)));

  if (existingSheets.length === 0) {
    return NextResponse.json({ error: "No sprite sheets found" }, { status: 400 });
  }

  const totalSteps = existingSheets.length + 2; // sheets + combine + save
  let step = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(new TextEncoder().encode(ndjson(obj)));
      };

      try {
        // Process all sheets in parallel — raw pixel copy, then resize
        send({ type: "progress", step: step, totalSteps, message: "シート処理中..." });

        const scaledBuffers = await Promise.all(
          existingSheets.map(async (s, i) => {
            const filePath = path.join(uploadsDir, s);
            const scaled = await removePaddingAndScale(filePath);

            step++;
            send({ type: "progress", step, totalSteps, message: `シート ${i + 1}/${existingSheets.length} 完了` });
            return scaled;
          }),
        );

        // Concatenate vertically
        send({ type: "progress", step, totalSteps, message: "結合・WebPエンコード中..." });
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

        step++;
        send({ type: "progress", step, totalSteps, message: "ファイル書き込み中..." });

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
            const cellX = sprite.x * CELL_W;
            const cellY = sprite.y * CELL_H;
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

        step++;
        const webpSizeKB = (combined.length / 1024).toFixed(1);

        send({
          type: "done",
          step,
          totalSteps,
          ok: true,
          jsonPath: EXPORT_JSON,
          webpPath: EXPORT_WEBP,
          characterCount: exportData.length,
          webpSize: `${webpSizeKB} KB`,
          imageSize: `${SCALED_SHEET_W}x${totalHeight}`,
        });
      } catch (err) {
        send({ type: "error", message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
