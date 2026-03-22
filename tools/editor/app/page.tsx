"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Character } from "@/lib/types";
import {
  CHARACTER_TYPE_LABELS,
  FACTIONS,
  CITIES,
  SPRITE_COLS,
  SPRITE_ROWS,
  CELL_W,
  CELL_H,
  CELL_PADDING,
} from "@/lib/constants";

const FACTION_MAP = Object.fromEntries(FACTIONS.map((f) => [f.id, f.name]));
const CITY_MAP = Object.fromEntries(CITIES.map((c) => [c.id, c.name]));

const THUMB_W = 64;
const THUMB_H = 96;
const SHEET_W = CELL_W * SPRITE_COLS + CELL_PADDING * (SPRITE_COLS - 1);
const SHEET_H = CELL_H * SPRITE_ROWS + CELL_PADDING * (SPRITE_ROWS - 1);
const SCALE_X = THUMB_W / CELL_W;
const SCALE_Y = THUMB_H / CELL_H;

const FACE_SIZE = 48;

function CharacterThumb({ char }: { char: Character }) {
  const { sprite } = char.imageInfo;
  if (!sprite.url) {
    return (
      <div
        className="bg-base-300 flex items-center justify-center text-xs"
        style={{ width: THUMB_W, height: THUMB_H }}
      >
        No Image
      </div>
    );
  }

  const cellX = sprite.x * (CELL_W + CELL_PADDING);
  const cellY = sprite.y * (CELL_H + CELL_PADDING);

  return (
    <div
      className="overflow-hidden relative"
      style={{ width: THUMB_W, height: THUMB_H }}
    >
      <img
        src={`/api/sprites/cell?sheet=${encodeURIComponent(sprite.url)}`}
        alt=""
        className="max-w-none"
        style={{
          position: "absolute",
          width: SHEET_W * SCALE_X,
          height: SHEET_H * SCALE_Y,
          left: -cellX * SCALE_X,
          top: -cellY * SCALE_Y,
          imageRendering: "auto",
        }}
        draggable={false}
      />
    </div>
  );
}

function FaceThumb({ char }: { char: Character }) {
  const { sprite, faceRect } = char.imageInfo;
  if (!sprite.url || !faceRect || faceRect.width === 0) return null;

  const cellX = sprite.x * (CELL_W + CELL_PADDING);
  const cellY = sprite.y * (CELL_H + CELL_PADDING);
  const faceScale = FACE_SIZE / faceRect.width;

  return (
    <div
      className="overflow-hidden relative rounded-full border border-base-300"
      style={{ width: FACE_SIZE, height: FACE_SIZE }}
    >
      <img
        src={`/api/sprites/cell?sheet=${encodeURIComponent(sprite.url)}`}
        alt=""
        className="max-w-none"
        style={{
          position: "absolute",
          width: SHEET_W * faceScale,
          height: SHEET_H * faceScale,
          left: -(cellX + faceRect.x) * faceScale,
          top: -(cellY + faceRect.y) * faceScale,
          imageRendering: "auto",
        }}
        draggable={false}
      />
    </div>
  );
}

export default function CharacterListPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchCharacters = useCallback(async () => {
    const res = await fetch("/api/characters");
    const data = await res.json();
    setCharacters(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const handleCreate = async () => {
    const res = await fetch("/api/characters", { method: "POST" });
    const newChar = await res.json();
    window.location.href = `/edit/${newChar.id}`;
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/characters/${id}`, { method: "DELETE" });
    setDeleteId(null);
    fetchCharacters();
  };

  const filtered = characters.filter((char) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const factionName = char.belongToFaction
      ? (FACTION_MAP[char.belongToFaction] ?? "").toLowerCase()
      : "";
    const cityName = char.belongTo
      ? (CITY_MAP[char.belongTo] ?? "").toLowerCase()
      : "";
    return (
      char.name.toLowerCase().includes(q) ||
      factionName.includes(q) ||
      cityName.includes(q)
    );
  });

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">キャラクター一覧</h1>
        <div className="flex gap-2">
          <Link href="/export" className="btn btn-outline btn-sm">
            エクスポート
          </Link>
          <button className="btn btn-primary btn-sm" onClick={handleCreate}>
            + 新規作成
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="名前・所属・都市で検索..."
          className="input input-bordered input-sm w-full max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="alert">
          {characters.length === 0
            ? "キャラクターがいません。新規作成してください。"
            : "該当するキャラクターが見つかりません。"}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((char) => (
            <div key={char.id} className="card bg-base-200 shadow-sm">
              <figure className="pt-3 flex justify-center gap-2 items-end">
                <CharacterThumb char={char} />
                <FaceThumb char={char} />
              </figure>
              <div className="card-body p-3 pt-2">
                <p className="text-sm font-semibold truncate">{char.name}</p>
                <p className="text-xs opacity-60">
                  {char.id} / {CHARACTER_TYPE_LABELS[char.type] || char.type}
                </p>
                {char.belongToFaction && (
                  <p className="text-xs opacity-60 truncate">
                    {FACTION_MAP[char.belongToFaction] ?? char.belongToFaction}
                  </p>
                )}
                {char.belongTo && (
                  <p className="text-xs opacity-60 truncate">
                    {CITY_MAP[char.belongTo] ?? char.belongTo}
                  </p>
                )}
                <div className="card-actions justify-end mt-1">
                  <Link
                    href={`/edit/${char.id}`}
                    className="btn btn-xs btn-primary"
                  >
                    編集
                  </Link>
                  <button
                    className="btn btn-xs btn-error btn-outline"
                    onClick={() => setDeleteId(char.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">確認</h3>
            <p className="py-4">
              キャラクター {deleteId} を削除しますか？
            </p>
            <div className="modal-action">
              <button className="btn" onClick={() => setDeleteId(null)}>
                キャンセル
              </button>
              <button
                className="btn btn-error"
                onClick={() => handleDelete(deleteId)}
              >
                削除
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDeleteId(null)} />
        </dialog>
      )}
    </div>
  );
}
