#!/usr/bin/env node
/**
 * SVG → Optimized SVG + React Component generator
 *
 * Reads   src/assets/map/map_overlay.svg
 * Writes  src/assets/map/map_overlay_optimized.svg
 *         src/map/components/MapOverlay.tsx
 *         src/map/components/MapOverlay.css
 *
 * Usage:  npm run generate:map-overlay
 */

import { readFileSync, writeFileSync } from 'node:fs';

const SVG_INPUT  = 'src/assets/map/map_overlay.svg';
const SVG_OUTPUT = 'src/assets/map/map_overlay_optimized.svg';
const TSX_OUTPUT = 'src/map/components/MapOverlay.tsx';
const CSS_OUTPUT = 'src/map/components/MapOverlay.css';

const svg = readFileSync(SVG_INPUT, 'utf-8');

// ────────────────────────────────────────────────────────────────
// Parse route data  (<path id="P???-P???" .../>)
// ────────────────────────────────────────────────────────────────
const routeRe = /<path\s+id="(P\d{3}-P\d{3})"\s+class="[^"]*"\s+d="([^"]*)"\s*\/>/g;
const routes = [];
let m;
while ((m = routeRe.exec(svg)) !== null) {
  routes.push({ id: m[1], d: m[2] });
}

// ────────────────────────────────────────────────────────────────
// Parse place data  (<g id="P???"> ... <image .../> ...)
// ────────────────────────────────────────────────────────────────
const placeRe =
  /<g\s+id="(P\d{3})">\s*<g[^>]*>\s*<image[^>]*?width="(\d+)"[^>]*?height="(\d+)"[^>]*?transform="translate\(([\d.]+)\s+([\d.]+)\)\s*scale\(([\d.]+)\)"[^>]*?xlink:href="([^"]*)"[^>]*?\/>\s*<\/g>\s*<\/g>/g;
const places = [];
while ((m = placeRe.exec(svg)) !== null) {
  const w  = parseInt(m[2], 10);
  const h  = parseInt(m[3], 10);
  const tx = parseFloat(m[4]);
  const ty = parseFloat(m[5]);
  const s  = parseFloat(m[6]);
  places.push({
    id: m[1],
    w, h,
    centerX: +(tx + (w * s) / 2).toFixed(1),
    centerY: +(ty + (h * s) / 2).toFixed(1),
    scale: s,
    href: m[7],
  });
}

console.log(`Parsed ${routes.length} routes, ${places.length} places`);

// ────────────────────────────────────────────────────────────────
// 1. Write optimized SVG
//    • Single shared <filter id="outer-glow">
//    • g#bg removed
//    • clip-path classes removed, inner wrapper <g> removed
//    • All route classes unified to ".route"
// ────────────────────────────────────────────────────────────────
const optRoutes = routes
  .map((r) => `    <path id="${r.id}" class="route" d="${r.d}"/>`)
  .join('\n');

const optPlaces = places
  .map((p) => {
    const halfW = +((p.w * p.scale) / 2).toFixed(1);
    const halfH = +((p.h * p.scale) / 2).toFixed(1);
    return [
      `    <g id="${p.id}" transform="translate(${p.centerX}, ${p.centerY})">`,
      `      <image width="${p.w}" height="${p.h}" transform="translate(${-halfW}, ${-halfH}) scale(${p.scale})" xlink:href="${p.href}"/>`,
      `    </g>`,
    ].join('\n');
  })
  .join('\n');

const optSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 8192 8192">
  <defs>
    <filter id="outer-glow">
      <feOffset dx="0" dy="0"/>
      <feGaussianBlur result="blur" stdDeviation="10"/>
      <feFlood flood-color="#000" flood-opacity="1"/>
      <feComposite in2="blur" operator="in"/>
      <feComposite in="SourceGraphic"/>
    </filter>
    <style>
      .route {
        fill: none;
        stroke: #afdfb3;
        stroke-miterlimit: 10;
        stroke-width: 20px;
        filter: url(#outer-glow);
      }
    </style>
  </defs>
  <g id="roads">
${optRoutes}
  </g>
  <g id="places">
${optPlaces}
  </g>
</svg>
`;

writeFileSync(SVG_OUTPUT, optSvg, 'utf-8');
console.log(`Written: ${SVG_OUTPUT}`);

// ────────────────────────────────────────────────────────────────
// 2. Write CSS
// ────────────────────────────────────────────────────────────────
const css = `/* Auto-generated from map_overlay.svg – do not edit manually */
/* Regenerate with: npm run generate:map-overlay */

.map-overlay .route {
  fill: none;
  stroke: #afdfb3;
  stroke-miterlimit: 10;
  stroke-width: 20px;
  filter: url(#map-overlay-glow);
  transition: stroke 0.3s ease;
}

.map-overlay .route.active {
  stroke: #ffd700;
}
`;

writeFileSync(CSS_OUTPUT, css, 'utf-8');
console.log(`Written: ${CSS_OUTPUT}`);

// ────────────────────────────────────────────────────────────────
// 3. Write React component (MapOverlay.tsx)
// ────────────────────────────────────────────────────────────────

// Serialise data arrays as TypeScript source
const routesSrc = routes
  .map((r) => `  { id: ${JSON.stringify(r.id)}, d: ${JSON.stringify(r.d)} },`)
  .join('\n');

const placesSrc = places
  .map(
    (p) =>
      `  { id: ${JSON.stringify(p.id)}, cx: ${p.centerX}, cy: ${p.centerY}, s: ${p.scale}, w: ${p.w}, h: ${p.h}, href: ${JSON.stringify(p.href)} },`,
  )
  .join('\n');

// Build TSX source using plain strings to avoid template-literal escaping issues
const tsxParts = [];

tsxParts.push(`// Auto-generated from map_overlay.svg – do not edit manually
// Regenerate with: npm run generate:map-overlay

import type { CSSProperties } from 'react';
import './MapOverlay.css';

// ── Types ──────────────────────────────────────────────────────

/** Per-place configuration passed from game state */
export interface PlaceConfig {
  /** Override the default image source (absolute or imported URL) */
  imageSrc?: string;
  /** Scale multiplier applied on top of the default scale (1 = original size) */
  imageScale?: number;
  /** Emblem to render near the place */
  emblem?: {
    src: string;
    size?: number;
    offsetX?: number;
    offsetY?: number;
  };
}

export interface MapOverlayProps {
  /** Route IDs to visually highlight (e.g. "P001-P002") */
  activeRoutes?: ReadonlySet<string> | readonly string[];
  /** Per-place overrides keyed by place ID (e.g. "P000") */
  places?: Readonly<Record<string, PlaceConfig>>;
  className?: string;
  style?: CSSProperties;
}

// ── Static data extracted from SVG ─────────────────────────────

interface RouteData { id: string; d: string }
interface PlaceData {
  id: string; cx: number; cy: number;
  s: number; w: number; h: number; href: string;
}

const ROUTES: RouteData[] = [
${routesSrc}
];

const PLACES: PlaceData[] = [
${placesSrc}
];
`);

// assetUrl helper – uses Vite's import.meta.url pattern
tsxParts.push(`/** Resolve an asset filename relative to src/assets/map/ */`);
tsxParts.push('function assetUrl(filename: string): string {');
tsxParts.push('  return new URL(`../../assets/map/${filename}`, import.meta.url).href;');
tsxParts.push('}');
tsxParts.push('');

// Component body
tsxParts.push(`// ── Component ──────────────────────────────────────────────────

export default function MapOverlay({
  activeRoutes,
  places: placeConfigs,
  className,
  style,
}: MapOverlayProps) {
  const activeSet =
    activeRoutes instanceof Set
      ? (activeRoutes as ReadonlySet<string>)
      : new Set(activeRoutes);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 8192 8192"
      className={\`map-overlay\${className ? \` \${className}\` : ''}\`}
      style={style}
    >
      <defs>
        <filter id="map-overlay-glow">
          <feOffset dx="0" dy="0" />
          <feGaussianBlur result="blur" stdDeviation="10" />
          <feFlood floodColor="#000" floodOpacity="1" />
          <feComposite in2="blur" operator="in" />
          <feComposite in="SourceGraphic" />
        </filter>
      </defs>

      <g id="roads">
        {ROUTES.map(({ id, d }) => (
          <path
            key={id}
            id={id}
            className={\`route\${activeSet.has(id) ? ' active' : ''}\`}
            d={d}
          />
        ))}
      </g>

      <g id="places">
        {PLACES.map((place) => {
          const config = placeConfigs?.[place.id];
          const scale = place.s * (config?.imageScale ?? 1);
          const halfW = (place.w * scale) / 2;
          const halfH = (place.h * scale) / 2;
          const href = config?.imageSrc ?? assetUrl(place.href);
          const emblem = config?.emblem;

          return (
            <g
              key={place.id}
              id={place.id}
              transform={\`translate(\${place.cx}, \${place.cy})\`}
            >
              <image
                width={place.w}
                height={place.h}
                href={href}
                transform={\`translate(\${-halfW}, \${-halfH}) scale(\${scale})\`}
              />
              {emblem && (
                <image
                  href={emblem.src}
                  width={emblem.size ?? 64}
                  height={emblem.size ?? 64}
                  x={(emblem.offsetX ?? 0) - (emblem.size ?? 64) / 2}
                  y={(emblem.offsetY ?? 0) - (emblem.size ?? 64) / 2}
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
`);

const tsx = tsxParts.join('\n');
writeFileSync(TSX_OUTPUT, tsx, 'utf-8');
console.log(`Written: ${TSX_OUTPUT}`);

console.log('\nDone! Generated files:');
console.log(`  • ${SVG_OUTPUT}`);
console.log(`  • ${CSS_OUTPUT}`);
console.log(`  • ${TSX_OUTPUT}`);
