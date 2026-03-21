import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_UPLOADS_DIR } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sheet = searchParams.get("sheet");

  if (!sheet) {
    return NextResponse.json({ error: "Missing sheet param" }, { status: 400 });
  }

  const safeName = path.basename(sheet);
  const filePath = path.join(DEFAULT_UPLOADS_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buf = fs.readFileSync(filePath);
  const ext = path.extname(safeName).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
  };

  return new NextResponse(buf, {
    headers: {
      "Content-Type": mimeMap[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
