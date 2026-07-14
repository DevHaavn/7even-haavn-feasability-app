// ATRIUM · Meetings — live transcription engine.
// Tries the real Azure streaming recognizer (via the /api/azure-token seam); if
// Azure isn't configured yet, or mic/init fails, it falls back to the mock stream
// so the Live view always works. Same onUtterance(interim → final) contract.
import { startMockStream } from './mockStream'
import { newId } from './meetingsStore'
import type { Utterance } from './types'

export interface EngineController { stop: () => void; mode: 'azure' | 'mock' }

async function azureToken(): Promise<{ token: string; region: string } | null> {
  try {
    const r = await fetch('/api/azure-token', { method: 'POST' })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

export async function startTranscription(meetingId: string, onUtterance: (u: Utterance) => void): Promise<EngineController> {
  const cred = await azureToken()
  if (!cred) { const c = startMockStream(meetingId, onUtterance); return { stop: c.stop, mode: 'mock' } }
  try {
    const SDK: any = await import('microsoft-cognitiveservices-speech-sdk')
    const cfg = SDK.SpeechTranslationConfig.fromAuthorizationToken(cred.token, cred.region)
    cfg.speechRecognitionLanguage = 'zh-CN'
    cfg.addTargetLanguage('en')
    const audio = SDK.AudioConfig.fromDefaultMicrophoneInput()
    const rec = new SDK.TranslationRecognizer(cfg, audio)
    const start = Date.now()
    let interimId = newId('utt')
    const emit = (text: string, translation: string, isFinal: boolean, id: string) => {
      if (!text) return
      onUtterance({ id, meetingId, speaker: 'Speaker', tsMs: Date.now() - start, sourceLang: 'zh', original: text, translation, isFinal })
    }
    rec.recognizing = (_s: any, e: any) => emit(e.result.text, e.result.translations?.get('en') || '', false, interimId)
    rec.recognized = (_s: any, e: any) => { emit(e.result.text, e.result.translations?.get('en') || '', true, interimId); interimId = newId('utt') }
    rec.startContinuousRecognitionAsync()
    return { stop: () => { try { rec.stopContinuousRecognitionAsync(() => rec.close(), () => rec.close()) } catch { /* closing */ } }, mode: 'azure' }
  } catch {
    const c = startMockStream(meetingId, onUtterance); return { stop: c.stop, mode: 'mock' }
  }
}
