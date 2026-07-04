// ── Project export — PDF & Excel writers ─────────────────────────────────────
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Section, Block } from './exportData'

const GOLD = '#C4973A'
const INK = '#1A1A1A'

function fileStamp(projectName: string) {
  const date = new Date().toISOString().slice(0, 10)
  const safe = projectName.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-')
  return `${safe}-Export-${date}`
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export function exportPdf(projectName: string, address: string, sections: Section[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 48

  // Cover header
  doc.setFillColor(5, 5, 5)
  doc.rect(0, 0, pageW, 118, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.text('7EVEN | HAAVN', margin, 46)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(196, 151, 58)
  doc.text('D E V E L O P M E N T   F E A S I B I L I T Y   S T U D I O', margin, 62)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.text(projectName, margin, 86)
  doc.setFontSize(8)
  doc.setTextColor(160, 160, 160)
  const dateStr = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`${address ? address + '  ·  ' : ''}Exported ${dateStr}  ·  Confidential`, margin, 102)

  let y = 148

  const ensureRoom = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage()
      y = 56
    }
  }

  for (const section of sections) {
    ensureRoom(60)
    // Section heading with gold accent bar
    doc.setFillColor(196, 151, 58)
    doc.rect(margin, y - 11, 3, 14, 'F')
    doc.setTextColor(26, 26, 26)
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

      const head = block.type === 'table' ? [block.headers] : undefined
      const body = block.type === 'table'
        ? block.rows.map(r => r.map(String))
        : block.rows.map(([k, v]) => [k, v])

      autoTable(doc, {
        startY: y + (block.title ? 18 : 8),
        head,
        body,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8, textColor: INK, lineColor: [232, 229, 224], lineWidth: 0.5, cellPadding: 5 },
        headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 245, 242] },
        columnStyles: block.type === 'kv'
          ? { 0: { textColor: [110, 110, 110] }, 1: { fontStyle: 'bold', halign: 'right' } }
          : {},
        didDrawPage: () => { /* keep y tracking manual */ },
        willDrawPage: () => { /* no-op */ },
      })
      // Block title drawn above the table
      if (block.title) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(196, 151, 58)
        doc.text(block.title.toUpperCase(), margin, y + 10)
      }
      // @ts-expect-error jspdf-autotable attaches lastAutoTable
      y = (doc.lastAutoTable?.finalY ?? y) + 22
      if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = 56 }
    }
    y += 8
  }

  // Footer on every page
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    const h = doc.internal.pageSize.getHeight()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(150, 150, 150)
    doc.text(`7EVEN Capital · Confidential · ${projectName}`, margin, h - 28)
    doc.text(`Page ${i} of ${pages}`, pageW - margin, h - 28, { align: 'right' })
    doc.setTextColor(180, 180, 180)
    doc.text(`Design & Interface © ${new Date().getFullYear()} JB Design × Studio · All Rights Reserved`, pageW / 2, h - 16, { align: 'center' })
  }

  doc.save(`${fileStamp(projectName)}.pdf`)
}

// ── Excel ─────────────────────────────────────────────────────────────────────

function blockToRows(block: Block): (string | number)[][] {
  if (block.type === 'note') return [[block.text]]
  if (block.type === 'kv') return block.rows.map(([k, v]) => [k, v])
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
    // Reasonable column widths
    const colWidths = aoa.reduce<number[]>((acc, row) => {
      row.forEach((cell, i) => { acc[i] = Math.max(acc[i] ?? 10, Math.min(String(cell ?? '').length + 2, 52)) })
      return acc
    }, [])
    ws['!cols'] = colWidths.map(wch => ({ wch }))

    // Sheet name: unique, ≤31 chars, no illegal characters
    let name = section.title.replace(/[\\/?*[\]:]/g, '·').slice(0, 31)
    let n = 2
    while (usedNames.has(name)) name = name.slice(0, 28) + ' ' + n++
    usedNames.add(name)
    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  XLSX.writeFile(wb, `${fileStamp(projectName)}.xlsx`)
}
