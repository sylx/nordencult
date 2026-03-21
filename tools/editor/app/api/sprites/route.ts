import { NextResponse } from "next/server";
import fs from "fs";
import { DEFAULT_UPLOADS_DIR } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!fs.existsSync(DEFAULT_UPLOADS_DIR)) {
    return NextResponse.json([]);
  }
  const files = fs.readdirSync(DEFAULT_UPLOADS_DIR).filter((f) => /\.(png|webp|jpg|jpeg)$/i.test(f));
  files.sort();
  return NextResponse.json(files);
}
