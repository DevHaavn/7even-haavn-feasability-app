import type React from 'react'
import { useSyncExternalStore } from 'react'

// ── ATRIUM light / dark theme ───────────────────────────────────────────────────
// A tiny global store (no provider needed) that persists the chosen theme and
// drives the Capital Base + HAAVN Management pillar surfaces. The light theme
// reuses the soft blue/grey sky glass introduced on the login / intro screens so
// the whole app reads as one system. Toggle via <ThemeToggle/>.

export type AtriumTheme = 'dark' | 'light'
const KEY = 'atrium_theme'

function initial(): AtriumTheme {
  try {
    const v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark') return v
    // Migrate from the studio's legacy key so the whole app starts on one theme.
    const jb = localStorage.getItem('jb_theme'); if (jb === 'blk') return 'dark'; if (jb === 'light') return 'light'
  } catch { /* SSR / private mode */ }
  return 'dark'
}

let theme: AtriumTheme = initial()
const subs = new Set<() => void>()

export function setAtriumTheme(t: AtriumTheme) {
  if (t === theme) return
  theme = t
  try {
    localStorage.setItem(KEY, t)
    // Keep the studio's legacy key aligned so both systems read one source of truth.
    localStorage.setItem('jb_theme', t === 'dark' ? 'blk' : 'light')
  } catch { /* ignore */ }
  subs.forEach(f => f())
}
export function toggleAtriumTheme() { setAtriumTheme(theme === 'dark' ? 'light' : 'dark') }

function subscribe(cb: () => void) { subs.add(cb); return () => { subs.delete(cb) } }
export function useAtriumTheme(): AtriumTheme {
  return useSyncExternalStore(subscribe, () => theme, () => theme)
}

// ── Palette ─────────────────────────────────────────────────────────────────────
export interface AtriumPalette {
  bg: string
  headerBg: string
  headerBorder: string
  cardBg: string
  cardBorder: string
  cardShadow: string
  cardHoverShadow: (color: string) => string
  divider: string
  ink: string        // primary heading
  sub: string        // body text
  muted: string      // secondary
  faint: string      // metadata
  logoFilter?: string // applied to white PNG marks so they read on a light header
}

const DARK: AtriumPalette = {
  bg: 'linear-gradient(rgba(3,3,3,0.30), rgba(3,3,3,0.55) 70%, rgba(3,3,3,0.78)), url(/capital-bg.png) center / cover no-repeat fixed, #030303',
  // The ATRIUM chrome — the same blue-black bar as the Capital Command topbar
  // and the Management System. It used to composite /home-bg.jpg, the black
  // particle mesh, which read as a leftover texture against the architectural
  // plate now behind every pillar screen.
  headerBg: 'linear-gradient(180deg, #0f151c, #0b1015)',
  headerBorder: 'rgba(255,255,255,0.09)',
  cardBg: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.25))',
  cardBorder: 'rgba(255,255,255,0.10)',
  cardShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 44px rgba(0,0,0,0.40)',
  cardHoverShadow: c => `inset 0 1px 0 rgba(255,255,255,0.16), 0 22px 52px rgba(0,0,0,0.5), 0 0 30px ${c}22`,
  divider: 'linear-gradient(to right, transparent, #3A3A3A 16%, #D9D9D9 50%, #3A3A3A 84%, transparent)',
  ink: '#F0EFED',
  sub: '#A7A7A7',
  muted: '#999999',
  faint: '#777777',
}

const LIGHT: AtriumPalette = {
  bg: 'radial-gradient(ellipse 90% 70% at 50% 24%, rgba(233,240,247,0.60) 0%, rgba(180,196,213,0.32) 46%, rgba(120,140,162,0.22) 100%), linear-gradient(165deg, #EDF2F7 0%, #D2DCE6 40%, #B2C0CF 74%, #9EAEBF 100%)',
  headerBg: 'linear-gradient(180deg, rgba(255,255,255,0.70), rgba(226,234,242,0.58)), #DCE4EC',
  headerBorder: 'rgba(120,140,162,0.30)',
  cardBg: 'linear-gradient(to bottom, rgba(255,255,255,0.74), rgba(244,248,251,0.52) 40%, rgba(206,220,232,0.44))',
  cardBorder: 'rgba(120,140,162,0.32)',
  cardShadow: 'inset 0 1px 0 rgba(255,255,255,0.80), 0 18px 44px rgba(70,92,116,0.18)',
  cardHoverShadow: c => `inset 0 1px 0 rgba(255,255,255,0.9), 0 22px 52px rgba(70,92,116,0.26), 0 0 30px ${c}33`,
  divider: 'linear-gradient(to right, transparent, #8FA0B2 16%, #33424F 50%, #8FA0B2 84%, transparent)',
  ink: '#26333F',
  sub: '#5A6672',
  muted: '#6C7884',
  faint: '#8A96A2',
  logoFilter: 'invert(1) brightness(0.35) contrast(1.1)',
}

export function atriumPalette(t: AtriumTheme): AtriumPalette {
  return t === 'light' ? LIGHT : DARK
}

// ── Nav pill ────────────────────────────────────────────────────────────────────
/**
 * Solid carbon pill for header / overlay navigation (back, exit, log out).
 *
 * These controls sit on surfaces that flip with the theme — the pillar headers
 * and the architectural plate — and they used to be a translucent "glass" pill.
 * In light mode that rendered light-on-light and was genuinely unreadable.
 * Being solid in both themes costs nothing and can never be illegible.
 */
export const atriumNavPill: React.CSSProperties = {
  padding: '9px 16px', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
  fontWeight: 700, color: '#EDF1F3', background: '#141a20', border: '1px solid #2b343d',
  borderRadius: 999, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
  boxShadow: '0 4px 14px rgba(12,18,26,0.28)',
}
