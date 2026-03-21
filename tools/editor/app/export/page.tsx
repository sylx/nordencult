"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ExportInfo {
  totalCharacters: number;
  totalSheets: number;
  missingSheets: string[];
  noSpriteCharacters: { id: string; name: string }[];
}

interface ExportResult {
  ok: boolean;
  jsonPath: string;
  characterCount: number;
}

export default function ExportPage() {
  const [info, setInfo] = useState<ExportInfo | null>(null);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);

  useEffect(() => {
    fetch("/api/export")
      .then((r) => r.json())
      .then(setInfo);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    const res = await fetch("/api/export", { method: "POST" });
    const data = await res.json();
    setResult(data);
    setExporting(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="btn btn-ghost btn-sm">
          ← 一覧
        </Link>
        <h1 className="text-xl font-bold">アセットエクスポート</h1>
      </div>

      {!info ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">キャラクター数</div>
              <div className="stat-value text-2xl">{info.totalCharacters}</div>
            </div>
            <div className="stat">
              <div className="stat-title">スプライトシート数</div>
              <div className="stat-value text-2xl">{info.totalSheets}</div>
            </div>
          </div>

          {info.missingSheets.length > 0 && (
            <div className="alert alert-warning">
              <span>
                見つからないシート: {info.missingSheets.join(", ")}
              </span>
            </div>
          )}

          {info.noSpriteCharacters.length > 0 && (
            <div className="alert alert-info">
              <span>
                スプライト未設定 (除外されます):{" "}
                {info.noSpriteCharacters.map((c) => `${c.id}:${c.name}`).join(", ")}
              </span>
            </div>
          )}

          <div className="card bg-base-200 p-4">
            <p className="text-sm mb-3">
              characterData.json をエクスポートします。座標は50%スケールで計算されます。
            </p>
            <button
              className={`btn btn-primary ${exporting ? "loading" : ""}`}
              onClick={handleExport}
              disabled={exporting}
            >
              エクスポート実行
            </button>
          </div>

          {result && (
            <div className="alert alert-success">
              <div>
                <p>エクスポート完了</p>
                <p className="text-sm opacity-80">
                  {result.characterCount} キャラクターを出力しました → {result.jsonPath}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
