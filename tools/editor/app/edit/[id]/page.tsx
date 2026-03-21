"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import Link from "next/link";
import type { Character, BloodRelation } from "@/lib/types";
import {
  CHARACTER_TYPES,
  CHARACTER_TYPE_LABELS,
  FACTIONS,
  CITIES,
  BLOOD_RELATION_TYPES,
  SPRITE_COLS,
  SPRITE_ROWS,
  CELL_W,
  CELL_H,
  CELL_PADDING,
} from "@/lib/constants";

const CANVAS_W = 200;
const CANVAS_H = 300;
const SCALE = CELL_W / CANVAS_W; // 5.12

const SHEET_W = CELL_W * SPRITE_COLS + CELL_PADDING * (SPRITE_COLS - 1);
const SHEET_H = CELL_H * SPRITE_ROWS + CELL_PADDING * (SPRITE_ROWS - 1);

// Grid thumbnail size
const GRID_THUMB_W = 80;
const GRID_THUMB_H = 120;
const GRID_SCALE_X = GRID_THUMB_W / CELL_W;
const GRID_SCALE_Y = GRID_THUMB_H / CELL_H;

function SpriteGrid({
  sheetUrl,
  selectedX,
  selectedY,
  onSelect,
}: {
  sheetUrl: string;
  selectedX: number;
  selectedY: number;
  onSelect: (x: number, y: number) => void;
}) {
  if (!sheetUrl) return null;

  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${SPRITE_COLS}, ${GRID_THUMB_W}px)` }}>
      {Array.from({ length: SPRITE_ROWS }, (_, row) =>
        Array.from({ length: SPRITE_COLS }, (_, col) => {
          const isSelected = col === selectedX && row === selectedY;
          const cellX = col * (CELL_W + CELL_PADDING);
          const cellY = row * (CELL_H + CELL_PADDING);
          return (
            <button
              key={`${col}-${row}`}
              className={`relative overflow-hidden border-2 cursor-pointer ${
                isSelected ? "border-orange-500" : "border-base-300"
              }`}
              style={{ width: GRID_THUMB_W, height: GRID_THUMB_H }}
              onClick={() => onSelect(col, row)}
              type="button"
            >
              <img
                src={`/api/sprites/cell?sheet=${encodeURIComponent(sheetUrl)}`}
                alt=""
                className="max-w-none"
                style={{
                  position: "absolute",
                  width: SHEET_W * GRID_SCALE_X,
                  height: SHEET_H * GRID_SCALE_Y,
                  left: -cellX * GRID_SCALE_X,
                  top: -cellY * GRID_SCALE_Y,
                }}
                draggable={false}
              />
            </button>
          );
        })
      )}
    </div>
  );
}

function FaceRectEditor({
  sheetUrl,
  spriteX,
  spriteY,
  faceRect,
  onFaceRectChange,
}: {
  sheetUrl: string;
  spriteX: number;
  spriteY: number;
  faceRect: { x: number; y: number; width: number; height: number };
  onFaceRectChange: (rect: { x: number; y: number; width: number; height: number }) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * SCALE;
    const clickY = (e.clientY - rect.top) * SCALE;
    // Center the face rect on click position
    const newX = Math.max(0, Math.min(CELL_W - faceRect.width, clickX - faceRect.width / 2));
    const newY = Math.max(0, Math.min(CELL_H - faceRect.height, clickY - faceRect.height / 2));
    onFaceRectChange({ ...faceRect, x: newX, y: newY });
  };

  const cellX = spriteX * (CELL_W + CELL_PADDING);
  const cellY = spriteY * (CELL_H + CELL_PADDING);

  const cellScaleX = CANVAS_W / CELL_W;
  const cellScaleY = CANVAS_H / CELL_H;

  // Face rect preview (crop from the selected cell)
  const previewSize = 80;

  return (
    <div className="space-y-3">
      <div
        ref={canvasRef}
        className="relative overflow-hidden cursor-crosshair border border-base-300"
        style={{ width: CANVAS_W, height: CANVAS_H }}
        onClick={handleClick}
      >
        {sheetUrl && (
          <img
            src={`/api/sprites/cell?sheet=${encodeURIComponent(sheetUrl)}`}
            alt=""
            className="max-w-none"
            style={{
              position: "absolute",
              width: SHEET_W * cellScaleX,
              height: SHEET_H * cellScaleY,
              left: -cellX * cellScaleX,
              top: -cellY * cellScaleY,
            }}
            draggable={false}
          />
        )}
        {/* Face rect overlay */}
        <div
          className="absolute border-2 border-orange-500 pointer-events-none"
          style={{
            left: faceRect.x / SCALE,
            top: faceRect.y / SCALE,
            width: faceRect.width / SCALE,
            height: faceRect.height / SCALE,
            backgroundColor: "rgba(255,165,0,0.2)",
          }}
        />
      </div>

      {/* Sliders */}
      <div className="space-y-1 text-sm">
        <label className="flex items-center gap-2">
          <span className="w-8">X</span>
          <input
            type="range"
            className="range range-xs range-primary flex-1"
            min={0}
            max={CELL_W - faceRect.width}
            value={Math.round(faceRect.x)}
            onChange={(e) => onFaceRectChange({ ...faceRect, x: Number(e.target.value) })}
          />
          <span className="w-12 text-right">{faceRect.x.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="w-8">Y</span>
          <input
            type="range"
            className="range range-xs range-primary flex-1"
            min={0}
            max={CELL_H - faceRect.height}
            value={Math.round(faceRect.y)}
            onChange={(e) => onFaceRectChange({ ...faceRect, y: Number(e.target.value) })}
          />
          <span className="w-12 text-right">{faceRect.y.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="w-8">Size</span>
          <input
            type="range"
            className="range range-xs range-primary flex-1"
            min={32}
            max={Math.min(CELL_W, CELL_H)}
            value={Math.round(faceRect.width)}
            onChange={(e) => {
              const size = Number(e.target.value);
              const x = Math.min(faceRect.x, CELL_W - size);
              const y = Math.min(faceRect.y, CELL_H - size);
              onFaceRectChange({ x, y, width: size, height: size });
            }}
          />
          <span className="w-12 text-right">{faceRect.width.toFixed(0)}</span>
        </label>
      </div>

      {/* Face preview */}
      {sheetUrl && (
        <div>
          <p className="text-xs opacity-60 mb-1">顔プレビュー</p>
          <div
            className="overflow-hidden border border-base-300"
            style={{ width: previewSize, height: previewSize }}
          >
            <img
              src={`/api/sprites/cell?sheet=${encodeURIComponent(sheetUrl)}`}
              alt=""
              className="max-w-none"
              style={{
                position: "relative",
                width: SHEET_W * (previewSize / faceRect.width),
                height: SHEET_H * (previewSize / faceRect.height),
                left: -(cellX + faceRect.x) * (previewSize / faceRect.width),
                top: -(cellY + faceRect.y) * (previewSize / faceRect.height),
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CharacterEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [char, setChar] = useState<Character | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);

  useEffect(() => {
    fetch(`/api/characters/${id}`)
      .then((r) => r.json())
      .then(setChar);
    fetch("/api/sprites")
      .then((r) => r.json())
      .then(setSheets);
    fetch("/api/characters")
      .then((r) => r.json())
      .then(setAllCharacters);
  }, [id]);

  const handleSave = async () => {
    if (!char) return;
    setSaving(true);
    await fetch(`/api/characters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(char),
    });
    setSaving(false);
    setToast("保存しました");
    setTimeout(() => setToast(""), 2000);
  };

  const updateChar = useCallback(
    (updates: Partial<Character>) => {
      setChar((prev) => (prev ? { ...prev, ...updates } : prev));
    },
    []
  );

  if (!char) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  const bloodRelations = char.bloodRelations || [];

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="btn btn-ghost btn-sm">
          ← 一覧
        </Link>
        <h1 className="text-xl font-bold flex-1">
          キャラクター編集 - {char.id}
        </h1>
        <button
          className={`btn btn-primary btn-sm ${saving ? "loading" : ""}`}
          onClick={handleSave}
          disabled={saving}
        >
          保存
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Sprite selection & Face rect */}
        <div className="w-full lg:w-auto space-y-4">
          <div className="card bg-base-200 p-4">
            <h2 className="font-semibold mb-2">スプライトシート</h2>
            <select
              className="select select-bordered select-sm w-full mb-3"
              value={char.imageInfo.sprite.url}
              onChange={(e) =>
                updateChar({
                  imageInfo: {
                    ...char.imageInfo,
                    sprite: { ...char.imageInfo.sprite, url: e.target.value },
                  },
                })
              }
            >
              <option value="">-- 選択 --</option>
              {sheets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <SpriteGrid
              sheetUrl={char.imageInfo.sprite.url}
              selectedX={char.imageInfo.sprite.x}
              selectedY={char.imageInfo.sprite.y}
              onSelect={(x, y) =>
                updateChar({
                  imageInfo: {
                    ...char.imageInfo,
                    sprite: { ...char.imageInfo.sprite, x, y },
                  },
                })
              }
            />
          </div>

          <div className="card bg-base-200 p-4">
            <h2 className="font-semibold mb-2">顔エリア設定</h2>
            <FaceRectEditor
              sheetUrl={char.imageInfo.sprite.url}
              spriteX={char.imageInfo.sprite.x}
              spriteY={char.imageInfo.sprite.y}
              faceRect={char.imageInfo.faceRect}
              onFaceRectChange={(faceRect) =>
                updateChar({
                  imageInfo: { ...char.imageInfo, faceRect },
                })
              }
            />
          </div>
        </div>

        {/* Right: Character data form */}
        <div className="flex-1 space-y-4">
          <div className="card bg-base-200 p-4">
            <h2 className="font-semibold mb-3">基本情報</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">ID</label>
                <input
                  className="input input-bordered input-sm w-full"
                  value={char.id}
                  disabled
                />
              </div>
              <div>
                <label className="label text-xs">名前</label>
                <input
                  className="input input-bordered input-sm w-full"
                  value={char.name}
                  onChange={(e) => updateChar({ name: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-xs">タイプ</label>
                <select
                  className="select select-bordered select-sm w-full"
                  value={char.type}
                  onChange={(e) => updateChar({ type: e.target.value })}
                >
                  {CHARACTER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CHARACTER_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">性別</label>
                <select
                  className="select select-bordered select-sm w-full"
                  value={char.gender || ""}
                  onChange={(e) =>
                    updateChar({
                      gender: (e.target.value || undefined) as Character["gender"],
                    })
                  }
                >
                  <option value="">未設定</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 p-4">
            <h2 className="font-semibold mb-3">能力値</h2>
            <div className="space-y-2">
              {(
                [
                  ["politics", "政治"],
                  ["intelligence", "知力"],
                  ["leadership", "統率"],
                  ["strength", "武力"],
                  ["charm", "魅力"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <span className="w-10">{label}</span>
                  <input
                    type="range"
                    className="range range-xs range-accent flex-1"
                    min={0}
                    max={100}
                    value={char[key]}
                    onChange={(e) =>
                      updateChar({ [key]: Number(e.target.value) })
                    }
                  />
                  <input
                    type="number"
                    className="input input-bordered input-xs w-16 text-right"
                    min={0}
                    max={100}
                    value={char[key]}
                    onChange={(e) =>
                      updateChar({ [key]: Number(e.target.value) })
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="card bg-base-200 p-4">
            <h2 className="font-semibold mb-3">所属</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">所属都市</label>
                <select
                  className="select select-bordered select-sm w-full"
                  value={char.belongTo || ""}
                  onChange={(e) =>
                    updateChar({ belongTo: e.target.value || null })
                  }
                >
                  <option value="">(なし)</option>
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">所属派閥</label>
                <select
                  className="select select-bordered select-sm w-full"
                  value={char.belongToFaction || ""}
                  onChange={(e) =>
                    updateChar({ belongToFaction: e.target.value || null })
                  }
                >
                  <option value="">(なし)</option>
                  {FACTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 p-4">
            <h2 className="font-semibold mb-3">傭兵情報</h2>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={!!char.mercenaryInfo}
                onChange={(e) =>
                  updateChar({
                    mercenaryInfo: e.target.checked
                      ? { name: "", fee: 1000 }
                      : null,
                  })
                }
              />
              <span className="text-sm">傭兵として設定</span>
            </label>
            {char.mercenaryInfo && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">傭兵名</label>
                  <input
                    className="input input-bordered input-sm w-full"
                    value={char.mercenaryInfo.name}
                    onChange={(e) =>
                      updateChar({
                        mercenaryInfo: {
                          ...char.mercenaryInfo!,
                          name: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label text-xs">報酬</label>
                  <input
                    type="number"
                    className="input input-bordered input-sm w-full"
                    value={char.mercenaryInfo.fee}
                    onChange={(e) =>
                      updateChar({
                        mercenaryInfo: {
                          ...char.mercenaryInfo!,
                          fee: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="card bg-base-200 p-4">
            <h2 className="font-semibold mb-3">血縁関係</h2>
            {bloodRelations.map((rel, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <select
                  className="select select-bordered select-xs"
                  value={rel.relation}
                  onChange={(e) => {
                    const newRels = [...bloodRelations];
                    newRels[i] = {
                      ...newRels[i],
                      relation: e.target.value as BloodRelation["relation"],
                    };
                    updateChar({ bloodRelations: newRels });
                  }}
                >
                  {BLOOD_RELATION_TYPES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <select
                  className="select select-bordered select-xs flex-1"
                  value={rel.characterId}
                  onChange={(e) => {
                    const newRels = [...bloodRelations];
                    newRels[i] = { ...newRels[i], characterId: e.target.value };
                    updateChar({ bloodRelations: newRels });
                  }}
                >
                  <option value="">-- キャラ選択 --</option>
                  {allCharacters
                    .filter((c) => c.id !== char.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} - {c.name}
                      </option>
                    ))}
                </select>
                <button
                  className="btn btn-xs btn-error btn-outline"
                  type="button"
                  onClick={() => {
                    const newRels = bloodRelations.filter((_, j) => j !== i);
                    updateChar({
                      bloodRelations: newRels.length > 0 ? newRels : null,
                    });
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="btn btn-xs btn-outline mt-1"
              type="button"
              onClick={() =>
                updateChar({
                  bloodRelations: [
                    ...bloodRelations,
                    { relation: "father", characterId: "" },
                  ],
                })
              }
            >
              + 追加
            </button>
          </div>

          <div className="card bg-base-200 p-4">
            <h2 className="font-semibold mb-3">略歴</h2>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={4}
              value={char.biography || ""}
              onChange={(e) =>
                updateChar({ biography: e.target.value || undefined })
              }
            />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast toast-end">
          <div className="alert alert-success">
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
