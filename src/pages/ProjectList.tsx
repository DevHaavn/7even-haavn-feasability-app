import React, { useEffect, useState, useRef } from 'react'
import { useStore } from '../store'
import { seedProjectsIfEmpty } from '../db/seed'
import { getDeletedProjectIds } from '../db'
import CapitalPortal from './capital/CapitalPortal'
import type { PillarId } from './capital/CapitalBase'
import HaavnManagementBase from './capital/HaavnManagementBase'
import AtriumZeroed from './AtriumZeroed'
import { useRole } from '../lib/role'
import XMark from '../brand/XMark'
import MenuButton from '../brand/MenuButton'

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
.ath-menuwrap{grid-column:1;justify-self:start;position:relative;z-index:60}
/* ── the menu button, as it is on 7even.au ────────────────────────────────
   The frame is drawn in the SVG, not with a CSS border, so the glow follows
   the geometry. Bone white, with a soft light around it. */
.mb{width:60px;height:60px;padding:0;border:0;background:transparent;color:#f6f4f0;cursor:pointer;display:grid;place-items:center;
  transition:transform .42s cubic-bezier(.2,.7,.3,1);-webkit-tap-highlight-color:transparent}
.mb svg{width:100%;height:100%;display:block;overflow:visible;
  filter:drop-shadow(0 0 3px rgba(255,252,244,.35)) drop-shadow(0 0 10px rgba(255,255,255,.2))
         drop-shadow(0 2px 6px rgba(0,0,0,.42)) drop-shadow(0 10px 22px rgba(0,0,0,.45));
  transition:filter .42s cubic-bezier(.2,.7,.3,1)}
.mb .fr{fill:none;stroke-linejoin:round}
.mb .fr.in{stroke:rgba(255,255,255,.34);stroke-width:1.1}
.mb .fr.rip{stroke:rgba(255,252,244,.9);stroke-width:1.3;opacity:0;transform-box:fill-box;transform-origin:center}
.mb .mark{filter:drop-shadow(0 .6px 1.4px rgba(0,0,0,.9))}
.mb .mbLow{transition:opacity .2s linear}
.mb:hover{transform:translateY(-2px)}
.mb.lit{transform:none}
.mb:hover svg,.mb.lit svg{
  filter:drop-shadow(0 0 4px rgba(255,252,244,.95)) drop-shadow(0 0 13px rgba(255,255,255,.6))
         drop-shadow(0 0 28px rgba(200,222,245,.34))
         drop-shadow(0 2px 7px rgba(0,0,0,.42)) drop-shadow(0 12px 28px rgba(0,0,0,.5))}
