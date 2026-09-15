import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * ATRIUM ZEROED — Daniel's feasibility model, running in isolation.
 *
 * public/atrium-zeroed.html is his file, byte for byte, plus one appended
 * bridge block. Everything here is the shell around it: projects, naming and
 * saving. None of it lives inside his page, so his layout and his engine stay
 * exactly as he built them while he develops the model.
 *
 * Storage — one row PER PROJECT, not one row for everything.
 *   atrium_zeroed_index   { activeId, projects:[{id,name,created,updated}] }
 *   atrium_zeroed:<id>    { model }
 * A model is ~50KB. Held in a single row, every keystroke-blur would rewrite
 * every project Daniel owns, and two people editing different projects would
 * overwrite each other wholesale. Per-project rows mean a save touches only
 * the project in front of you, and the index stays small enough to be free.
 *
 * Sealed off from the 7EVEN studio: its own rows, its own ids, and it never
 * reads or writes the studio's project store.
 */

const IDX_KEY = 'atrium_zeroed_index'
const rowKey = (id: string) => `atrium_zeroed:${id}`
const SRC = '/atrium-zeroed.html?v=14'

type Meta = { id: string; name: string; created: string; updated: string }
type Index = { v: 1; activeId: string | null; projects: Meta[] }

const newId = () => 'z_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o))

type SaveState = 'idle' | 'saving' | 'saved' | 'offline'

/* The cloud pill. Daniel needs to be able to glance up and know the row went
   to Supabase — a static word doesn't tell you that, so the dot pulses gold
   while a write is in flight and the whole pill flashes green as it lands. */
const PILL_CSS = `
@keyframes azDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.18;transform:scale(.55)} }
@keyframes azFlash {
  0%   { background:rgba(47,224,122,.30); box-shadow:0 0 0 0 rgba(47,224,122,.55), 0 0 24px 2px rgba(47,224,122,.65) }
  100% { background:rgba(47,224,122,.07); box-shadow:0 0 0 11px rgba(47,224,122,0), 0 0 0 0 rgba(47,224,122,0) }
}
.az-pill{display:inline-flex;align-items:center;gap:7px;height:22px;padding:0 11px;border-radius:11px;
  font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;
  border:1px solid;cursor:pointer;user-select:none;white-space:nowrap;transition:border-color .2s}
.az-pill .az-dot{width:6px;height:6px;border-radius:50%;flex:none;background:currentColor;box-shadow:0 0 7px currentColor}
.az-pill .az-t{opacity:.6;letter-spacing:.08em}
.az-idle{color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.3);background:transparent}
.az-saving{color:#D6B36A;border-color:rgba(214,179,106,.52);background:rgba(214,179,106,.10)}
.az-saving .az-dot{animation:azDot .7s ease-in-out infinite}
.az-saved{color:#2FE07A;border-color:rgba(47,224,122,.42);background:rgba(47,224,122,.07);
  animation:azFlash .95s cubic-bezier(.2,.7,.3,1)}
.az-offline{color:#E05555;border-color:rgba(224,85,85,.52);background:rgba(224,85,85,.10)}
.az-offline .az-dot{animation:azDot .5s steps(1,end) infinite}
`

/* The shell (Jamie, 11 Sep): the flat HAAVN grey ground, and ONE floating
   island in a right angle — header across the top, nav down the left — with
   the 7EVEN main-page video behind it, dimmed and vignetted exactly as the
   home page. The shell's controls are the island's top row. The iframe sits
   over the island: Daniel's top bar (the second row) and his nav are drawn
   see-through, and his working area is the grey panel tucked into the inside
   corner, so the video shows only in the L. Buttons, dropdown and pill are the
   main menu's clear glass: no fill, a thin light outline, a soft glow on
   hover; the title is lit gold like the menu's lit row. The project dropdown
   opens as see-through frosted glass over the engine. */
