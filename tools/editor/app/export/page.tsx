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
  webpPath: string;
  characterCount: number;
  webpSize: string;
  imageSize: string;
}

interface Progress {
  step: number;
  totalSteps: number;
  message: string;
}

export default function ExportPage() {
  const [info, setInfo] = useState<ExportInfo | null>(null);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/export")
      .then((r) => r.json())
      .then(setInfo);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setResult(null);
    setError(null);
    setProgress({ step: 0, totalSteps: 1, message: "開始中..." });

    try {
      const res = await fetch("/api/export", { method: "POST" });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.type === "progress") {
            setProgress({ step: msg.step, totalSteps: msg.totalSteps, message: msg.message });
          } else if (msg.type === "done") {
            setResult(msg as ExportResult);
            setProgress(null);
          } else if (msg.type === "error") {
            setError(msg.message);
            setProgress(null);
          }
        }
      }
    } catch (err) {
      setError(String(err));
      setProgress(null);
    } finally {
      setExporting(false);
    }
  };

  const progressPercent = progress ? Math.round((progress.step / progress.totalSteps) * 100) : 0;

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

          {progress && (
            <div className="card bg-base-200 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.message}</span>
                <span>{progressPercent}%</span>
              </div>
              <progress
                className="progress progress-primary w-full"
                value={progress.step}
                max={progress.totalSteps}
              />
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="alert alert-success">
              <div>
                <p>エクスポート完了</p>
                <p className="text-sm opacity-80">
                  {result.characterCount} キャラクター出力
                </p>
                <p className="text-sm opacity-80">
                  WebP: {result.webpSize} ({result.imageSize}) → {result.webpPath}
                </p>
                <p className="text-sm opacity-80">
                  JSON → {result.jsonPath}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
