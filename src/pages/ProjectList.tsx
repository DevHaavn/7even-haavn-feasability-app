import React, { useEffect, useState, useRef } from 'react'
import { useStore } from '../store'
import { seedProjectsIfEmpty } from '../db/seed'
import { getDeletedProjectIds } from '../db'
import CapitalPortal from './capital/CapitalPortal'
import type { PillarId } from './capital/CapitalBase'
import HaavnManagementBase from './capital/HaavnManagementBase'
import { useRole } from '../lib/role'

// ─────────────────────────────────────────────────────────────────────────────
// ATRIUM home — the 7EVEN Development Feasibility Studio landing.
// Rebuilt to the HAAVN BLACK look: moving video background, counter-flowing
// green LED lines (stopping at the footer hairline), the crisp white 7EVEN
// master centre-stage, a floating glass hamburger holding every project
// feasibility + New Project, CAPITAL wings → Capital Base login, and a
// one-line footer: ▲ ATRIUM · HM · HMVN BLACK → | LIVE clock | links.
// All existing wiring preserved: open project → workspace, create, archive,
// restore, delete, Dashboard (admin), Capital gate (non-external), HM hub,
// HAAVN BLACK entry, Log Out.
// ─────────────────────────────────────────────────────────────────────────────

function useAddressSearch(query: string) {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (query.length < 4) { setResults([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=au&limit=6&q=${encodeURIComponent(query)}`
        const res = await fetch(url, { headers: { 'Accept-Language': 'en-AU' } })
        const data = await res.json()
        setResults(data.map((r: any) => r.display_name as string))
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
    return () => clearTimeout(timer.current)
  }, [query])
  return { results, loading }
}

function typeColor(type?: string, status?: string): { color: string; pulse: boolean; label: string } {
  if (status === 'on-hold') return { color: '#EF4444', pulse: true, label: 'On Hold' }
  if (status === 'pending') return { color: '#C9A24B', pulse: true, label: 'Pending' }
  switch (type) {
    case 'hotel': return { color: '#A855F7', pulse: false, label: 'Hotel' }
    case 'btr': return { color: '#22C55E', pulse: false, label: 'BTR' }
    case 'bts': return { color: '#3B82F6', pulse: false, label: 'BTS' }
    case 'mixed': return { color: '#E8E6E1', pulse: false, label: 'Mixed' }
    default: return { color: '#8d939a', pulse: false, label: 'Active' }
  }
}

const STATUS_OPTIONS = [
  { type: 'hotel', status: 'active', label: 'Hotel', color: '#A855F7' },
  { type: 'btr', status: 'active', label: 'BTR', color: '#22C55E' },
  { type: 'bts', status: 'active', label: 'BTS', color: '#3B82F6' },
  { type: 'mixed', status: 'active', label: 'Mixed', color: '#E8E6E1' },
  { type: undefined, status: 'pending', label: 'Pending', color: '#C9A24B' },
  { type: undefined, status: 'on-hold', label: 'On Hold', color: '#EF4444' },
]

const CSS = `
.ath-root{position:relative;display:flex;flex-direction:column;height:100%;overflow:hidden;background:#040404;color:#e8e6e8;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;
  --led:#2fe07a;--line:rgba(255,255,255,.14);--grey-txt:#a9a6a9;--mono:'JetBrains Mono',ui-monospace,monospace}
.ath-bgv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ath-dim{position:absolute;inset:0;pointer-events:none;background:rgba(0,0,0,.56)}
.ath-vign{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 42%, transparent 40%, rgba(0,0,0,.55) 100%)}
.ath-main{position:relative;z-index:3;flex:1;display:flex;flex-direction:column;min-height:0;padding:0 clamp(18px,3.4vw,46px)}
/* vertical LED lines — live inside ath-main so they stop at the footer hairline */
.ath-vled{position:absolute;top:0;bottom:0;width:2px;pointer-events:none;overflow:visible;z-index:2}
.ath-vled::before{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg, transparent 0%, rgba(214,179,106,.75) 7%, #d6b36a 50%, rgba(214,179,106,.75) 93%, transparent 100%);
  filter:brightness(1.3) drop-shadow(0 0 9px rgba(244,227,189,.95)) drop-shadow(0 0 26px rgba(214,179,106,.9)) drop-shadow(0 0 44px rgba(190,150,80,.62))}
.ath-vl1{left:calc(clamp(46px,6vw,110px) + 96px)}
.ath-vl2{left:calc(clamp(46px,6vw,110px) + 96px + 190px)}
.ath-vr1{right:calc(clamp(46px,6vw,110px) + 96px + 190px)}
.ath-vr2{right:calc(clamp(46px,6vw,110px) + 96px)}
.ath-vl1::before,.ath-vr1::before{animation:athDrawDown 15.6s linear infinite}
.ath-vl2::before,.ath-vr2::before{animation:athDrawUp 15.6s linear infinite}
@keyframes athDrawDown{0%{transform:scaleY(0);transform-origin:top}42%{transform:scaleY(1);transform-origin:top}58%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}
@keyframes athDrawUp{0%{transform:scaleY(0);transform-origin:bottom}42%{transform:scaleY(1);transform-origin:bottom}58%{transform:scaleY(1);transform-origin:top}100%{transform:scaleY(0);transform-origin:top}}
@media(max-width:900px){.ath-vl2,.ath-vr1{display:none}.ath-vl1{left:26px}.ath-vr2{right:26px}}
@media(max-width:600px){.ath-tophead{padding-top:calc(env(safe-area-inset-top,0px) + 57px)}}
/* top */
.ath-tophead{position:relative;z-index:20;display:grid;grid-template-columns:1fr auto 1fr;align-items:start;padding:26px 2px 0}
.ath-capbtn{grid-column:2;display:flex;flex-direction:column;align-items:center;gap:7px;cursor:pointer;text-decoration:none;background:none;border:none;transition:.3s;padding:0}
.ath-capbtn:hover{transform:translateY(-2px)}
.ath-capbtn:hover .ath-capwings{filter:drop-shadow(0 2px 10px rgba(0,0,0,.6)) drop-shadow(0 0 16px rgba(47,224,122,.55));opacity:1}
.ath-capbtn:hover .ath-capword{color:#fff;text-shadow:0 0 12px rgba(47,224,122,.5)}
.ath-capwings{width:78px;height:auto;opacity:.92;filter:drop-shadow(0 2px 10px rgba(0,0,0,.6));transition:.3s}
.ath-capword{font-family:var(--mono);font-size:8px;letter-spacing:.5em;color:#cfd3d8;text-transform:uppercase;padding-left:.5em;transition:.3s}
.ath-eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:.44em;color:var(--grey-txt);text-transform:uppercase;text-align:center;padding-left:.44em;margin-top:6px}
/* burger */
.ath-menuwrap{grid-column:3;justify-self:end;position:relative;z-index:60}
.ath-burger{width:46px;height:42px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;border:none;background:transparent;transition:.3s;padding:0}
.ath-burger span{display:block;width:22px;height:1.8px;background:#dfe1e4;transition:.3s;border-radius:1px}
.ath-burger:hover span{background:var(--led);box-shadow:0 0 10px rgba(47,224,122,.9),0 0 22px rgba(47,224,122,.5)}
.ath-burger.on span:nth-child(1){transform:translateY(7.8px) rotate(45deg)}
.ath-burger.on span:nth-child(2){opacity:0}
.ath-burger.on span:nth-child(3){transform:translateY(-7.8px) rotate(-45deg)}
/* floating menu — centred under the eyebrow, no card */
.ath-pmenu{position:fixed;left:50%;top:clamp(150px,20vh,210px);width:min(560px,84vw);z-index:50;
  opacity:0;transform:translate(-50%,-14px);pointer-events:none;transition:.38s cubic-bezier(.2,.7,.3,1)}
.ath-pmenu.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.ath-mh{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 4px;border-bottom:1px solid rgba(255,255,255,.16);
  font-family:var(--mono);font-size:9px;letter-spacing:.3em;color:#d6d9dd;text-transform:uppercase;text-shadow:0 1px 8px rgba(0,0,0,.9)}
.ath-newp{display:flex;align-items:center;gap:8px;cursor:pointer;font-family:var(--mono);font-size:9px;letter-spacing:.22em;color:var(--led);
  border:1px solid rgba(47,224,122,.4);border-radius:2px;padding:7px 12px;background:rgba(47,224,122,.05);transition:.25s;text-transform:uppercase}
.ath-newp:hover{background:rgba(47,224,122,.14);color:#eafff2}
.ath-base{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;margin:4px 0 12px;padding:13px 16px;cursor:pointer;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.4);border-radius:2px;transition:.3s}
.ath-base img{height:15px;width:auto;display:block;filter:drop-shadow(0 0 10px rgba(255,255,255,.4))}
.ath-base:hover,.ath-base.on{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.75);box-shadow:0 0 26px -10px rgba(255,255,255,.5)}
.ath-base .g{color:#fff;font-size:12px}
.ath-newp-row{width:100%;justify-content:center;margin-bottom:12px}
.ath-hor7{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;margin-top:14px;padding:13px 16px;cursor:pointer;
  background:rgba(214,179,106,.05);border:1px solid rgba(214,179,106,.45);border-radius:2px;transition:.3s}
.ath-hor7 img{height:14px;width:auto;display:block;filter:drop-shadow(0 0 10px rgba(214,179,106,.4))}
.ath-hor7:hover{background:rgba(214,179,106,.12);border-color:rgba(214,179,106,.8);box-shadow:0 0 26px -10px rgba(214,179,106,.6)}
.ath-hor7 .g{color:#d6b36a;font-size:12px}
.ath-hor7{margin-top:12px}
.ath-hor7.grn{background:rgba(47,224,122,.05);border-color:rgba(47,224,122,.45)}
.ath-hor7.grn img{filter:drop-shadow(0 0 10px rgba(47,224,122,.4))}
.ath-hor7.grn:hover{background:rgba(47,224,122,.12);border-color:rgba(47,224,122,.8);box-shadow:0 0 26px -10px rgba(47,224,122,.6)}
.ath-hor7.grn .g{color:#2fe07a}
.ath-brandrow{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;margin-top:12px;padding:13px 16px;cursor:pointer;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.3);border-radius:2px;transition:.3s}
.ath-brandrow img{width:auto;display:block;filter:drop-shadow(0 0 8px rgba(255,255,255,.3))}
.ath-brandrow:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.65);box-shadow:0 0 24px -10px rgba(255,255,255,.45)}
.ath-brandrow .g{color:#d6d9dd;font-size:12px}
.ath-logoutrow{display:flex;align-items:center;justify-content:center;width:100%;margin-top:16px;padding:12px 16px;cursor:pointer;
  font-family:var(--mono);font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#b9bdc4;
  background:transparent;border:1px solid rgba(255,255,255,.22);border-radius:2px;transition:.3s}
.ath-logoutrow:hover{border-color:rgba(224,100,92,.7);color:#fff;background:rgba(224,100,92,.08)}
.ath-dash{cursor:pointer;font-family:var(--mono);font-size:9px;letter-spacing:.22em;color:#cfd3d8;border:1px solid rgba(255,255,255,.24);border-radius:2px;padding:7px 12px;background:transparent;transition:.25s;text-transform:uppercase}
.ath-dash:hover{border-color:rgba(47,224,122,.6);color:#fff}
.ath-plist{max-height:min(54vh,460px);overflow-y:auto}
.ath-prow{display:flex;align-items:center;gap:14px;padding:14px 4px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.1);transition:.22s;text-shadow:0 1px 8px rgba(0,0,0,.9)}
.ath-prow:hover{border-bottom-color:rgba(47,224,122,.55)}
.ath-prow:hover .ath-pname{color:#fff;text-shadow:0 0 14px rgba(47,224,122,.35)}
.ath-num{font-family:var(--mono);font-size:9px;color:rgba(255,255,255,.32);width:16px;flex-shrink:0}
.ath-pinfo{flex:1;min-width:0}
.ath-pname{font-size:13px;font-weight:600;color:#f0eff0;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ath-paddr{font-family:var(--mono);font-size:9px;color:var(--grey-txt);letter-spacing:.06em;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ath-ptype{font-family:var(--mono);font-size:8px;letter-spacing:.18em;color:#cfd3d8;border:1px solid rgba(255,255,255,.22);border-radius:2px;padding:4px 8px;display:inline-flex;align-items:center;gap:6px;background:transparent;cursor:pointer;flex-shrink:0}
.ath-ptype:hover{border-color:rgba(47,224,122,.55)}
.ath-ptype .d{width:5px;height:5px;border-radius:50%}
.ath-go{color:var(--led);font-size:11px;opacity:0;transform:translateX(-4px);transition:.25s;flex-shrink:0}
.ath-prow:hover .ath-go{opacity:1;transform:none}
.ath-sub{position:absolute;z-index:80;background:rgba(10,11,12,.92);border:1px solid rgba(255,255,255,.16);border-radius:4px;min-width:150px;overflow:hidden;
  -webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 20px 50px -20px #000}
.ath-sub button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:9px 12px;background:transparent;border:none;cursor:pointer;color:#cfd3d8;font-family:var(--mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase}
.ath-sub button:hover{background:rgba(47,224,122,.1);color:#fff}
.ath-arch{padding:12px 4px 4px;font-family:var(--mono);font-size:8px;letter-spacing:.26em;color:rgba(255,255,255,.35);text-transform:uppercase}
.ath-archrow{display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.06);font-size:11px;color:#b9bdc4;text-shadow:0 1px 8px rgba(0,0,0,.9)}
.ath-archrow .a-act{font-family:var(--mono);font-size:8px;letter-spacing:.14em;padding:5px 10px;border-radius:2px;cursor:pointer;background:transparent}
/* hero */
.ath-hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity .35s, filter .35s;z-index:4;position:relative}
.ath-root.menu-open .ath-hero{opacity:.08;filter:blur(2px)}
.ath-sevenwrap{display:flex;flex-direction:column;align-items:center;opacity:0;animation:athBrandIn 2.4s ease-out .5s forwards}
@keyframes athBrandIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.ath-seven{width:clamp(269px,40.3vw,576px)}
.ath-7stack{position:relative;aspect-ratio:1800/280}
.s7{position:absolute;inset:0;display:block;opacity:0;
  -webkit-mask:url('/seven-mark-white-hd.png') center / contain no-repeat;
  mask:url('/seven-mark-white-hd.png') center / contain no-repeat}
/* Brand reveal: black metal chrome sweeps in left->right, then the white master
   sweeps over it right->left and holds. Wrapper masks do the directional fade;
   the child keeps the glyph mask + glow. */
.s7wrap{position:absolute;inset:0;display:block;
  -webkit-mask-size:250% 100%;mask-size:250% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.s7wrap .s7{opacity:1}
.s7kwrap{-webkit-mask-image:linear-gradient(90deg,#000 0 40%,transparent 60% 100%);
  mask-image:linear-gradient(90deg,#000 0 40%,transparent 60% 100%);
  -webkit-mask-position:100% 0;mask-position:100% 0;
  animation:s7ksweep 1.9s ease .4s forwards}
@keyframes s7ksweep{to{-webkit-mask-position:0 0;mask-position:0 0}}
.s7wwrap{-webkit-mask-image:linear-gradient(90deg,transparent 0 40%,#000 60% 100%);
  mask-image:linear-gradient(90deg,transparent 0 40%,#000 60% 100%);
  -webkit-mask-position:0 0;mask-position:0 0;
  animation:s7wsweep 1.9s ease 2.6s forwards}
@keyframes s7wsweep{to{-webkit-mask-position:100% 0;mask-position:100% 0}}
.s7k{background:linear-gradient(180deg,#2c2f33,#787f86 38%,#0a0b0c 55%,#43484e 78%,#101113);
  filter:drop-shadow(0 0 6px rgba(255,255,255,.28)) drop-shadow(0 0 22px rgba(160,170,180,.18)) drop-shadow(0 3px 18px rgba(0,0,0,.7))}
.s7w{background:#fff;filter:drop-shadow(0 0 6px rgba(255,255,255,.55)) drop-shadow(0 0 22px rgba(255,255,255,.28)) drop-shadow(0 3px 18px rgba(0,0,0,.6))}
@media(prefers-reduced-motion:reduce){.s7kwrap{display:none}.s7wwrap{animation:none;-webkit-mask:none;mask:none}}
.ath-herosub{margin-top:22px;font-family:var(--mono);font-size:7px;letter-spacing:.5em;color:var(--grey-txt);text-transform:uppercase;text-align:center;padding-left:.5em}
/* footer */
.ath-hair{height:1px;background:linear-gradient(90deg,transparent,var(--line) 12%,var(--line) 88%,transparent);position:relative;z-index:4}
.ath-frail{position:relative;z-index:4;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px;padding:14px 2px 16px;white-space:nowrap}
.ath-fl{display:flex;align-items:center;gap:16px;min-width:0}
.ath-atrium{display:flex;align-items:center;gap:9px;font-family:var(--mono);font-size:10px;letter-spacing:.34em;color:#c3c7cd}
.ath-tri{width:0;height:0;border-left:4.5px solid transparent;border-right:4.5px solid transparent;border-bottom:7px solid rgba(255,255,255,.55);transform:translateY(-1px)}
.ath-vd{width:1px;height:18px;background:var(--line)}
.ath-hmlink{display:inline-flex;align-items:center;cursor:pointer;transition:.3s;opacity:.85;background:none;border:none;padding:0}
.ath-hmlink img{height:15px;width:auto;display:block}
.ath-hmlink:hover{opacity:1;filter:drop-shadow(0 0 12px rgba(47,224,122,.5));transform:translateY(-1px)}
.ath-hbentry{display:inline-flex;align-items:center;gap:8px;cursor:pointer;opacity:.9;transition:.3s;background:none;border:none;padding:0}
.ath-hbentry img{height:11px;width:auto;display:block}
.ath-hbentry .go{color:var(--led);font-size:12px;transition:transform .35s cubic-bezier(.2,.7,.3,1)}
.ath-hbentry:hover{opacity:1;filter:drop-shadow(0 0 12px rgba(47,224,122,.4))}
.ath-hbentry:hover .go{transform:translateX(3px)}
.ath-fc{display:flex;align-items:center;gap:14px;justify-self:center}
.ath-livewrap{display:flex;align-items:center;gap:9px;font-family:var(--mono);font-size:10px;letter-spacing:.22em;color:var(--grey-txt)}
.ath-livedot{width:6px;height:6px;border-radius:50%;background:var(--led);box-shadow:0 0 10px var(--led);animation:athPulse 2.4s infinite}
@keyframes athPulse{0%,100%{opacity:1}50%{opacity:.4}}
.ath-clock{color:#e8e6e8;font-size:12px;letter-spacing:.12em;font-family:var(--mono)}
.ath-fr{display:flex;align-items:center;gap:8px;justify-self:end}
.ath-chip{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:2px;border:1px solid rgba(255,255,255,.28);background:transparent;
  font-family:var(--mono);font-size:9px;letter-spacing:.22em;color:#b9bdc4;cursor:pointer;transition:.35s cubic-bezier(.2,.7,.3,1);text-transform:uppercase;text-decoration:none}
.ath-chip:hover{border-color:rgba(47,224,122,.7);color:#fff;transform:translateY(-2px);background:rgba(47,224,122,.06);box-shadow:0 0 24px -10px rgba(47,224,122,.5)}
.ath-chip .ext{color:var(--led);opacity:.9;font-size:9px}
.ath-chip .ring{width:6px;height:6px;border:1px solid var(--led);border-radius:50%}
@media(max-width:840px){
  .ath-frail{grid-template-columns:1fr;justify-items:start;gap:12px}
  .ath-fc,.ath-fr{justify-self:start}
  .ath-fr{flex-wrap:wrap}
  .ath-chip{padding:6px 8px;font-size:8px;letter-spacing:.16em}
  .ath-capwings{width:56px}
}
`

export default function ProjectList({ onLogout, onDashboard, onOpenHomes }: { onLogout?: () => void; onDashboard?: (brand: '7even' | 'haavn') => void; onOpenHomes?: () => void }) {
  const { projects, loadProjects, createProject, setActiveProject, updateProject, deleteProject } = useStore()
  const role = useRole()
  const [menuOpen, setMenuOpen] = useState(false)
  const [baseOpen, setBaseOpen] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [capitalOpen, setCapitalOpen] = useState(false)
  const [capitalStart, setCapitalStart] = useState<PillarId | undefined>(undefined)
  const [hmOpen, setHmOpen] = useState(false)
  const [statusFor, setStatusFor] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const { results, loading } = useAddressSearch(address)
  const addressRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [clock, setClock] = useState('--:--:--')

  useEffect(() => { seedProjectsIfEmpty(); loadProjects() }, [])
  useEffect(() => {
    const t = () => setClock(new Date().toLocaleTimeString('en-AU', { hour12: false }))
    t(); const id = setInterval(t, 1000); return () => clearInterval(id)
  }, [])
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (addressRef.current && !addressRef.current.contains(e.target as Node)) setShowSuggestions(false)
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenuOpen(false); setStatusFor(null) }
    }
    function key(e: KeyboardEvent) { if (e.key === 'Escape') { setMenuOpen(false); setStatusFor(null) } }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('keydown', key) }
  }, [])

  const tombstoned = new Set(getDeletedProjectIds())
  const live = projects.filter(p => p.status !== 'archived' && p.status !== 'deleted' && !tombstoned.has(p.id))
  const archivedProjects = projects.filter(p => p.status === 'archived' && !tombstoned.has(p.id))

  function handleCreate() {
    if (!name.trim()) return
    const p = createProject(name.trim(), address.trim(), '7even')
    setName(''); setAddress(''); setShowNew(false)
    setActiveProject(p.id)
  }
  const isAdmin = role === 'admin'

  return (
    <div className={`ath-root${menuOpen ? ' menu-open' : ''}`}>
      <style>{CSS}</style>

      {/* moving background */}
      <video className="ath-bgv" autoPlay muted loop playsInline preload="metadata" src="/haavn-black-bg.mp4" />
      <div className="ath-dim" />
      <div className="ath-vign" />

      {/* drag region for the frameless window */}
      <div className="drag-region" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, zIndex: 10, pointerEvents: 'none' }} />

      <div className="ath-main">
        {/* LED lines — end at the footer hairline (they live inside ath-main) */}
        <div className="ath-vled ath-vl1" /><div className="ath-vled ath-vl2" />
        <div className="ath-vled ath-vr1" /><div className="ath-vled ath-vr2" />

        {/* top: CAPITAL wings → Capital Base · burger → projects */}
        <div className="ath-tophead">
          <div />
          <div style={{ gridColumn: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {role !== 'external' ? (
              <span className="ath-capbtn" style={{ cursor: 'default' }}>
                <img className="ath-capwings" src="/winged-device-white.png" alt="Capital" draggable={false} />
                <span className="ath-capword">Capital</span>
              </span>
            ) : (
              <span className="ath-capbtn" style={{ cursor: 'default' }}>
                <img className="ath-capwings" src="/winged-device-white.png" alt="" draggable={false} />
                <span className="ath-capword">Capital</span>
              </span>
            )}
            <div className="ath-eyebrow">Development Feasibility Studio</div>
          </div>
          <div className="ath-menuwrap no-drag" ref={menuRef}>
            <button className={`ath-burger${menuOpen ? ' on' : ''}`} aria-label="Projects menu" onClick={() => setMenuOpen(v => !v)}>
              <span /><span /><span />
            </button>
            <div className={`ath-pmenu${menuOpen ? ' on' : ''}`}>
              <div className="ath-mh">
                <span>Projects · {live.length}</span>

              </div>
              {/* BASE — 7EVEN sub-brand: press to drop down the project feasibilities */}
              <button className={`ath-base${baseOpen ? ' on' : ''}`} title="BASE — Project Feasibilities" onClick={() => setBaseOpen(v => !v)}>
                <img src="/base-white.png" alt="BASE" />
                <span className="g">{baseOpen ? '▾' : '▸'}</span>
              </button>
              {baseOpen && (
                <button className="ath-newp ath-newp-row" onClick={() => { setShowNew(true); setMenuOpen(false) }}>+ New Project — Start a new feasibility</button>
              )}
              <div className="ath-plist" style={{ display: baseOpen ? undefined : 'none' }}>
                {live.length === 0 && (
                  <div style={{ padding: '22px 4px', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.2em', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase' }}>
                    No projects yet — <span style={{ color: 'var(--led)', cursor: 'pointer' }} onClick={() => { setShowNew(true); setMenuOpen(false) }}>create the first</span>
                  </div>
                )}
                {live.map((p, i) => {
                  const tc = typeColor(p.type, p.status)
                  return (
                    <div key={p.id} className="ath-prow" onClick={() => setActiveProject(p.id)}>
                      <span className="ath-num">{String(i + 1).padStart(2, '0')}</span>
                      <div className="ath-pinfo">
                        <div className="ath-pname">{p.name}</div>
                        <div className="ath-paddr">{p.address || '—'}</div>
                      </div>
                      <span style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button className="ath-ptype" title="Set status" onClick={() => setStatusFor(v => v === p.id ? null : p.id)}>
                          <span className="d" style={{ background: tc.color }} />{tc.label}
                        </button>
                        {statusFor === p.id && (
                          <div className="ath-sub" style={{ top: 'calc(100% + 6px)', right: 0 }}>
                            {STATUS_OPTIONS.map(opt => (
                              <button key={opt.label} onClick={() => { updateProject({ ...p, type: opt.type, status: opt.status, updatedAt: new Date().toISOString() }); setStatusFor(null) }}>
                                <span className="d" style={{ width: 5, height: 5, borderRadius: '50%', background: opt.color, display: 'inline-block' }} />{opt.label}
                              </button>
                            ))}
                            <button onClick={() => { updateProject({ ...p, status: 'archived', updatedAt: new Date().toISOString() }); setStatusFor(null) }} style={{ borderTop: '1px solid rgba(255,255,255,.1)' }}>▤ Archive</button>
                          </div>
                        )}
                      </span>
                      <span className="ath-go">→</span>
                    </div>
                  )
                })}
                {archivedProjects.length > 0 && (
                  <>
                    <div className="ath-arch">▤ Archived · {archivedProjects.length}</div>
                    {archivedProjects.map(p => (
                      <div key={p.id} className="ath-archrow">
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        <button className="a-act" style={{ border: '1px solid rgba(47,224,122,.45)', color: 'var(--led)' }}
                          onClick={() => updateProject({ ...p, status: 'active', updatedAt: new Date().toISOString() })}>↺ LIVE</button>
                        <button className="a-act" style={{ border: '1px solid rgba(200,80,63,.55)', color: '#e8836e' }}
                          onClick={() => { if (confirm(`Delete "${p.name}" permanently? This cannot be undone.`)) deleteProject(p.id) }}>🗑</button>
                      </div>
                    ))}
                  </>
                )}
              </div>
              {/* ENTERPRISE — Capital Base / accounts administration (replaces the wings button) */}
              {role !== 'external' && (
                <button className="ath-hor7" title="ENTERPRISE — Accounts &amp; Administration" onClick={() => { setCapitalOpen(true); setMenuOpen(false) }}>
                  <img src="/enterprise-gold.png" alt="ENTERPRISE" />
                  <span className="g">→</span>
                </button>
              )}
              {/* HORI7ON — 7EVEN sub-brand: project overview display */}
              <button className="ath-hor7 grn" title="HORI7ON — Project Overview Display" onClick={() => { window.location.href = '/hori7on.html' }}>
                <img src="/hori7on-green.png" alt="HORI7ON" />
                <span className="g">→</span>
              </button>
              {/* HM + HAAVN BLACK — moved in from the footer */}
              <button className="ath-brandrow" title="HAAVN Management — Management Hub" onClick={() => { setHmOpen(true); setMenuOpen(false) }}>
                <img style={{ height: 16 }} src="/hm-device-white.png" alt="HM" />
                <span className="g">→</span>
              </button>
              <button className="ath-brandrow" title="HAAVN BLACK — Homes" onClick={() => { onOpenHomes?.(); setMenuOpen(false) }}>
                <img style={{ height: 12 }} src="/haavn-black-logo.png" alt="HAAVN BLACK" />
                <span className="g">→</span>
              </button>
              <button className="ath-logoutrow" onClick={() => onLogout?.()}>LOG OUT</button>
            </div>
          </div>
        </div>

        {/* centre hero — the crisp 7EVEN master */}
        <div className="ath-hero">
          <div className="ath-sevenwrap">
            <div className="ath-seven ath-7stack" role="img" aria-label="7EVEN">
              <span className="s7wrap s7kwrap"><i className="s7 s7k" /></span><span className="s7wrap s7wwrap"><i className="s7 s7w" /></span>
            </div>
            <div className="ath-herosub">Atrium &nbsp;·&nbsp; Precision Feasibility &nbsp;·&nbsp; By Invitation</div>
          </div>
        </div>
      </div>

      {/* footer — one line */}
      <div style={{ position: 'relative', zIndex: 4, padding: '0 clamp(18px,3.4vw,46px)' }}>
        <div className="ath-hair" />
        <div className="ath-frail">
          <div className="ath-fl">
            <span className="ath-atrium"><span className="ath-tri" />ATRIUM</span>
          </div>
          <div className="ath-fc">
            <span className="ath-livewrap"><span className="ath-livedot" />LIVE&nbsp;&nbsp;<span className="ath-clock">{clock}</span>&nbsp;·&nbsp;MELBOURNE</span>
          </div>
          <div className="ath-fr">
            <a className="ath-chip" href="https://7even.au" target="_blank" rel="noopener noreferrer">7EVEN.AU <span className="ext">↗</span></a>
            <a className="ath-chip" href="https://www.haavn.au" target="_blank" rel="noopener noreferrer">HAAVN.AU <span className="ext">↗</span></a>
            <button className="ath-chip" title="Get the latest version" onClick={() => window.location.reload()}><span className="ring" />UPDATE</button>
          </div>
        </div>
      </div>

      {/* HAAVN Management — 3-pillar hub */}
      {hmOpen && <HaavnManagementBase onClose={() => setHmOpen(false)} onLogout={onLogout} />}

      {/* Capital Base — admin/director only */}
      {capitalOpen && role !== 'external' && <CapitalPortal initialPillar={capitalStart} role={role} onClose={() => { setCapitalOpen(false); setCapitalStart(undefined) }} />}

      {/* ── New project modal (unchanged flow) ── */}
      {showNew && (
        <div onClick={() => setShowNew(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,3,4,.45)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }}>
          <div onClick={e => e.stopPropagation()} className="no-drag"
            style={{ width: 'min(480px, calc(100vw - 28px))', maxHeight: 'calc(100vh - 32px)', padding: '36px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,.2)', borderRadius: 6, overflow: 'auto',
              textShadow: '0 1px 10px rgba(0,0,0,.9)' }}>
            <div style={{ height: 2, borderRadius: 2, marginBottom: 30, background: 'linear-gradient(to right, transparent, rgba(47,224,122,.7) 50%, transparent)' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26 }}>
              <div>
                <p style={{ color: 'var(--led, #2fe07a)', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.30em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>New Development</p>
                <h2 style={{ fontWeight: 300, color: '#EEF1F2', fontSize: 22, letterSpacing: '0.08em', margin: 0 }}>Create Project</h2>
              </div>
              <button onClick={() => setShowNew(false)} style={{ color: '#C6CDCF', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <label style={{ display: 'block', color: '#AEB6B8', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>Project Name *</label>
                <input autoFocus
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.28)', padding: '10px 0', color: '#EEF1F2', fontSize: 14, outline: 'none', letterSpacing: '0.04em' }}
                  placeholder="e.g. 225 Heaths Road Werribee"
                  value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()} />
              </div>
              <div ref={addressRef} style={{ position: 'relative' }}>
                <label style={{ display: 'block', color: '#AEB6B8', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>Address</label>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.28)' }}>
                  <input
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: '10px 0', color: '#EEF1F2', fontSize: 14, outline: 'none', letterSpacing: '0.04em' }}
                    placeholder="Start typing an address…"
                    value={address} onChange={e => { setAddress(e.target.value); setShowSuggestions(true) }}
                    onFocus={() => results.length > 0 && setShowSuggestions(true)}
                    autoComplete="off" />
                  {loading && <span style={{ color: '#9AA2A4', fontSize: 10, flexShrink: 0 }}>···</span>}
                </div>
                {showSuggestions && results.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'rgba(10,11,12,0.96)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 6, maxHeight: 200, overflowY: 'auto', boxShadow: '0 14px 34px rgba(0,0,0,0.6)' }}>
                    {results.map((r, i) => (
                      <button key={i} onMouseDown={e => { e.preventDefault(); setAddress(r.split(', ').slice(0, 4).join(', ')); setShowSuggestions(false) }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#EEF1F2', fontSize: 12, cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {r.split(', ').slice(0, 4).join(', ')}
                        <span style={{ color: '#9AA2A4', fontSize: 10, display: 'block', marginTop: 2 }}>{r.split(', ').slice(4, 7).join(', ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.14)' }}>
                <button onClick={() => setShowNew(false)}
                  style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.24)', borderRadius: 2, color: '#EEF1F2', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={!name.trim()}
                  style={{ padding: '10px 28px', background: !name.trim() ? 'rgba(47,224,122,0.06)' : 'rgba(47,224,122,0.14)', border: '1px solid rgba(47,224,122,0.5)', borderRadius: 2, color: !name.trim() ? 'rgba(255,255,255,0.4)' : '#eafff2', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: !name.trim() ? 'default' : 'pointer' }}>
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