const ISLAND_TOP = 10, ROW = 46
const SHELL_CSS = `
.azs{position:fixed;inset:0;z-index:9500;background:#d7d4ce}
.azs-isle{position:absolute;top:${ISLAND_TOP}px;left:12px;right:12px;bottom:10px;border-radius:12px;overflow:hidden;
  background:#0a0b0c;border:1px solid rgba(255,255,255,.16);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 18px 34px -20px rgba(0,0,0,.7)}
.azs-isle video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.azs-dim{position:absolute;inset:0;pointer-events:none;background:rgba(0,0,0,.56)}
.azs-vign{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 42%, transparent 40%, rgba(0,0,0,.55) 100%)}
.azs-hl{position:absolute;left:18px;right:18px;top:${ROW}px;height:1px;background:rgba(255,255,255,.14);pointer-events:none}
.azs-bar{position:absolute;top:${ISLAND_TOP}px;left:12px;right:12px;height:${ROW}px;z-index:2;padding:0 18px;
  display:flex;align-items:center;gap:8px}
.azs-btn{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.22em;text-transform:uppercase;
  color:rgba(255,255,255,.82);background:transparent;border:1px solid rgba(255,255,255,.32);border-radius:2px;
  padding:7px 12px;cursor:pointer;transition:.25s}
.azs-btn:hover{color:#fff;border-color:rgba(255,255,255,.75);background:rgba(255,255,255,.08);box-shadow:0 0 26px -12px rgba(255,255,255,.5)}
.azs-dd{position:relative}
.azs-sel{display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:'Inter',system-ui,sans-serif;font-size:11.5px;
  color:#fff;background:transparent;border:1px solid rgba(255,255,255,.3);border-radius:2px;padding:6px 10px;
  min-width:200px;max-width:300px;cursor:pointer;transition:.25s;text-align:left}
.azs-sel span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.azs-sel i{font-style:normal;font-size:8px;opacity:.7;transition:transform .25s}
.azs-sel:hover,.azs-sel.open{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.65);box-shadow:0 0 24px -10px rgba(255,255,255,.45)}
.azs-sel.open i{transform:rotate(180deg)}
.azs-menu{position:absolute;top:calc(100% + 8px);left:0;min-width:100%;max-width:360px;max-height:60vh;overflow-y:auto;z-index:20;
  padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.22);
  background:rgba(14,15,17,.38);-webkit-backdrop-filter:blur(18px) saturate(1.25);backdrop-filter:blur(18px) saturate(1.25);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 22px 44px -18px rgba(0,0,0,.75);animation:azsIn .18s ease-out}
@keyframes azsIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.azs-menu button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;margin:0 0 6px;padding:9px 12px;cursor:pointer;
  font-family:'Inter',system-ui,sans-serif;font-size:11.5px;color:rgba(255,255,255,.9);white-space:nowrap;
  background:transparent;border:1px solid rgba(255,255,255,.26);border-radius:2px;transition:.25s;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.azs-menu button:last-child{margin-bottom:0}
.azs-menu button:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.65);box-shadow:0 0 24px -10px rgba(255,255,255,.45)}
.azs-menu button.on{color:#fff;background:rgba(214,179,106,.06);border-color:#d6b36a;
  box-shadow:0 0 9px rgba(244,227,189,.5),0 0 22px rgba(214,179,106,.3),inset 0 0 9px rgba(214,179,106,.22)}
.azs-menu button b{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:400;font-size:8.5px;letter-spacing:.2em;color:rgba(255,255,255,.45)}
.azs-menu button.on b{color:#d6b36a}
.azs-t{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9.5px;letter-spacing:.26em;text-transform:uppercase;
  color:#d6b36a;padding:7px 13px;border:1px solid #d6b36a;border-radius:2px;background:rgba(214,179,106,.05);
  text-shadow:0 0 8px rgba(244,227,189,.9),0 0 20px rgba(214,179,106,.6);
  box-shadow:0 0 9px rgba(244,227,189,.55),0 0 26px rgba(214,179,106,.35),inset 0 0 9px rgba(214,179,106,.24)}
.azs-dv{width:1px;height:18px;background:rgba(255,255,255,.22);margin:0 4px}
.azs-note{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.45)}
.azs.max .azs-bar,.azs.max .azs-isle{display:none}
.azs.max .azs-frame{top:0;height:100%;z-index:40}
.azs-frame{position:absolute;top:${ISLAND_TOP + ROW}px;left:0;right:0;bottom:0;width:100%;height:calc(100% - ${ISLAND_TOP + ROW}px);
  z-index:1;border:0;display:block;background:transparent;color-scheme:light}
`

/* The ATRIUM menu (Jamie, 14 Sep) — the 7EVEN home page's burger and menu,
   brought into the engine's header. Two gold fins that part into a split
   chevron X; the menu drops from under them over the home-page video, rows
   in the main menu's clear glass: Projects, Export feasibility, Log out. */