.mb:hover .fr.in,.mb.lit .fr.in{stroke:rgba(255,255,255,.72)}
.mb:hover .fr.rip{animation:mbPulse 1.6s cubic-bezier(.2,.7,.3,1) infinite}
@keyframes mbPulse{0%{opacity:.85;transform:scale(1)}70%,100%{opacity:0;transform:scale(1.5)}}
.mb:active{transform:translateY(-1px) scale(.94);transition-duration:.12s}
.mb:focus-visible{outline:2px solid #d6b36a;outline-offset:5px;border-radius:50%}

/* floating menu — centred under the eyebrow, no card */
.ath-pmenu{border-radius:26px;position:fixed;left:50%;top:clamp(150px,20vh,210px);width:min(560px,84vw);z-index:50;max-height:calc(100vh - clamp(150px,20vh,210px) - 80px);overflow-y:auto;
  opacity:0;transform:translate(-50%,-14px);pointer-events:none;transition:.38s cubic-bezier(.2,.7,.3,1)}
.ath-pmenu.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.ath-mh{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 4px;border-bottom:1px solid rgba(255,255,255,.16);
  font-family:var(--mono);font-size:9px;letter-spacing:.3em;color:#d6d9dd;text-transform:uppercase;text-shadow:0 1px 8px rgba(0,0,0,.9)}
.ath-newp{display:flex;align-items:center;gap:8px;cursor:pointer;font-family:var(--mono);font-size:11.7px;letter-spacing:.22em;color:var(--led);
  border:1px solid rgba(47,224,122,.4);border-radius:14px;padding:7px 12px;background:rgba(47,224,122,.05);transition:.25s;text-transform:uppercase}
.ath-newp:hover{background:rgba(47,224,122,.14);color:#eafff2}
.ath-base{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;margin:4px 0 12px;padding:13px 16px;cursor:pointer;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.4);border-radius:14px;transition:.3s}
.ath-base img{height:15px;width:auto;display:block;filter:drop-shadow(0 0 10px rgba(255,255,255,.4))}
.ath-base:hover,.ath-base.on{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.75);box-shadow:0 0 26px -10px rgba(255,255,255,.5)}
.ath-base .g{color:#fff;font-size:12px}
.ath-newp-row{width:100%;justify-content:center;margin-bottom:12px}
/* ATRIUM ZEROED sits in the BASE list but is neither a feasibility nor a new
   project, so it takes the menu's neutral idiom: clear, and white on hover. */
.ath-zeroed{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-bottom:12px;cursor:pointer;
  font-family:var(--mono);font-size:11.7px;letter-spacing:.22em;text-transform:uppercase;
  color:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.32);border-radius:14px;
  padding:7px 12px;background:transparent;transition:.25s}
.ath-zeroed:hover{color:#fff;border-color:rgba(255,255,255,.75);background:rgba(255,255,255,.08);
  box-shadow:0 0 26px -12px rgba(255,255,255,.5)}
.ath-pinrow{display:flex;align-items:center;gap:14px;width:100%;margin:2px 0 12px;padding:12px 16px;
  border:1px solid rgba(214,179,106,.45);border-radius:14px;background:rgba(214,179,106,.04);transition:.3s}
.ath-pinrow.err{border-color:rgba(224,100,92,.75);animation:athPinShake .4s ease}
@keyframes athPinShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}50%{transform:translateX(7px)}75%{transform:translateX(-4px)}}
.ath-pinlbl{font-family:var(--mono);font-size:9px;letter-spacing:.3em;color:#d6b36a;text-transform:uppercase;flex:none}
.ath-pininp{width:96px;background:transparent;border:none;border-bottom:1px solid rgba(214,179,106,.5);color:#fff;outline:none;
  font-family:var(--mono);font-size:20px;letter-spacing:.5em;text-align:center;padding:2px 0 5px;caret-color:#d6b36a}
.ath-pininp::placeholder{color:rgba(255,255,255,.3)}
.ath-pinhint{font-family:var(--mono);font-size:7.5px;letter-spacing:.22em;color:#8a8f95;text-transform:uppercase;margin-left:auto;text-align:right}
.ath-pinrow.err .ath-pinhint{color:#e0645c}
.ath-hor7{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;margin-top:14px;padding:13px 16px;cursor:pointer;
  background:rgba(214,179,106,.05);border:1px solid #d6b36a;border-radius:14px;transition:.3s;
  box-shadow:0 0 9px rgba(244,227,189,.7),0 0 26px rgba(214,179,106,.45),0 0 44px rgba(190,150,80,.3),inset 0 0 9px rgba(214,179,106,.28)}
.ath-hor7 img{height:14px;width:auto;display:block;filter:brightness(1.3) drop-shadow(0 0 9px rgba(244,227,189,.95)) drop-shadow(0 0 26px rgba(214,179,106,.9)) drop-shadow(0 0 44px rgba(190,150,80,.62))}
.ath-hor7:hover{background:rgba(214,179,106,.12);border-color:rgba(214,179,106,.8);box-shadow:0 0 26px -10px rgba(214,179,106,.6)}
.ath-hor7 .g{color:#d6b36a;font-size:12px;text-shadow:0 0 8px rgba(244,227,189,.9),0 0 20px rgba(214,179,106,.6),0 0 34px rgba(190,150,80,.4)}
.ath-hor7{margin-top:12px}
.ath-hor7.grn{background:rgba(47,224,122,.05);border-color:rgba(47,224,122,.45)}
.ath-hor7.grn img{filter:drop-shadow(0 0 10px rgba(47,224,122,.4))}
.ath-hor7.grn:hover{background:rgba(47,224,122,.12);border-color:rgba(47,224,122,.8);box-shadow:0 0 26px -10px rgba(47,224,122,.6)}
.ath-hor7.grn .g{color:#2fe07a}
.ath-brandrow{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;margin-top:12px;padding:13px 16px;cursor:pointer;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.3);border-radius:14px;transition:.3s}
.ath-brandrow img{width:auto;display:block;filter:drop-shadow(0 0 8px rgba(255,255,255,.3))}
.ath-brandrow:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.65);box-shadow:0 0 24px -10px rgba(255,255,255,.45)}
.ath-brandrow .g{color:#d6d9dd;font-size:12px}
.ath-rowname{font-family:var(--mono);font-size:11.7px;letter-spacing:.22em;text-transform:uppercase;color:#d6d9dd;text-shadow:0 1px 8px rgba(0,0,0,.9)}
.ath-rowname.gold{color:#d6b36a;text-shadow:0 0 8px rgba(244,227,189,.6)}
.ath-brandrow:hover .ath-rowname,.ath-hor7:hover .ath-rowname,.ath-base:hover .ath-rowname{color:#fff}
.ath-logoutrow{display:flex;align-items:center;justify-content:center;width:100%;margin-top:16px;padding:12px 16px;cursor:pointer;
  font-family:var(--mono);font-size:11.7px;letter-spacing:.28em;text-transform:uppercase;color:#b9bdc4;
  background:transparent;border:1px solid rgba(255,255,255,.22);border-radius:14px;transition:.3s}
.ath-logoutrow:hover{border-color:rgba(224,100,92,.7);color:#fff;background:rgba(224,100,92,.08)}
.ath-dash{cursor:pointer;font-family:var(--mono);font-size:9px;letter-spacing:.22em;color:#cfd3d8;border:1px solid rgba(255,255,255,.24);border-radius:14px;padding:7px 12px;background:transparent;transition:.25s;text-transform:uppercase}
.ath-dash:hover{border-color:rgba(47,224,122,.6);color:#fff}
.ath-plist{max-height:min(54vh,460px);overflow-y:auto}
.ath-prow{display:flex;align-items:center;gap:14px;padding:14px 4px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.1);transition:.22s;text-shadow:0 1px 8px rgba(0,0,0,.9)}
.ath-prow:hover{border-bottom-color:rgba(47,224,122,.55)}
.ath-prow:hover .ath-pname{color:#fff;text-shadow:0 0 14px rgba(47,224,122,.35)}
.ath-num{font-family:var(--mono);font-size:9px;color:rgba(255,255,255,.32);width:16px;flex-shrink:0}
.ath-pinfo{flex:1;min-width:0}
.ath-pname{font-size:13px;font-weight:600;color:#f0eff0;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ath-paddr{font-family:var(--mono);font-size:9px;color:var(--grey-txt);letter-spacing:.06em;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ath-ptype{font-family:var(--mono);font-size:8px;letter-spacing:.18em;color:#cfd3d8;border:1px solid rgba(255,255,255,.22);border-radius:14px;padding:4px 8px;display:inline-flex;align-items:center;gap:6px;background:transparent;cursor:pointer;flex-shrink:0}
.ath-ptype:hover{border-color:rgba(47,224,122,.55)}
.ath-ptype .d{width:5px;height:5px;border-radius:50%}
.ath-go{color:var(--led);font-size:11px;opacity:0;transform:translateX(-4px);transition:.25s;flex-shrink:0}
.ath-prow:hover .ath-go{opacity:1;transform:none}
.ath-sub{position:absolute;z-index:80;background:rgba(10,11,12,.92);border:1px solid rgba(255,255,255,.16);border-radius:18px;min-width:150px;overflow:hidden;
  -webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 20px 50px -20px #000}
.ath-sub button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:9px 12px;background:transparent;border:none;cursor:pointer;color:#cfd3d8;font-family:var(--mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase}
.ath-sub button:hover{background:rgba(47,224,122,.1);color:#fff}
.ath-arch{padding:12px 4px 4px;font-family:var(--mono);font-size:8px;letter-spacing:.26em;color:rgba(255,255,255,.35);text-transform:uppercase}
.ath-archrow{display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.06);font-size:11px;color:#b9bdc4;text-shadow:0 1px 8px rgba(0,0,0,.9)}
.ath-archrow .a-act{font-family:var(--mono);font-size:8px;letter-spacing:.14em;padding:5px 10px;border-radius:14px;cursor:pointer;background:transparent}
/* hero */
.ath-hero{position:absolute;inset:0;display:grid;place-items:center;transition:opacity .35s, filter .35s;z-index:4;pointer-events:none}
.ath-root.menu-open .ath-hero{opacity:.08;filter:blur(2px)}
.ath-sevenwrap{display:flex;flex-direction:column;align-items:center}
/* ── 7EVEN X · the lockup: the device above the word ──────────────────────
   The word is master artwork and is not animated: it is there from the first
   frame, crisp, bone white. The X is the device, and it is the only thing
   that arrives, fading up slowly over the word. The pair floats, with the
   word's own reflection and a thin line of light beneath it, so the lockup
   sits on water rather than on the page. */
.ath-lockup{display:flex;flex-direction:column;align-items:center;gap:clamp(10px,1.6vw,22px);animation:athFloat 7.5s ease-in-out 1.6s infinite}
@keyframes athFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.ath-xmark{width:clamp(120px,16vw,214px);opacity:0;animation:athXIn 4.2s cubic-bezier(.3,.6,.2,1) .7s forwards}
.ath-xmark path{fill:#fff}
.ath-xmark{filter:drop-shadow(0 0 14px rgba(255,255,255,.5)) drop-shadow(0 0 46px rgba(255,255,255,.26)) drop-shadow(0 0 100px rgba(214,232,255,.2))}
@keyframes athXIn{from{opacity:0}to{opacity:1}}
.ath-seven{width:clamp(228px,34vw,490px);position:relative}
.ath-7stack{position:relative;aspect-ratio:1800/280}
.s7{position:absolute;inset:0;display:block;
  -webkit-mask:url('/seven-mark-white-hd.png') center / contain no-repeat;
  mask:url('/seven-mark-white-hd.png') center / contain no-repeat}
.s7w{background:#f6f4f0;
  filter:drop-shadow(0 0 7px rgba(255,255,255,.5)) drop-shadow(0 0 26px rgba(255,255,255,.22)) drop-shadow(0 3px 18px rgba(0,0,0,.55))}
.ath-xline{width:clamp(300px,42vw,620px);height:1px;margin-top:clamp(14px,2vw,26px);opacity:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.34) 18%,rgba(255,255,255,.55) 50%,rgba(255,255,255,.34) 82%,transparent);
  filter:blur(.4px);animation:athReflIn 2.4s ease-out .9s forwards}
@keyframes athReflIn{to{opacity:1}}
@media(prefers-reduced-motion:reduce){
  .ath-lockup{animation:none}
  .ath-xmark{animation:none;opacity:1}
}
/* the line reads across the lockup with PRECISION on the same axis as the V,
   and the X standing over it */
/* "By design." as it is set on 7even.au: the display serif, italic, in gold */
.ath-bydesign{margin-top:clamp(8px,1.2vw,16px);font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:300;
  font-size:clamp(26px,3.4vw,54px);line-height:1;letter-spacing:-.02em;color:#d6b36a;
  text-shadow:0 0 18px rgba(214,179,106,.35),0 2px 10px rgba(0,0,0,.6);opacity:0;animation:athXIn 2.6s ease-out 1.5s forwards}
.ath-herosub{margin-top:20px;display:grid;grid-template-columns:1fr auto 1fr;align-items:baseline;gap:clamp(10px,2vw,26px);
  width:clamp(228px,34vw,490px);font-family:var(--mono);font-size:7.6px;letter-spacing:.44em;color:var(--grey-txt);text-transform:uppercase}
.ath-herosub .l{text-align:right}
.ath-herosub .c{text-align:center;color:#d7dade;letter-spacing:.5em;padding-left:.5em}
.ath-herosub .r{text-align:left}
/* footer */
.ath-hair{height:1px;background:linear-gradient(90deg,transparent,var(--line) 12%,var(--line) 88%,transparent);position:relative;z-index:4}
.ath-frail{position:relative;z-index:4;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px;padding:14px 2px calc(16px + env(safe-area-inset-bottom,0px));white-space:nowrap}
.ath-fl{display:flex;align-items:center;gap:16px;min-width:0}
.ath-fx{width:12px;height:12px;flex:none}
.ath-fx path{fill:rgba(255,255,255,.62)}
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
.ath-chip{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:transparent;
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

@media(max-width:600px){
  /* ── phone: the lockup centred, the menu where a thumb reaches it ── */
  .ath-tophead{position:fixed;left:0;right:0;top:calc(10px + env(safe-area-inset-top,0px));z-index:22;
    display:flex;justify-content:flex-start;padding:0 10px}
  .ath-tophead > div:first-child{display:none}
  .ath-menuwrap{position:relative;z-index:70}
  .mb{width:54px;height:54px}
  .ath-xmark{width:min(134px,36vw)}
  .ath-seven{width:min(268px,72vw)}
  .ath-xline{width:min(340px,86vw)}
  .ath-herosub{font-size:8px;letter-spacing:.34em;max-width:90vw;width:min(268px,72vw)}
  .ath-bydesign{font-size:30px}
  .ath-pmenu{top:calc(100% + 12px)}
  .ath-footwrap{transition:transform .35s ease,opacity .35s ease}
  .ath-root.menu-open .ath-footwrap{transform:translateY(110%);opacity:0;pointer-events:none}
  .ath-pmenu{position:absolute;top:calc(100% + 14px);right:auto;left:0;transform:translateY(-10px);width:min(90vw,380px);
    max-height:calc(48vh - env(safe-area-inset-bottom,0px));overflow-y:auto;-webkit-overflow-scrolling:touch;
    padding-bottom:calc(14px + env(safe-area-inset-bottom,0px))}
  .ath-pmenu.on{transform:none}
  .ath-plist{max-height:32vh}}
`

/** Session flag for the BASE PIN. Versioned: bump it whenever the PIN changes. */
export const BASE_PIN_KEY = 'base_pin_ok_0808'

export default function ProjectList({ onLogout, onDashboard, onHome }: { onLogout?: () => void; onDashboard?: (brand: '7even' | 'haavn') => void; onHome?: () => void }) {
  const { projects, loadProjects, createProject, setActiveProject, updateProject, deleteProject } = useStore()
  const role = useRole()
  const [menuOpen, setMenuOpen] = useState(false)
  const [baseOpen, setBaseOpen] = useState(false)
  /* ATRIUM ZEROED — Daniel's model, its own engine and its own data, sitting
     in the BASE list beside the feasibilities but sharing nothing with them. */
  const [zeroedOpen, setZeroedOpen] = useState(false)
  // BASE is PIN-gated (Daniel + JB): the wider team holds the app code without
  // reaching the feasibility numbers. SHA-256 — the PIN never ships in the bundle.
  // PIN changed 14 Sep 2026; the session flag is versioned so an unlock with the
  // old PIN doesn't carry over.
  const BASE_PIN_HASH = 'd387d8f016a1e8dd471de17fd837ce101676156ab7d2ec1e395a67d46f3472b0'
  const [baseUnlocked, setBaseUnlocked] = useState<boolean>(() => {
    try { return sessionStorage.getItem(BASE_PIN_KEY) === '1' } catch { return false }
  })
  const [pinPrompt, setPinPrompt] = useState(false)
  const [pinVal, setPinVal] = useState('')
  const [pinErr, setPinErr] = useState(false)
  async function tryPin(v: string) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    if (hex === BASE_PIN_HASH) {
      try { sessionStorage.setItem(BASE_PIN_KEY, '1') } catch { /* ignore */ }
      setBaseUnlocked(true); setPinPrompt(false); setPinVal(''); setPinErr(false)
      setZeroedOpen(true); setMenuOpen(false)          // BASE is ATRIUM Engine now
    } else {
      setPinErr(true); setPinVal('')
      setTimeout(() => setPinErr(false), 900)
    }
  }
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

        {/* top: CAPITAL wings → Capital Base · burger → projects */}
        <div className="ath-tophead">
          <div />
          <div className="ath-menuwrap no-drag" ref={menuRef}>
            <MenuButton open={menuOpen} onClick={() => setMenuOpen(v => !v)} />
            <div className={`ath-pmenu${menuOpen ? ' on' : ''}`}>
              <div className="ath-mh">
                <span>Menu</span>

              </div>
              <button className="ath-brandrow" title="7X — choose a company" onClick={() => { setMenuOpen(false); onHome?.() }}>
                <span className="ath-rowname">7X</span>
                <span className="g">→</span>
              </button>
              {/* BASE — 7EVEN sub-brand. Since 14 Sep 2026 BASE *is* ATRIUM Engine:
                  the old feasibility studio's project list is switched off (its
                  data is untouched in the store). PIN first, then straight in. */}
              <button className="ath-base" title="BASE — ATRIUM Engine" onClick={() => { if (baseUnlocked) { setZeroedOpen(true); setMenuOpen(false) } else { setPinPrompt(v => !v); setPinVal(''); setPinErr(false) } }}>
                <span className="ath-rowname">BASE</span>
                <span className="g">→</span>
              </button>
              {pinPrompt && !baseUnlocked && (
                <div className={`ath-pinrow${pinErr ? ' err' : ''}`}>
                  <span className="ath-pinlbl">PIN</span>
                  <input
                    className="ath-pininp"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    autoFocus
                    placeholder="····"
                    value={pinVal}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                      setPinVal(v); setPinErr(false)
                      if (v.length === 4) void tryPin(v)
                    }}
                  />
                  <span className="ath-pinhint">{pinErr ? 'INCORRECT PIN' : 'AUTHORISED ACCESS ONLY'}</span>
                </div>
              )}
              {/* HORI7ON — 7EVEN sub-brand: project overview display */}
              <button className="ath-brandrow" title="HORI7ON — Project Overview Display" onClick={() => { window.location.href = '/hori7on.html' }}>
                <span className="ath-rowname">HORI7ON</span>
                <span className="g">→</span>
              </button>
              {/* ENTERPRISE — Capital Base / accounts administration (replaces the wings button) */}
              {role !== 'external' && (
                <button className="ath-hor7" title="ENTERPRISE — Accounts &amp; Administration" onClick={() => { setCapitalOpen(true); setMenuOpen(false) }}>
                  <span className="ath-rowname gold">ENTERPRISE</span>
                  <span className="g">→</span>
                </button>
              )}
              {/* HM + HAAVN BLACK — moved in from the footer */}
              <button className="ath-brandrow" title="NAVIGATORS — Management Hub" onClick={() => { setHmOpen(true); setMenuOpen(false) }}>
                <span className="ath-rowname">NAVIGATORS</span>
                <span className="g">→</span>
              </button>
              {/* PROJECT 7 — the philanthropic arm of 7EVEN */}
              <button className="ath-brandrow" title="PROJECT 7 — Not for profit" onClick={() => { window.location.href = '/project-7.html' }}>
                <span className="ath-rowname">PROJECT 7</span>
                <span className="g">→</span>
              </button>
              <button className="ath-logoutrow" onClick={() => onLogout?.()}>LOG OUT</button>
            </div>
          </div>
        </div>

        {/* centre hero — the crisp 7EVEN master */}
        <div className="ath-hero">
          <div className="ath-sevenwrap">
            <div className="ath-lockup">
              <XMark className="ath-xmark" title="7EVEN X" />
              <div className="ath-seven ath-7stack" role="img" aria-label="7EVEN">
                <i className="s7 s7w" />
              </div>
              <div className="ath-bydesign">By design.</div>
            </div>
            <div className="ath-xline" />
            <div className="ath-herosub"><span className="l">7EVEN X</span><span className="c">Precision</span><span className="r">HAAVN X</span></div>
          </div>
        </div>
      </div>

      {/* footer — one line */}
      <div className="ath-footwrap" style={{ position: 'relative', zIndex: 4, padding: '0 clamp(18px,3.4vw,46px)' }}>
        <div className="ath-hair" />
        <div className="ath-frail">
          <div className="ath-fl">
            <span className="ath-atrium"><XMark className="ath-fx" />7EVEN X</span>
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
      {zeroedOpen && <AtriumZeroed onClose={() => setZeroedOpen(false)} onLogout={onLogout} />}
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
