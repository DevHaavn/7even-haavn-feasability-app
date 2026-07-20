// ── Project export — PDF & Excel writers ─────────────────────────────────────
// Styling is deliberately monochrome: black header with the brand mark,
// black section bars, grey grid tables — crisp print-ready output.
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Section, Block, BarsBlock, CurveBlock } from './exportData'

const INK = '#232C37'   // --ink from the export redesign
// Redesign (docs/design/atrium-feasibility-export-redesign.html): the accent is
// SILVER (--silver #8a97a6), not gold — gold is retired across ATRIUM.
const GOLD: [number, number, number] = [138, 151, 166]

/** Fine faded gold rule — the app's signature divider, simulated with
 *  colour-blended segments (transparent → gold 30–70% → transparent). */
function goldRuleH(doc: jsPDF, x1: number, x2: number, y: number, bg: [number, number, number] = [255, 255, 255], weight = 0.8) {
  const segs = 48
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs
    const t1 = (i + 1) / segs
    const mid = (t0 + t1) / 2
    const a = mid < 0.3 ? mid / 0.3 : mid > 0.7 ? (1 - mid) / 0.3 : 1
    doc.setDrawColor(
      Math.round(GOLD[0] * a + bg[0] * (1 - a)),
      Math.round(GOLD[1] * a + bg[1] * (1 - a)),
      Math.round(GOLD[2] * a + bg[2] * (1 - a)),
    )
    doc.setLineWidth(weight)
    doc.line(x1 + (x2 - x1) * t0, y, x1 + (x2 - x1) * t1, y)
  }
}

function goldRuleV(doc: jsPDF, x: number, y1: number, y2: number, bg: [number, number, number] = [255, 255, 255], weight = 1.4) {
  const segs = 18
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs
    const t1 = (i + 1) / segs
    const mid = (t0 + t1) / 2
    const a = mid < 0.25 ? mid / 0.25 : mid > 0.75 ? (1 - mid) / 0.25 : 1
    doc.setDrawColor(
      Math.round(GOLD[0] * a + bg[0] * (1 - a)),
      Math.round(GOLD[1] * a + bg[1] * (1 - a)),
      Math.round(GOLD[2] * a + bg[2] * (1 - a)),
    )
    doc.setLineWidth(weight)
    doc.line(x, y1 + (y2 - y1) * t0, x, y1 + (y2 - y1) * t1)
  }
}

/** Crisp vector particle-wave texture — flowing rows of tiny dots on black,
 *  echoing the app's shimmer backdrop. Pure vector, sharp at any zoom.
 *  `intensity` scales dot brightness (0–1). */
function drawWaveTexture(doc: jsPDF, x: number, y: number, w: number, h: number, intensity: number) {
  // Deterministic pseudo-random so every export looks identical
  const rand = (n: number) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
    return s - Math.floor(s)
  }
  const rows = Math.max(6, Math.round(h / 22))
  const cols = Math.max(28, Math.round(w / 16))
  let k = 0
  for (let iy = 0; iy <= rows; iy++) {
    const tv = iy / rows
    const baseY = y + tv * h
    const amp = h * 0.10 * (0.5 + 0.5 * Math.sin(tv * Math.PI))
    for (let ix = 0; ix <= cols; ix++) {
      k++
      const u = ix / cols
      const wave = Math.sin(u * Math.PI * 4 + tv * 5.2) * (0.45 + 0.55 * Math.sin(u * Math.PI * 2 + tv * 2.6))
      const dy = baseY + amp * wave
      if (dy < y + 1.5 || dy > y + h - 1.5) continue
      // Brightness follows the wave crest with organic sparkle
      const crest = Math.pow(Math.max(0, Math.sin(u * Math.PI * 4 + tv * 5.2 + Math.PI / 2)), 2)
      const sparkle = rand(k) > 0.965 ? 1 : 0
      const b = Math.min(255, Math.round((40 + 165 * crest + 120 * sparkle) * intensity + 18))
      if (b < 32) continue
      doc.setFillColor(b, b, Math.min(255, b + 4))
      const r = 0.32 + 0.55 * crest + (sparkle ? 0.35 : 0) + 0.12 * rand(k * 3.7)
      doc.circle(x + u * w + (rand(k * 1.3) - 0.5) * 3.5, dy + (rand(k * 2.1) - 0.5) * 2.5, r, 'F')
    }
  }
}