const NAV_CSS = `
.azs-burger{position:relative;width:40px;height:40px;margin-left:4px;display:flex;align-items:center;justify-content:center;gap:12px;
  border:0;background:transparent;cursor:pointer;padding:0;flex:none}
.azs-burger span{display:block;width:2px;height:20px;border-radius:1px;transition:.3s;
  background:linear-gradient(180deg,transparent 0%,rgba(214,179,106,.75) 7%,#d6b36a 50%,rgba(214,179,106,.75) 93%,transparent 100%);
  filter:brightness(1.3) drop-shadow(0 0 9px rgba(244,227,189,.95)) drop-shadow(0 0 22px rgba(214,179,106,.85))}
.azs-burger:hover span{filter:brightness(1.55) drop-shadow(0 0 9px rgba(244,227,189,.95)) drop-shadow(0 0 26px rgba(214,179,106,.9))}
.azs-burger.on span{opacity:0}
.azs-burger.on::before,.azs-burger.on::after{content:'';position:absolute;top:50%;width:12px;height:20px;transform:translateY(-50%);background:#d6b36a;
  filter:brightness(1.3) drop-shadow(0 0 9px rgba(244,227,189,.95)) drop-shadow(0 0 22px rgba(214,179,106,.85))}
.azs-burger.on::before{left:8px;clip-path:polygon(0 0,23% 0,100% 50%,23% 100%,0 100%,77% 50%)}
.azs-burger.on::after{right:8px;clip-path:polygon(100% 0,77% 0,0 50%,77% 100%,100% 100%,23% 50%)}

.azn{position:absolute;top:calc(100% + 8px);right:0;width:410px;max-height:calc(100vh - 90px);z-index:30;border-radius:12px;overflow:hidden;
  border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 30px 60px -24px rgba(0,0,0,.85);
  opacity:0;transform:translateY(-10px);pointer-events:none;transition:.32s cubic-bezier(.2,.7,.3,1);background:#0a0b0c}
.azn.on{opacity:1;transform:none;pointer-events:auto}
.azn video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.azn .azn-dim{position:absolute;inset:0;background:rgba(0,0,0,.62)}
.azn .azn-vign{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 42%,transparent 40%,rgba(0,0,0,.55) 100%)}
.azn-in{position:relative;max-height:calc(100vh - 92px);overflow-y:auto;padding:6px 18px 18px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent}
.azn-mh{display:flex;justify-content:space-between;align-items:center;padding:12px 2px;border-bottom:1px solid rgba(255,255,255,.16);
  font-family:'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.3em;color:#d6d9dd;text-transform:uppercase;text-shadow:0 1px 8px rgba(0,0,0,.9)}
.azn-row{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;margin-top:12px;padding:13px 16px;cursor:pointer;text-align:left;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.3);border-radius:2px;transition:.3s;color:#f0eff0}
.azn-row:hover,.azn-row.open{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.65);box-shadow:0 0 24px -10px rgba(255,255,255,.45)}
.azn-row .t{font-family:'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.3em;text-transform:uppercase}
.azn-row .s{font-family:'Inter',system-ui,sans-serif;font-size:11px;color:#a9a6a9;margin-top:4px;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}
.azn-row .g{color:#d6d9dd;font-size:12px;flex:none}
.azn-row.gold{background:rgba(214,179,106,.05);border-color:#d6b36a;color:#f4e3bd;
  box-shadow:0 0 9px rgba(244,227,189,.5),0 0 22px rgba(214,179,106,.32),inset 0 0 9px rgba(214,179,106,.22)}
.azn-row.gold:hover{background:rgba(214,179,106,.12)}
.azn-sub{padding:10px 2px 2px}
.azn-new{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;cursor:pointer;font-family:'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace;
  font-size:9px;letter-spacing:.22em;color:#2fe07a;border:1px solid rgba(47,224,122,.4);border-radius:2px;padding:9px 12px;background:rgba(47,224,122,.05);transition:.25s;text-transform:uppercase}
.azn-new:hover{background:rgba(47,224,122,.14);color:#eafff2}
.azn-plist{margin-top:6px;max-height:280px;overflow-y:auto}
.azn-prow{display:flex;align-items:center;gap:12px;padding:12px 4px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.1);transition:.22s;text-shadow:0 1px 8px rgba(0,0,0,.9)}
.azn-prow:hover{border-bottom-color:rgba(47,224,122,.55)}
.azn-prow .n{font-family:'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace;font-size:9px;color:rgba(255,255,255,.35);width:16px;flex:none}
.azn-prow .nm{flex:1;min-width:0;font-family:'Inter',system-ui,sans-serif;font-size:13px;font-weight:600;color:#f0eff0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.azn-prow .d{font-family:'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace;font-size:8.5px;letter-spacing:.12em;color:#8a8f95;flex:none}
.azn-prow.on .nm{color:#f4e3bd;text-shadow:0 0 10px rgba(214,179,106,.45)}
.azn-prow .open{font-family:'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace;font-size:8px;letter-spacing:.2em;color:#d6b36a;border:1px solid rgba(214,179,106,.6);border-radius:2px;padding:3px 7px;flex:none}
.azn-prow:hover .nm{color:#fff}
.azn-lbl{display:flex;justify-content:space-between;align-items:center;font-family:'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace;font-size:8.5px;letter-spacing:.24em;color:#a9a6a9;text-transform:uppercase;margin:4px 2px 8px}
.azn-lbl button{background:none;border:0;color:#d6d9dd;font:inherit;letter-spacing:.2em;cursor:pointer;padding:2px 4px}
.azn-lbl button:hover{color:#fff}
.azn-tab{display:flex;align-items:center;gap:12px;width:100%;padding:9px 12px;margin-bottom:6px;cursor:pointer;border:1px solid rgba(255,255,255,.2);border-radius:2px;
  background:transparent;color:#d6d9dd;transition:.22s;text-align:left}
.azn-tab:hover{border-color:rgba(255,255,255,.55);background:rgba(255,255,255,.05)}
.azn-tab .bx{width:14px;height:14px;border:1px solid rgba(255,255,255,.5);border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#0a0b0c;flex:none}
.azn-tab.on{border-color:rgba(214,179,106,.7);color:#fff}
.azn-tab.on .bx{background:#d6b36a;border-color:#d6b36a}
.azn-tab .n{font-family:'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace;font-size:9px;color:rgba(255,255,255,.45);width:18px}
.azn-tab.on .n{color:#d6b36a}
.azn-tab .l{font-family:'Inter',system-ui,sans-serif;font-size:12px}
.azn-note{font-family:'Inter',system-ui,sans-serif;font-size:10.5px;line-height:1.5;color:#8a8f95;margin:8px 2px 12px}
.azn-go{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.azn-go .azn-row{margin-top:0;justify-content:center;padding:12px}
.azn-go .azn-row[disabled]{opacity:.4;cursor:not-allowed;box-shadow:none}
.azn-out{display:flex;align-items:center;justify-content:center;width:100%;margin-top:16px;padding:12px 16px;cursor:pointer;
  font-family:'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#b9bdc4;
  background:transparent;border:1px solid rgba(255,255,255,.22);border-radius:2px;transition:.3s}
.azn-out:hover{border-color:rgba(224,100,92,.7);color:#fff;background:rgba(224,100,92,.08)}
`

