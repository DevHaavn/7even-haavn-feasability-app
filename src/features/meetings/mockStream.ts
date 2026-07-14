// ATRIUM · Meetings — a mock Utterance stream so the Live transcript UI is a pure
// function of an Utterance[] feed and behaves exactly like the real engine
// (interim → final, zh→en). Phase 7 swaps this for the Azure streaming socket
// behind the same callback shape: onUtterance(u) with isFinal false then true.
import { newId } from './meetingsStore'
import type { Utterance } from './types'

interface Line { speaker: string; lang: 'en' | 'zh'; original: string; translation?: string; atMs: number }

const SCRIPT: Line[] = [
  { speaker: 'Daniel Sette', lang: 'en', atMs: 800, original: "Programme's holding — we're two weeks ahead on the podium pour." },
  { speaker: 'Zheng Wei', lang: 'zh', atMs: 4200, original: '工厂那边的预制构件交货时间可以提前，但需要确认最终的付款条件。', translation: 'The factory can bring forward delivery of the precast components, but we need to confirm the final payment terms.' },
  { speaker: 'Lewis Jin', lang: 'en', atMs: 8000, original: 'On terms — the next capital call lands mid-August, so that timing works for us.' },
  { speaker: 'Zheng Wei', lang: 'zh', atMs: 12000, original: '好的，那我们下周把正式的报价单发过来。', translation: "Understood — we'll send the formal quotation next week." },
  { speaker: 'Jamie Baldwin', lang: 'en', atMs: 16500, original: 'Good. Daniel, please update the Saint Village programme in the CRM today.' },
]

export interface MockController { stop: () => void }

// Emits each line first as an interim (partial) utterance, then finalises it a
// beat later — the one interaction people notice.
export function startMockStream(
  meetingId: string,
  onUtterance: (u: Utterance) => void,
  opts: { rate?: number } = {},
): MockController {
  const rate = opts.rate ?? 1
  const timers: ReturnType<typeof setTimeout>[] = []
  SCRIPT.forEach(line => {
    const id = newId('utt')
    const half = (s: string) => s.slice(0, Math.ceil(s.length * 0.6))
    // interim
    timers.push(setTimeout(() => onUtterance({
      id, meetingId, speaker: line.speaker, tsMs: line.atMs, sourceLang: line.lang,
      original: half(line.original), translation: line.translation ? half(line.translation) : undefined, isFinal: false,
    }), (line.atMs) / rate))
    // final
    timers.push(setTimeout(() => onUtterance({
      id, meetingId, speaker: line.speaker, tsMs: line.atMs, sourceLang: line.lang,
      original: line.original, translation: line.translation, isFinal: true,
    }), (line.atMs + 1400) / rate))
  })
  return { stop: () => timers.forEach(clearTimeout) }
}
