import { NextResponse } from "next/server";
import { loadCharacters, saveCharacters, getNextId, createDefaultCharacter } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const characters = loadCharacters();
  return NextResponse.json(characters);
}

export async function POST() {
  const characters = loadCharacters();
  const id = getNextId(characters);
  const newChar = createDefaultCharacter(id);
  characters.push(newChar);
  saveCharacters(characters);
  return NextResponse.json(newChar);
}
