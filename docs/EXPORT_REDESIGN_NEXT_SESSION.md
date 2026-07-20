# Export Redesign — Next Session Handoff

**Status:** Palette only. Layout and structure NOT DONE.

Jamie provided the complete target design as `/Users/jamiebaldwin/Desktop/atrium-feasibility-export-redesign.html` (412KB, 13 named sections, print-ready). It is a pixel-perfect example of what the PDF and Excel exports should produce.

The previous session changed only color tokens in `src/lib/exporters.ts`:
- Gold `[196,151,58]` → silver `[138,151,166]`
- Black cover → chrome `#0d1420`
- Text inks/lines retargeted to the token set
- autoTable theme colors updated

**What's actually needed (this session):**

1. **Understand the target layout** — 13 sections with names:
   - Feasibility position
   - Area schedule
   - Acquisition
   - Unit schedule
   - Development cost
   - Itemised trades
   - Capital structure
   - Rental yield
   - Sell-down
   - Operator basis
   - Feasibility command
   - Strategy outcomes
   - Where the money goes

2. **Read the CSS** in the target file to understand:
   - Page/sheet structure (`.sheet`, `.cover`, `.sec`)
   - KPI card layout (`.kpis`, `.kc`, `.card`)
   - Table styling (`.tbl`, `.brow`, `.bt`)
   - Typography (--serif, --mono, --sans)
   - Spacing and geometry (gaps, padding, widths)
   - The light/dark toggle behavior

3. **Rebuild `src/lib/exporters.ts`**:
   - `exportPdf()`: restructure to match the 13 sections
   - Each section gets its own layout (kpis + table, or just table, etc.)
   - KPI cards: render the 4-card or 6-card layouts from the target
   - Tables: match the `.tbl` row/cell patterns
   - Cover page: match the `.cover` design (wings logo, title, metadata)
   - Page breaks and geometry to match the print layout

4. **Rebuild Excel export**:
   - Mirror the section-per-sheet or multi-sheet structure
   - Apply the same styling to autoTable calls
   - Match column widths and banding to the target

**Key files to study:**
- Target: `/Users/jamiebaldwin/Desktop/atrium-feasibility-export-redesign.html` — grep for `.sec`, `.kpis`, `.tbl` to see the patterns
- Current code: `src/lib/exporters.ts` — lines 1–520
- Current tests: vitest should still pass if PDF bytes are similar

**Starting point for next session:**
```bash
# Verify current palette is still in place
grep "GOLD.*138.*151.*166" src/lib/exporters.ts
# Verify the target file is in docs for reference
file docs/design/atrium-feasibility-export-redesign.html
```

**Do NOT**:
- Change the export data model (Section, Block types, etc.)
- Lose the 16-section export or break section order
- Remove the existing color palette work from this session

**The PDF size issue** (1.4MB pre-existing for one section) likely stems from rasterized brand logo or wave texture. Don't fix it before getting layout right, but note it as a potential blocker for email-ability. It's in `loadBrandLogo()` / `drawWaveTexture()` around line 115–150.

---
**Commit:** 6a7407e4 (palette only)
**Next:** Layout rebuild