function fileStamp(projectName: string) {
  const date = new Date().toISOString().slice(0, 10)
  const safe = projectName.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-')
  return `${safe}-Export-${date}`
}

/** Load the brand PNG used across the app as a data URL for jsPDF. */
async function loadBrandLogo(): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch('/winged-device-white.png')
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = reject
      fr.readAsDataURL(blob)
    })
    const dims = await new Promise<{ w: number; h: number }>(resolve => {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.src = dataUrl
    })
    return { dataUrl, ...dims }
  } catch {
    return null
  }
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export async function exportPdf(projectName: string, address: string, sections: Section[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 48
  const logo = await loadBrandLogo()

  // Cover header — ATRIUM chrome band (--chrome #0d1420), per the redesign
  doc.setFillColor(13, 20, 32)
  doc.rect(0, 0, pageW, 128, 'F')
  drawWaveTexture(doc, 0, 0, pageW, 128, 0.55)
  if (logo) {
    const logoW = 96
    const logoH = logoW * (logo.h / logo.w)
    doc.addImage(logo.dataUrl, 'PNG', margin, 24, logoW, logoH)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(255, 255, 255)
    doc.text('C  A  P  I  T  A  L', margin + logoW / 2, 24 + logoH + 10, { align: 'center' })
  } else {
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('7EVEN | HAAVN', margin, 50)
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text('D E V E L O P M E N T   F E A S I B I L I T Y   S T U D I O', pageW - margin, 40, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(projectName, margin, 100)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(147, 160, 173)   // --chrome-dim
  const dateStr = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`${address ? address + '  ·  ' : ''}Exported ${dateStr}  ·  Confidential`, margin, 115)

  // Signature gold rule under the cover band — mirrors the app's hero divider
  goldRuleH(doc, 0, pageW, 129.5, [255, 255, 255], 1.2)

  let y = 158

  const ensureRoom = (needed: number) => {
    if (y + needed > pageH - 64) {
      doc.addPage()
      y = 56
    }
  }

  const hexRgb = (hex: string): [number, number, number] => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [35, 44, 55]
  }

  const drawBars = (block: BarsBlock) => {
    const items = block.items
    if (items.length === 0) return
    const rowH = 20
    const labelW = 170
    const valueW = 82
    const chartW = pageW - margin * 2 - labelW - valueW
    const maxAbs = Math.max(...items.map(i => Math.abs(i.value)), 1)

    ensureRoom(items.length * rowH + 34)
    if (block.title) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(35, 44, 55)
      doc.text(block.title.toUpperCase(), margin, y + 10)
      y += 18
    }
    for (const item of items) {
      ensureRoom(rowH + 8)
      const barLen = Math.max(2, (Math.abs(item.value) / maxAbs) * chartW)
      const neg = item.value < 0
      // Label
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(91, 102, 114)
      const label = item.label.length > 42 ? item.label.slice(0, 41) + '…' : item.label
      doc.text(label, margin, y + 12)
      // Bar — data keeps its colour; negative values render red
      const [cr, cg, cb] = neg ? [155, 35, 53] : hexRgb(item.color ?? '#1A1A1A')
      doc.setFillColor(cr, cg, cb)
      doc.rect(margin + labelW, y + 4, barLen, 11, 'F')
      // Value
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(35, 44, 55)
      doc.text(`${neg ? '−' : ''}$${Math.round(Math.abs(item.value)).toLocaleString()}`, pageW - margin, y + 12, { align: 'right' })
      y += rowH
    }
    y += 14
  }

  const drawCurve = (block: CurveBlock) => {
    const chartH = 170
    const labelW = 46
    const chartW = pageW - margin * 2 - labelW - 8
    ensureRoom(chartH + 78)
    if (block.title) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(35, 44, 55)
      doc.text(block.title.toUpperCase(), margin, y + 10)
      y += 18
    }
    const x0 = margin + labelW
    const y0 = y + 4
    const fmtM = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(0)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${Math.round(n)}`
    const px = (m: number) => x0 + (m / block.xMax) * chartW
    const py = (c: number) => y0 + chartH - Math.max(0, Math.min(1, c / block.yMax)) * chartH

    // Background + grid
    doc.setFillColor(246, 248, 251)
    doc.rect(x0, y0, chartW, chartH, 'F')
    doc.setDrawColor(222, 227, 234)
    doc.setLineWidth(0.5)
    const tdcVal = block.yMax / 1.12
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const gy = py(f * tdcVal)
      doc.line(x0, gy, x0 + chartW, gy)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(133, 146, 160)
      doc.text(fmtM(f * tdcVal), x0 - 4, gy + 2, { align: 'right' })
    }
    for (let m = 0; m <= block.xMax; m += 6) {
      doc.setDrawColor(228, 232, 238)
      doc.line(px(m), y0, px(m), y0 + chartH)
      doc.setFontSize(6)
      doc.setTextColor(133, 146, 160)
      doc.text(`m${m}`, px(m), y0 + chartH + 10, { align: 'center' })
    }
    // Phase divider
    if (block.dividerX) {
      doc.setDrawColor(180, 190, 201)
      doc.setLineDashPattern([3, 3], 0)
      doc.line(px(block.dividerX), y0, px(block.dividerX), y0 + chartH)
      doc.setLineDashPattern([], 0)
      if (block.dividerLabels) {
        doc.setFontSize(5.5)
        doc.setTextColor(131, 145, 160)
        doc.text(block.dividerLabels[0], x0 + 4, y0 + 10)
        doc.text(block.dividerLabels[1], px(block.dividerX) + 4, y0 + 10)
      }
    }
    // Completion marker
    if (block.completionX) {
      doc.setDrawColor(216, 208, 180)
      doc.setLineDashPattern([2, 3], 0)
      doc.line(px(block.completionX), y0, px(block.completionX), y0 + chartH)
      doc.setLineDashPattern([], 0)
    }
    // Series — data keeps colour
    for (const s of block.series) {
      const [cr, cg, cb] = hexRgb(s.color)
      doc.setDrawColor(cr, cg, cb)
      doc.setLineWidth(s.dash ? 1 : 1.6)
      doc.setLineDashPattern(s.dash ? [4, 3] : [], 0)
      for (let i = 1; i < s.points.length; i++) {
        doc.line(px(s.points[i - 1].x), py(s.points[i - 1].y), px(s.points[i].x), py(s.points[i].y))
      }
      doc.setLineDashPattern([], 0)
      const last = s.points[s.points.length - 1]
      if (!s.dash) {
        doc.setFillColor(cr, cg, cb)
        doc.circle(px(last.x), py(last.y), 2.2, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.5)
        doc.setTextColor(cr, cg, cb)
        doc.text(fmtM(last.y), px(last.x) - 4, py(last.y) - 6, { align: 'right' })
      }
    }
    // Axes
    doc.setDrawColor(190, 188, 184)
    doc.setLineWidth(0.75)
    doc.line(x0, y0, x0, y0 + chartH)
    doc.line(x0, y0 + chartH, x0 + chartW, y0 + chartH)
    // Legend
    let lx = x0
    const ly = y0 + chartH + 24
    for (const s of block.series) {
      const [cr, cg, cb] = hexRgb(s.color)
      doc.setDrawColor(cr, cg, cb)
      doc.setLineWidth(s.dash ? 1 : 1.8)
      doc.setLineDashPattern(s.dash ? [3, 2] : [], 0)
      doc.line(lx, ly - 2, lx + 16, ly - 2)
      doc.setLineDashPattern([], 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(91, 102, 114)
      doc.text(s.label, lx + 20, ly)
      lx += 24 + doc.getTextWidth(s.label) + 18
    }
    y = ly + 18
  }

  let firstSection = true
  for (const section of sections) {
    ensureRoom(84)
    // Editorial break between sections — the fine faded gold rule
    if (!firstSection) {
      goldRuleH(doc, margin - 8, pageW - margin + 8, y, [255, 255, 255], 0.8)
      y += 26
    }
    firstSection = false
    // Section heading — vertical faded gold accent
    goldRuleV(doc, margin + 1, y - 14, y + 5)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(section.title.toUpperCase(), margin + 10, y)
    y += 12

    for (const block of section.blocks) {
      if (block.type === 'note') {
        ensureRoom(28)
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        const lines = doc.splitTextToSize(block.text, pageW - margin * 2)
        doc.text(lines, margin, y + 12)
        y += 14 + lines.length * 10
        continue
      }
      if (block.type === 'bars') {
        drawBars(block)
        continue
      }
      if (block.type === 'curve') {
        drawCurve(block)
        continue
      }

      if (block.title) {
        ensureRoom(24)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(35, 44, 55)
        doc.text(block.title.toUpperCase(), margin, y + 10)
      }

      const head = block.type === 'table' ? [block.headers] : undefined
      const body = block.type === 'table'
        ? block.rows.map(r => r.map(String))
        : block.rows.map(([k, v]) => [k, v])

      autoTable(doc, {
        startY: y + (block.title ? 16 : 8),
        head,
        body,
        margin: { left: margin, right: margin },
        theme: 'grid',
        // Redesign: chrome table head, cool hairlines, faint blue-grey banding
        styles: { font: 'helvetica', fontSize: 8, textColor: INK, lineColor: [222, 227, 234], lineWidth: 0.5, cellPadding: 5 },
        headStyles: { fillColor: [13, 20, 32], textColor: [238, 242, 245], fontSize: 7.5, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [246, 248, 251] },
        columnStyles: block.type === 'kv'
          ? { 0: { textColor: [91, 102, 114] }, 1: { fontStyle: 'bold', halign: 'right' } }
          : {},
      })
      // @ts-expect-error jspdf-autotable attaches lastAutoTable
      y = (doc.lastAutoTable?.finalY ?? y) + 22
      if (y > pageH - 90) { doc.addPage(); y = 56 }
    }
    y += 8
  }

  // Footer on every page — faded gold rule, editorial running heads
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    // Running head on continuation pages
    if (i > 1) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(140, 140, 140)
      doc.text(projectName.toUpperCase(), margin, 30)
      doc.text('7EVEN | HAAVN — DEVELOPMENT FEASIBILITY STUDIO', pageW - margin, 30, { align: 'right' })
      goldRuleH(doc, margin - 8, pageW - margin + 8, 38, [255, 255, 255], 0.7)
    }
    goldRuleH(doc, margin - 8, pageW - margin + 8, pageH - 40, [255, 255, 255], 0.7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(120, 120, 120)
    doc.text(`7EVEN Capital · Confidential · ${projectName}`, margin, pageH - 28)
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 28, { align: 'right' })
    doc.setTextColor(160, 160, 160)
    doc.text(`Design & Interface © ${new Date().getFullYear()} JB Design × Studio · All Rights Reserved`, pageW / 2, pageH - 16, { align: 'center' })
  }

  // ── Closing page — full-bleed vector particle wave behind the content ──
  doc.addPage()
  doc.setFillColor(0, 0, 0)
  doc.rect(0, 0, pageW, pageH, 'F')
  drawWaveTexture(doc, 0, 0, pageW, pageH, 0.42)
  const cx = pageW / 2
  if (logo) {
    const wingsW = 190
    const wingsH = wingsW * (logo.h / logo.w)
    doc.addImage(logo.dataUrl, 'PNG', cx - wingsW / 2, pageH * 0.30 - wingsH / 2, wingsW, wingsH)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text('C  A  P  I  T  A  L', cx, pageH * 0.30 + wingsH / 2 + 16, { align: 'center' })
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(15)
  doc.setTextColor(240, 239, 237)
  doc.text('P R E C I S I O N   C A P I T A L   D E P L O Y E D', cx, pageH * 0.46, { align: 'center' })
  doc.setFontSize(11)
  doc.setTextColor(200, 200, 200)
  doc.text('Thank you.', cx, pageH * 0.46 + 26, { align: 'center' })

  // Divider — faded gold on black
  goldRuleH(doc, cx - 130, cx + 130, pageH * 0.54, [0, 0, 0], 1)

  // Confidentiality / privacy statement
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(133, 146, 160)
  const conf = 'CONFIDENTIAL — This document and the information contained within it are strictly private and confidential, prepared solely for the intended recipient. It must not be reproduced, distributed or disclosed, in whole or in part, without the prior written consent of 7EVEN Capital. Figures are estimates prepared for feasibility purposes only and do not constitute financial advice or an offer of securities.'
  const confLines = doc.splitTextToSize(conf, pageW - 160)
  doc.text(confLines, cx, pageH * 0.58, { align: 'center' })

  // Office details
  doc.setFontSize(8)
  doc.setTextColor(220, 220, 220)
  doc.text('7EVEN CAPITAL', cx, pageH - 128, { align: 'center' })
  doc.setFontSize(7.5)
  doc.setTextColor(170, 170, 170)
  doc.text('Level 1, Suite 2, 20-30 Mollison Street, Abbotsford, VIC 3067', cx, pageH - 114, { align: 'center' })
  doc.text('Office  03 9962 2877  ·  7even.au', cx, pageH - 101, { align: 'center' })

  // Copyright + design credit
  doc.setFontSize(6.5)
  doc.setTextColor(120, 120, 120)
  doc.text(`© ${new Date().getFullYear()} 7EVEN Capital. All rights reserved.`, cx, pageH - 66, { align: 'center' })
  doc.setTextColor(110, 110, 110)
  doc.text(`Design & Interface © ${new Date().getFullYear()} JB Design × Studio · All Rights Reserved`, cx, pageH - 54, { align: 'center' })

  doc.save(`${fileStamp(projectName)}.pdf`)
}

// ── Excel ─────────────────────────────────────────────────────────────────────

function blockToRows(block: Block): (string | number)[][] {
  if (block.type === 'note') return [[block.text]]
  if (block.type === 'kv') return block.rows.map(([k, v]) => [k, v])
  if (block.type === 'bars') return block.items.map(i => [i.label, Math.round(i.value)])
  if (block.type === 'curve') {
    const maxLen = Math.max(...block.series.map(s => s.points.length))
    const header = ['Month', ...block.series.map(s => s.label)]
    const rows: (string | number)[][] = [header]
    for (let i = 0; i < maxLen; i++) {
      rows.push([i, ...block.series.map(s => s.points[i] ? Math.round(s.points[i].y) : '')])
    }
    return rows
  }
  return [block.headers, ...block.rows]
}

export function exportExcel(projectName: string, address: string, sections: Section[]) {
  const wb = XLSX.utils.book_new()
  const usedNames = new Set<string>()

  for (const section of sections) {
    const aoa: (string | number)[][] = [
      ['7EVEN | HAAVN — Development Feasibility Studio'],
      [projectName + (address ? ` — ${address}` : '')],
      [section.title],
      [`Exported ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })} · Confidential`],
      [],
    ]
    for (const block of section.blocks) {
      if ('title' in block && block.title) aoa.push([block.title])
      aoa.push(...blockToRows(block))
      aoa.push([])
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const colWidths = aoa.reduce<number[]>((acc, row) => {
      row.forEach((cell, i) => { acc[i] = Math.max(acc[i] ?? 10, Math.min(String(cell ?? '').length + 2, 52)) })
      return acc
    }, [])
    ws['!cols'] = colWidths.map(wch => ({ wch }))

    let name = section.title.replace(/[\\/?*[\]:]/g, '·').slice(0, 31)
    let n = 2
    while (usedNames.has(name)) name = name.slice(0, 28) + ' ' + n++
    usedNames.add(name)
    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  XLSX.writeFile(wb, `${fileStamp(projectName)}.xlsx`)
}
