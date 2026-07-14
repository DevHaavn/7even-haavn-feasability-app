// ATRIUM · Meetings — build the email body + PDF attachments for a record.
import { jsPDF } from 'jspdf'
import type { MeetingBundle, MeetingAction } from './types'

export interface RecordContent { summary: string; decisions: string[]; actions: MeetingAction[] }

// HTML email body (used when "include summary & actions" is on).
export function emailHtml(b: MeetingBundle, c: RecordContent): string {
  const li = (s: string) => `<li style="margin:4px 0">${s}</li>`
  return `<div style="font-family:Inter,Arial,sans-serif;color:#12150F;max-width:640px">
    <h2 style="margin:0 0 4px">${b.meeting.title}</h2>
    <div style="color:#636966;font-size:13px;margin-bottom:16px">${b.meeting.locationLabel || ''} · ${b.attendees.length} attendees</div>
    <h3 style="color:#1B5E3F;margin:16px 0 6px">Summary</h3>
    <p style="line-height:1.55">${c.summary}</p>
    <h3 style="color:#1B5E3F;margin:16px 0 6px">Decisions</h3>
    <ul style="padding-left:18px">${c.decisions.map(li).join('')}</ul>
    <h3 style="color:#1B5E3F;margin:16px 0 6px">Actions</h3>
    <ul style="padding-left:18px">${c.actions.map(a => li(`${a.text}${a.dueLabel ? ` — <b>${a.dueLabel}</b>` : ''}${a.ownerId ? ` (${a.ownerId})` : ''}`)).join('')}</ul>
    <p style="color:#7C8380;font-size:12px;margin-top:20px">Recorded &amp; translated live by ATRIUM · full transcript attached.</p>
  </div>`
}

// Base64 (no data: prefix) PDF of the record + transcript. bilingual = keep 中文.
export function transcriptPdfBase64(b: MeetingBundle, c: RecordContent, bilingual: boolean): string {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const M = 48, W = 595 - M * 2
  let y = M
  const line = (txt: string, size = 10, gap = 14, colour: [number, number, number] = [18, 21, 15]) => {
    doc.setFontSize(size); doc.setTextColor(...colour)
    for (const seg of doc.splitTextToSize(txt, W)) { if (y > 800) { doc.addPage(); y = M } doc.text(seg, M, y); y += gap }
  }
  doc.setFont('helvetica', 'bold'); line(b.meeting.title, 16, 22)
  doc.setFont('helvetica', 'normal'); line(`${b.meeting.locationLabel || ''} · ${b.attendees.length} attendees`, 10, 18, [99, 105, 102])
  y += 6; doc.setFont('helvetica', 'bold'); line('Summary', 12, 18, [27, 94, 63]); doc.setFont('helvetica', 'normal'); line(c.summary)
  y += 4; doc.setFont('helvetica', 'bold'); line('Decisions', 12, 18, [27, 94, 63]); doc.setFont('helvetica', 'normal'); c.decisions.forEach(d => line('• ' + d))
  y += 4; doc.setFont('helvetica', 'bold'); line('Actions', 12, 18, [27, 94, 63]); doc.setFont('helvetica', 'normal'); c.actions.forEach(a => line(`• ${a.text}${a.dueLabel ? ' — ' + a.dueLabel : ''}`))
  if (b.utterances.length) {
    y += 8; doc.setFont('helvetica', 'bold'); line('Transcript', 12, 18, [27, 94, 63]); doc.setFont('helvetica', 'normal')
    for (const u of b.utterances) {
      line(`${u.speaker}`, 9, 12, [99, 105, 102])
      // jsPDF core fonts don't render Chinese glyphs; include zh only as a marker in bilingual mode.
      if (bilingual && u.sourceLang === 'zh') line('[中文 original omitted — see app]', 9, 12, [124, 131, 128])
      line(u.sourceLang === 'zh' ? (u.translation || '') : u.original, 10, 14)
    }
  }
  return doc.output('datauristring').split(',')[1] || ''
}
