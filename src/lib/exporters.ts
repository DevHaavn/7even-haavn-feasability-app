// ── Project export — PDF & Excel writers ─────────────────────────────────────
// Styling is deliberately monochrome: black header with the brand mark,
// black section bars, grey grid tables — crisp print-ready output.
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Section, Block, BarsBlock } from './exportData'

const INK = '#1A1A1A'

function fileStamp(projectName: string) {
  const date = new Date().toISOString().slice(0, 10)
  const safe = projectName.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-')
  return `${safe}-Export-${date}`
}

/** Load the brand PNG used across the app as a data URL for jsPDF. */
async function loadBrandLogo(): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch('/brand-logo-white-tight.png')
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

  // Cover header — black band with the brand mark
  doc.setFillColor(0, 0, 0)
  doc.rect(0, 0, pageW, 128, 'F')
  if (logo) {
    const logoW = 92
    const logoH = logoW * (logo.h / logo.w)
    doc.addImage(logo.dataUrl, 'PNG', margin, 26, logoW, logoH)
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
  doc.setTextColor(190, 190, 190)
  const dateStr = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`${address ? address + '  ·  ' : ''}Exported ${dateStr}  ·  Confidential`, margin, 115)

  let y = 158

  const ensureRoom = (needed: number) => {
    if (y + needed > pageH - 64) {
      doc.addPage()
      y = 56
    }
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
      doc.setTextColor(26, 26, 26)
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
      doc.setTextColor(90, 90, 90)
      const label = item.label.length > 42 ? item.label.slice(0, 41) + '…' : item.label
      doc.text(label, margin, y + 12)
      // Bar — solid black for positive, outlined for negative
      if (neg) {
        doc.setDrawColor(26, 26, 26)
        doc.setLineWidth(0.75)
        doc.rect(margin + labelW, y + 4, barLen, 11)
      } else {
        doc.setFillColor(26, 26, 26)
        doc.rect(margin + labelW, y + 4, barLen, 11, 'F')
      }
      // Value
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(26, 26, 26)
      doc.text(`${neg ? '−' : ''}$${Math.round(Math.abs(item.value)).toLocaleString()}`, pageW - margin, y + 12, { align: 'right' })
      y += rowH
    }
    y += 14
  }

  for (const section of sections) {
    ensureRoom(60)
    // Section heading — black accent bar
    doc.setFillColor(0, 0, 0)
    doc.rect(margin, y - 11, 3, 14, 'F')
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

      if (block.title) {
        ensureRoom(24)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(26, 26, 26)
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
        styles: { font: 'helvetica', fontSize: 8, textColor: INK, lineColor: [220, 220, 220], lineWidth: 0.5, cellPadding: 5 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [246, 246, 246] },
        columnStyles: block.type === 'kv'
          ? { 0: { textColor: [105, 105, 105] }, 1: { fontStyle: 'bold', halign: 'right' } }
          : {},
      })
      // @ts-expect-error jspdf-autotable attaches lastAutoTable
      y = (doc.lastAutoTable?.finalY ?? y) + 22
      if (y > pageH - 90) { doc.addPage(); y = 56 }
    }
    y += 8
  }

  // Footer on every page — monochrome
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.5)
    doc.line(margin, pageH - 40, pageW - margin, pageH - 40)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(120, 120, 120)
    doc.text(`7EVEN Capital · Confidential · ${projectName}`, margin, pageH - 28)
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 28, { align: 'right' })
    doc.setTextColor(160, 160, 160)
    doc.text(`Design & Interface © ${new Date().getFullYear()} JB Design × Studio · All Rights Reserved`, pageW / 2, pageH - 16, { align: 'center' })
  }

  doc.save(`${fileStamp(projectName)}.pdf`)
}

// ── Excel ─────────────────────────────────────────────────────────────────────

function blockToRows(block: Block): (string | number)[][] {
  if (block.type === 'note') return [[block.text]]
  if (block.type === 'kv') return block.rows.map(([k, v]) => [k, v])
  if (block.type === 'bars') return block.items.map(i => [i.label, Math.round(i.value)])
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
      if (block.title) aoa.push([block.title])
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