const TAB_NAMES = ['Land & Terms', 'Revenue', 'Cost', 'Finance', 'Cash Flow', 'Program', 'Dashboard']

type Extracted = {
  meta: { name: string; address: string; date: string; grv: number; tdc: number; profit: number | null; checks: string; tabs: string[] }
  sheets: { name: string; rows: string[][] }[]
}

/** A displayed figure → an Excel cell: $ amounts, bracketed negatives, commas
    and percentages become real numbers with a matching format; anything else
    (dates, "—", "$22.4M", words) stays exactly as shown. */
function toCell(raw: string): { t: 'n' | 's'; v: number | string; z?: string } | null {
  const t = (raw ?? '').trim()
  if (!t) return null
  let m = t.match(/^\((-|−)?\$?([\d,]+(?:\.\d+)?)\)$|^(-|−)?\$?([\d,]+(?:\.\d+)?)$/)
  if (m) {
    const digits = m[2] ?? m[4]
    if (/^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$/.test(digits)) {
      let n = Number(digits.replace(/,/g, ''))
      if (t.startsWith('(') || m[1] || m[3]) n = -n
      const dec = (digits.split('.')[1] || '').length
      const base = '#,##0' + (dec ? '.' + '0'.repeat(dec) : '')
      return { t: 'n', v: n, z: t.includes('$') ? `$${base};($${base})` : base }
    }
  }
  m = t.match(/^(-|−)?([\d,]*\.?\d+)%$/)
  if (m) {
    const dec = (m[2].split('.')[1] || '').length
    return { t: 'n', v: (m[1] ? -1 : 1) * Number(m[2].replace(/,/g, '')) / 100, z: '0' + (dec ? '.' + '0'.repeat(dec) : '') + '%' }
  }
  return { t: 's', v: t }
}

