import { NextRequest, NextResponse } from "next/server";
import { loadCharacters, saveCharacters } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const characters = loadCharacters();
  const char = characters.find((c) => c.id === id);
  if (!char) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(char);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const characters = loadCharacters();
  const idx = characters.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  characters[idx] = { ...characters[idx], ...body, id };
  saveCharacters(characters);
  return NextResponse.json(characters[idx]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const characters = loadCharacters();
  const filtered = characters.filter((c) => c.id !== id);
  if (filtered.length === characters.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  saveCharacters(filtered);
  return NextResponse.json({ ok: true });
}
