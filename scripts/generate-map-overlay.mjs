#!/usr/bin/env node
/**
 * SVG → Optimized SVG + route/place data generator
 *
 * Reads   src/assets/map/map_overlay.svg
 * Writes  src/assets/map/map_overlay_optimized.svg
 *         src/map/components/MapOvarlayPlaceRoute.tsx
 *
 * Usage:  npm run generate:map-overlay
 */

import { readFileSync, writeFileSync } from 'node:fs';

const SVG_INPUT  = 'src/assets/map/map_overlay.svg';
const SVG_OUTPUT = 'src/assets/map/map_overlay_optimized.svg';
const DATA_OUTPUT = 'src/map/components/MapOvarlayPlaceRoute.tsx';

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
// 2. Write route/place data module
// ────────────────────────────────────────────────────────────────

// Serialise data arrays as TypeScript source
const routesSrc = routes
  .map((r) => `  { id: ${JSON.stringify(r.id)}, d: ${JSON.stringify(r.d)} },`)
  .join('\n');

const placesSrc = places
  .map(
    (p) =>
      `  { id: ${JSON.stringify(p.id)}, cx: ${p.centerX}, cy: ${p.centerY}, s: 0.2 },`,
  )
  .join('\n');

const dataModule = `// Auto-generated from map_overlay.svg – do not edit manually
// Regenerate with: npm run generate:map-overlay

export interface RouteData {
  id: string;
  d: string;
}

export interface PlaceData {
  id: string;
  cx: number;
  cy: number;
  s: number;
}

export const ROUTES: RouteData[] = [
${routesSrc}
];

export const PLACES: PlaceData[] = [
${placesSrc}
];
`;

writeFileSync(DATA_OUTPUT, dataModule, 'utf-8');
console.log(`Written: ${DATA_OUTPUT}`);

console.log('\nDone! Generated files:');
console.log(`  • ${SVG_OUTPUT}`);
console.log(`  • ${DATA_OUTPUT}`);