async function writeWorkbook(data: Extracted) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const sheet = (rows: (string | number | null)[][], widths: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows.map(r => r.map(c => (c == null ? '' : c))))
    ws['!cols'] = widths.map(wch => ({ wch }))
    return ws
  }
  const m = data.meta
  const money = (n: number | null) => (n == null ? 'held' : n)
  const cover = sheet([
    ['ATRIUM ENGINE — DEVELOPMENT FEASIBILITY'],
    [],
    ['Project', m.name],
    ['Address', m.address || '—'],
    ['Exported', m.date],
    [],
    ['GRV', money(m.grv)],
    ['All-in TDC', money(m.tdc)],
    ['Profit', money(m.profit)],
    ['Checks', m.checks],
    [],
    ['Tabs included'],
    ...m.tabs.map(t => ['', t]),
    [],
    ['Developer & data owner', '7EVEN Capital'],
    ['Confidential — figures are estimates prepared for feasibility purposes only.'],
  ], [26, 48])
  for (const r of [7, 8, 9]) {
    const c = cover[`B${r}`]; if (c && typeof c.v === 'number') { c.v = Math.round(c.v); c.z = '$#,##0;($#,##0)' }
  }
  XLSX.utils.book_append_sheet(wb, cover, 'Cover')

  for (const s of data.sheets) {
    const width = Math.max(1, ...s.rows.map(r => r.length))
    const ws = XLSX.utils.aoa_to_sheet([[]])
    s.rows.forEach((row, ri) => row.forEach((raw, ci) => {
      const cell = toCell(raw)
      if (cell) ws[XLSX.utils.encode_cell({ r: ri, c: ci })] = cell
    }))
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, s.rows.length - 1), c: width - 1 } })
    ws['!cols'] = [{ wch: 46 }, ...Array.from({ length: width - 1 }, () => ({ wch: 17 }))]
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31))
  }

  XLSX.utils.book_append_sheet(wb, sheet([
    ['7EVEN CAPITAL'],
    [],
    ['Office', 'Level 1, Suite 2, 20–30 Mollison Street, Abbotsford VIC 3067'],
    ['Email', 'reception@7even.au'],
    ['Phone', '03 9962 2877'],
    ['Web', '7even.au'],
    [],
    ['CONFIDENTIAL — This document and the information within it are strictly private and confidential, prepared solely for the intended recipient. 7EVEN Capital is the developer and sole owner of this data. It must not be reproduced, distributed or disclosed, in whole or in part, without the prior written consent of 7EVEN Capital. Figures are estimates prepared for feasibility purposes only and do not constitute financial advice or an offer of securities.'],
    [],
    [`© ${new Date().getFullYear()} 7EVEN Capital. All rights reserved. · ATRIUM Engine`],
  ], [16, 70]), '7EVEN Capital')

  const day = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${(m.name || 'Feasibility').replace(/[\\/:*?"<>|]/g, '')} — ATRIUM Engine feasibility ${day}.xlsx`)
}

const PILL: Record<SaveState, { cls: string; label: string }> = {
  idle:    { cls: 'az-idle',    label: 'Cloud · standby' },
  saving:  { cls: 'az-saving',  label: 'Saving to cloud' },
  saved:   { cls: 'az-saved',   label: 'Cloud saved' },
  offline: { cls: 'az-offline', label: 'Offline · device only' },
}

export default function AtriumZeroed({ onClose, onLogout }: { onClose: () => void; onLogout?: () => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [index, setIndex] = useState<Index>({ v: 1, activeId: null, projects: [] })
  const [save, setSave] = useState<SaveState>('idle')
  const [ready, setReady] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [writes, setWrites] = useState(0)   // also re-keys the pill so the flash replays

  // The blank model the page ships with, captured from its first message, so
  // "New" always starts from Daniel's own template.
  const blank = useRef<unknown>(null)
  // The model currently on screen, kept out of React state — it changes on
  // every recalculation and re-rendering the shell for that would be waste.
  const model = useRef<unknown>(null)
  const idxRef = useRef(index); idxRef.current = index
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef(false)
  const [menu, setMenu] = useState(false)   // the glass project dropdown
  const [nav, setNav] = useState(false)     // the ATRIUM burger menu
  const [navSec, setNavSec] = useState<'projects' | 'export' | null>(null)
  const [tabs, setTabs] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [busy, setBusy] = useState<'' | 'pdf' | 'xlsx'>('')
  const [max, setMax] = useState(false)     // the engine's Full screen button
  const navRef = useRef<HTMLDivElement | null>(null)

  /** A row actually landed in Supabase. `stamp` is false on boot, where the
      state is "already saved" but no write of ours produced it. */
  const markSaved = useCallback((stamp = true) => {
    setSave('saved')
    if (stamp) { setSavedAt(new Date()); setWrites(n => n + 1) }
  }, [])

  const writeIndex = useCallback(async (ix: Index) => {
    try { localStorage.setItem(IDX_KEY, JSON.stringify(ix)) } catch { /* private mode */ }
    const { error } = await supabase.from('capital_kv')
      .upsert({ key: IDX_KEY, value: ix, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw error
  }, [])

  const writeModel = useCallback(async (id: string, m: unknown, keepalive = false) => {
    try { localStorage.setItem(rowKey(id), JSON.stringify(m)) } catch { /* quota */ }
    if (keepalive) {
      // On the way out there is no time for the SDK's retries — one shot,
      // flagged keepalive so the browser finishes it after the page is gone.
      const url = (supabase as unknown as { supabaseUrl: string }).supabaseUrl
      const key = (supabase as unknown as { supabaseKey: string }).supabaseKey
      await fetch(`${url}/rest/v1/capital_kv`, {
        method: 'POST', keepalive: true,
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
                   Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ key: rowKey(id), value: m, updated_at: new Date().toISOString() }]),
      })
      return
    }
    const { error } = await supabase.from('capital_kv')
      .upsert({ key: rowKey(id), value: m, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw error
  }, [])

  const flush = useCallback(async (keepalive = false) => {
    const ix = idxRef.current
    if (!ix.activeId || !pending.current) return
    pending.current = false
    try {
      await writeModel(ix.activeId, model.current, keepalive)
      markSaved()
    } catch (err) {
      console.warn('[zeroed] save', err)
      pending.current = true
      setSave('offline')
    }
  }, [writeModel, markSaved])

  /** Writes are debounced — the model recalculates on every field change. */
  const queue = useCallback(() => {
    pending.current = true
    setSave('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), 800)
  }, [flush])

  const send = useCallback((m: unknown) => {
    model.current = m
    frame.current?.contentWindow?.postMessage({ atriumZeroed: 'load', model: m }, '*')
  }, [])

  // ── the page talks back: 'ready' once, then 'model' on every recalculation ──
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = (e.data || {}) as { atriumZeroed?: string; model?: unknown }
      if (d.atriumZeroed === 'ready') { blank.current = d.model; setReady(true); return }
      if (d.atriumZeroed === 'extracted') {
        writeWorkbook((d as unknown as { data: Extracted }).data)
          .catch(err => { console.warn('[engine] excel', err); alert('Could not write the Excel file.') })
          .finally(() => setBusy(''))
        return
      }
      if (d.atriumZeroed === 'exported') { setBusy(''); return }
      if (d.atriumZeroed === 'maximize') { setMax(!!(d as { on?: boolean }).on); setMenu(false); setNav(false); return }
      if (d.atriumZeroed !== 'model' || !d.model) return
      model.current = d.model
      if (idxRef.current.activeId) queue()
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [queue])

  // ── closing the tab must not cost the last edit ────────────────────────────
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void flush(true) }
    window.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', () => void flush(true))
    return () => {
      window.removeEventListener('visibilitychange', onHide)
      if (timer.current) clearTimeout(timer.current)
      void flush()                       // and not on the way back to BASE either
    }
  }, [flush])

  const openProject = useCallback(async (meta: Meta) => {
    let m: unknown = null
    try {
      const { data } = await supabase.from('capital_kv').select('value').eq('key', rowKey(meta.id)).maybeSingle()
      m = data?.value ?? null
    } catch { /* fall through to local */ }
    if (!m) { try { m = JSON.parse(localStorage.getItem(rowKey(meta.id)) || 'null') } catch { /* ignore */ } }
    send(m ?? clone(blank.current))
  }, [send])

  // ── boot, once the page has handed us its blank model ─────────────────────
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    ;(async () => {
      let ix: Index | null = null
      try {
        const { data, error } = await supabase.from('capital_kv').select('value').eq('key', IDX_KEY).maybeSingle()
        if (error) throw error
        ix = (data?.value as Index) ?? null
      } catch (err) {
        console.warn('[zeroed] index', err)
        try { ix = JSON.parse(localStorage.getItem(IDX_KEY) || 'null') } catch { /* ignore */ }
        setSave('offline')
      }
      if (cancelled) return

      if (!ix?.projects?.length) {
        const meta: Meta = { id: newId(), name: 'Project 1', created: new Date().toISOString(), updated: new Date().toISOString() }
        const fresh: Index = { v: 1, activeId: meta.id, projects: [meta] }
        setIndex(fresh)
        model.current = clone(blank.current)
        try { await writeIndex(fresh); await writeModel(meta.id, model.current); markSaved() }
        catch { setSave('offline') }
        return                                   // the page already shows a blank model
      }
      if (!ix.projects.some(p => p.id === ix!.activeId)) ix.activeId = ix.projects[0].id
      /* Mirror the list we just pulled. Without this the offline fallback has
         models but no index, and a disconnected browser would show a fresh
         "Project 1" instead of the projects that actually exist. */
      try { localStorage.setItem(IDX_KEY, JSON.stringify(ix)) } catch { /* private mode */ }
      setIndex(ix)
      markSaved(false)                     // already in the cloud, but not by us
      await openProject(ix.projects.find(p => p.id === ix!.activeId)!)
    })()
    return () => { cancelled = true }
  }, [ready, writeIndex, writeModel, openProject, markSaved])

  const active = index.projects.find(p => p.id === index.activeId) || null

  /* The page's header title reads the project name from here (the address it
     reads from its own Land & Terms). A display-only message — it never
     triggers a recalculation, so it never causes a save. */
  const activeName = active?.name ?? ''

  /* The burger menu closes on Escape, a click anywhere else, or a click into
     the engine (which reaches us as the window losing focus). */
  useEffect(() => {
    if (!nav) return
    const close = () => setNav(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onDown = (e: PointerEvent) => { if (navRef.current && !navRef.current.contains(e.target as Node)) close() }
    window.addEventListener('blur', close); window.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('blur', close); window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown) }
  }, [nav])

  useEffect(() => {
    if (!max) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMax(false)
      frame.current?.contentWindow?.postMessage({ atriumZeroed: 'maximize', on: false }, '*')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [max])

  const exportAs = (kind: 'pdf' | 'xlsx') => {
    if (!tabs.length || busy) return
    setBusy(kind)
    setNav(false)
    frame.current?.contentWindow?.postMessage({ atriumZeroed: 'export', kind, tabs, name: activeName }, '*')
    setTimeout(() => setBusy(b => (b === kind ? '' : b)), 20000)   // never stick
  }
  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage({ atriumZeroed: 'meta', name: activeName }, '*')
  }, [ready, activeName])

  /* Close the dropdown on Escape, or on any click — including one inside the
     engine, which lands in the iframe and shows up here as the window blurring. */
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('blur', close); window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', close)
    return () => { window.removeEventListener('blur', close); window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', close) }
  }, [menu])

  const commitIndex = (ix: Index) => {
    setIndex(ix)
    writeIndex(ix).catch(err => { console.warn('[zeroed] index', err); setSave('offline') })
  }

  const switchTo = async (id: string) => {
    const meta = index.projects.find(x => x.id === id)
    if (!meta || id === index.activeId) return
    await flush()                                  // never leave the old one half-saved
    commitIndex({ ...index, activeId: id })
    await openProject(meta)
  }
  const create = async (name: string, m: unknown) => {
    await flush()
    const meta: Meta = { id: newId(), name, created: new Date().toISOString(), updated: new Date().toISOString() }
    commitIndex({ ...index, activeId: meta.id, projects: [...index.projects, meta] })
    model.current = clone(m)
    send(model.current)
    try { await writeModel(meta.id, model.current); markSaved() } catch { setSave('offline') }
  }
  const onNew = () => { const n = prompt('Name the project:', 'New Project'); if (n !== null) void create(n.trim() || 'New Project', blank.current) }
  const onDup = () => { if (!active) return; const n = prompt('Name the copy:', active.name + ' (copy)'); if (n !== null) void create(n.trim() || active.name + ' (copy)', model.current) }
  const onRename = () => {
    if (!active) return
    const n = prompt('Rename project:', active.name); if (n === null) return
    commitIndex({ ...index, projects: index.projects.map(p => p.id === active.id ? { ...p, name: n.trim() || p.name, updated: new Date().toISOString() } : p) })
  }
  const onDelete = async () => {
    if (!active) return
    if (index.projects.length < 2) { alert('This is the only project. Create another before deleting this one.'); return }
    if (!confirm(`Delete "${active.name}"?\n\nThis removes it for everyone and cannot be undone.`)) return
    pending.current = false
    const rest = index.projects.filter(p => p.id !== active.id)
    commitIndex({ ...index, activeId: rest[0].id, projects: rest })
    supabase.from('capital_kv').delete().eq('key', rowKey(active.id))
      .then(({ error }) => { if (error) console.warn('[zeroed] delete', error.message) })
    try { localStorage.removeItem(rowKey(active.id)) } catch { /* ignore */ }
    await openProject(rest[0])
  }

  const pill = PILL[save]
  const stamp = savedAt ? savedAt.toLocaleTimeString('en-AU', { hour12: false }) : ''
  const pillTitle = save === 'offline'
    ? 'Supabase is unreachable. Your work is held on this device and will be pushed on the next successful save. Click to retry now.'
    : `Supabase · capital_kv · ${index.activeId ? rowKey(index.activeId) : '—'}`
      + (savedAt ? `\nLast write ${stamp} · ${writes} this session` : '')
      + '\nClick to save now.'

  return (
    <div className={`azs${max ? ' max' : ''}`}>
      <style>{SHELL_CSS + PILL_CSS + NAV_CSS}</style>
      {/* The island: the home-page video runs behind the header and the nav. */}
      <div className="azs-isle" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="metadata" src="/haavn-black-bg.mp4" />
        <div className="azs-dim" />
        <div className="azs-vign" />
        <div className="azs-hl" />
      </div>
      {/* Shell chrome. Everything about projects lives up here so Daniel's own
          topbar stays exactly as he designed it. */}
      <div className="no-drag azs-bar">
        <button className="azs-btn" onClick={() => { void flush(); onClose() }}>← Base</button>
        <span className="azs-t">Atrium Engine</span>
        <span className="azs-dv" />
        <div className="azs-dd" onPointerDown={e => e.stopPropagation()}>
          <button className={`azs-sel${menu ? ' open' : ''}`} onClick={() => setMenu(m => !m)}
                  aria-haspopup="listbox" aria-expanded={menu}>
            <span>{active?.name ?? '—'}</span><i>▼</i>
          </button>
          {menu && (
            <div className="azs-menu" role="listbox">
              {index.projects.map((p, n) => (
                <button key={p.id} role="option" aria-selected={p.id === index.activeId}
                        className={p.id === index.activeId ? 'on' : ''}
                        onClick={() => { setMenu(false); void switchTo(p.id) }}>
                  <b>{String(n + 1).padStart(2, '0')}</b>{p.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="azs-btn" onClick={onNew}>+ New</button>
        <button className="azs-btn" onClick={onDup}>Duplicate</button>
        <button className="azs-btn" onClick={onRename}>Rename</button>
        <button className="azs-btn" onClick={() => void onDelete()}>Delete</button>
        <span style={{ flex: 1 }} />
        <span className="azs-note">separate engine · own data · 7EVEN studio untouched</span>
        {/* Remounted on every write so the flash animation replays. */}
        <div key={`${save}-${writes}`} className={`az-pill ${pill.cls}`} title={pillTitle}
             onClick={() => { pending.current = true; void flush() }}>
          <span className="az-dot" />
          <span>{pill.label}</span>
          {save === 'saved' && stamp && <span className="az-t">{stamp}</span>}
        </div>
        <div ref={navRef} style={{ position: 'relative', display: 'flex' }}>
          <button className={`azs-burger${nav ? ' on' : ''}`} aria-label="ATRIUM menu" aria-expanded={nav}
                  onClick={() => setNav(v => !v)}>
            <span /><span />
          </button>
          <div className={`azn${nav ? ' on' : ''}`} role="menu">
            {nav && <video autoPlay muted loop playsInline preload="metadata" src="/haavn-black-bg.mp4" />}
            <div className="azn-dim" /><div className="azn-vign" />
            <div className="azn-in">
              <div className="azn-mh"><span>ATRIUM Engine · Menu</span><span>{index.projects.length} projects</span></div>

              <button className={`azn-row${navSec === 'projects' ? ' open' : ''}`} onClick={() => setNavSec(v => v === 'projects' ? null : 'projects')}>
                <span><div className="t">Projects</div><div className="s">{active ? `Open · ${active.name}` : 'No project open'}</div></span>
                <span className="g">{navSec === 'projects' ? '▾' : '▸'}</span>
              </button>
              {navSec === 'projects' && (
                <div className="azn-sub">
                  <button className="azn-new" onClick={() => { setNav(false); onNew() }}>+ New feasibility — start a new project</button>
                  <div className="azn-plist">
                    {index.projects.map((p, n) => (
                      <div key={p.id} className={`azn-prow${p.id === index.activeId ? ' on' : ''}`}
                           onClick={() => { setNav(false); void switchTo(p.id) }}>
                        <span className="n">{String(n + 1).padStart(2, '0')}</span>
                        <span className="nm">{p.name}</span>
                        {p.id === index.activeId
                          ? <span className="open">OPEN</span>
                          : <span className="d">{new Date(p.updated).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className={`azn-row${navSec === 'export' ? ' open' : ''}`} onClick={() => setNavSec(v => v === 'export' ? null : 'export')}>
                <span><div className="t">Export feasibility</div><div className="s">PDF or Excel · choose the tabs</div></span>
                <span className="g">{navSec === 'export' ? '▾' : '▸'}</span>
              </button>
              {navSec === 'export' && (
                <div className="azn-sub">
                  <div className="azn-lbl">
                    <span>Tabs · {tabs.length} of 7</span>
                    <span><button onClick={() => setTabs([0, 1, 2, 3, 4, 5, 6])}>All</button> · <button onClick={() => setTabs([])}>None</button></span>
                  </div>
                  {TAB_NAMES.map((t, i) => {
                    const on = tabs.includes(i)
                    return (
                      <button key={t} className={`azn-tab${on ? ' on' : ''}`}
                              onClick={() => setTabs(v => on ? v.filter(x => x !== i) : [...v, i].sort((a, b) => a - b))}>
                        <span className="bx">{on ? '✓' : ''}</span><span className="n">{String(i + 1).padStart(2, '0')}</span><span className="l">{t}</span>
                      </button>
                    )
                  })}
                  <div className="azn-note">Exports the tabs exactly as they are on screen, between a 7EVEN cover sheet and the 7EVEN company page.</div>
                  <div className="azn-go">
                    <button className="azn-row gold" disabled={!tabs.length || !!busy} onClick={() => exportAs('pdf')}>
                      <span className="t">{busy === 'pdf' ? 'Preparing…' : '↧ PDF'}</span>
                    </button>
                    <button className="azn-row" disabled={!tabs.length || !!busy} onClick={() => exportAs('xlsx')}>
                      <span className="t">{busy === 'xlsx' ? 'Preparing…' : '↧ Excel'}</span>
                    </button>
                  </div>
                </div>
              )}

              {onLogout && (
                <button className="azn-out" onClick={() => { setNav(false); void flush().finally(() => onLogout()) }}>Log out</button>
              )}
            </div>
          </div>
        </div>
      </div>
      <iframe ref={frame} src={SRC} title="ATRIUM Engine" className="azs-frame" />
    </div>
  )
}
