# Feasibility export redesign — state

**Target:** `docs/design/atrium-feasibility-export-redesign.html` (Jamie's Claude
build — 13 sections, silver-glass, chrome band `#0d1420`, tokens in `:root`).

## Done (this pass)
Shared PDF theme in `src/lib/exporters.ts` retargeted to the redesign tokens:
- Accent: gold `[196,151,58]` → silver `[138,151,166]` (the `GOLD` const carries
  the silver value; every rule caller follows).
- Cover band: black → chrome `#0d1420`; subtitle → `--chrome-dim`.
- Ink `#1a1a1a` → `--ink #232c37`; secondary → `--ink-2`; warm paper cards →
  cool `--card-2 #f6f8fb`; all hairlines to the cool line colours.
- autoTable: chrome head `[13,20,32]`, cool grid lines, `#f6f8fb` banding.
- Excel `INK` → `#232C37`.
Verified: 16-section PDF generates.

## Not done
- Section-level layout to match the target's 13 named sections (Feasibility
  position, Area schedule, … Where the money goes) — current PDF keeps its own
  section structure, only re-inked.
- Excel styling beyond the ink colour.
- **PDF size**: ~1.9MB for 16 sections and ~1.4MB for ONE section — the fixed
  overhead dominates, almost certainly the rasterised brand logo / wave texture
  (`loadBrandLogo` / `drawWaveTexture`). Pre-existing, not from the palette diff
  (53 changed lines, colours only). Worth fixing before styling further: find
  why the embedded image is that heavy, target well under 1MB total.

## Traps
- `exporters.ts` line ~490 had a pre-existing TS error (`block.title` on the
  Block union) — fixed with an `'title' in block` guard. Vite does NOT typecheck;
  run `npx tsc --noEmit --ignoreDeprecations 6.0`.
- The export panel starts with ALL sections ticked now — do not regress that
  (empty-start was the "export is broken" bug).
