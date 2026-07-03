import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Props {
  address: string
  pinLabel?: string
}

function makePinSvg(label: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="58" viewBox="0 0 48 58">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
    </filter>
  </defs>
  <path d="M24 0 C10.7 0 0 10.7 0 24 C0 37.3 24 58 24 58 C24 58 48 37.3 48 24 C48 10.7 37.3 0 24 0Z" fill="#0A0A0A" filter="url(#shadow)"/>
  <circle cx="24" cy="24" r="17" fill="none" stroke="#C4973A" stroke-width="1.5"/>
  <circle cx="24" cy="24" r="14" fill="#0A0A0A"/>
  <text x="24" y="29" text-anchor="middle" font-family="Georgia,serif" font-size="14" font-weight="900" fill="#C4973A" letter-spacing="-1">${label}</text>
</svg>`
}

function makePinIcon(label: string) {
  return L.divIcon({
    html: makePinSvg(label),
    className: '',
    iconSize: [48, 58],
    iconAnchor: [24, 58],
    popupAnchor: [0, -58],
  })
}

async function geocode(address: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en-AU' } })
    const data = await res.json()
    if (data.length === 0) return null
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  } catch {
    return null
  }
}

export default function ProjectMap({ address, pinLabel = '7' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle')

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) return // already initialised

    const map = L.map(containerRef.current, {
      center: [-25.2744, 133.7751], // Australia centre
      zoom: 4,
      zoomControl: true,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      maxNativeZoom: 19,
      detectRetina: true,
      attribution: '© <a href="https://carto.com/attributions" style="color:#C4973A;font-size:8px">CARTO</a>',
    }).addTo(map)

    L.control.attribution({ prefix: false }).addTo(map)

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    if (!address || address.length < 5) return
    const map = mapRef.current
    if (!map) return

    const timer = setTimeout(async () => {
      setStatus('loading')
      const coords = await geocode(address)
      if (!coords) { setStatus('notfound'); return }

      // Remove old marker
      if (markerRef.current) markerRef.current.remove()

      const marker = L.marker(coords, { icon: makePinIcon(pinLabel) })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif;font-size:11px;color:#1A1A1A;padding:4px 2px;min-width:140px">
            <div style="color:#C4973A;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:4px">7EVEN · HAAVN</div>
            <div style="font-weight:600">${address.split(',').slice(0, 2).join(',')}</div>
          </div>
        `, { className: 'haavn-popup' })

      markerRef.current = marker
      map.flyTo(coords, 15, { duration: 1.4 })
      setStatus('found')
    }, 600)

    return () => clearTimeout(timer)
  }, [address])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 340 }}>
      {/* Dark map container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 340 }} />

      {/* Brand overlay — top right of map */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 500,
        background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(8px)',
        border: '1px solid #1E1E1E', padding: '10px 16px',
        pointerEvents: 'none',
      }}>
        <div style={{ height: 1, background: 'linear-gradient(to right,#C4973A,#E8B84B)', marginBottom: 10 }} />
        <img
          src="/brand-logo-white.png"
          alt="7EVEN · HAAVN"
          style={{ width: 100, height: 'auto', display: 'block' }}
        />
        <p style={{ color: '#fff', fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', margin: '8px 0 0', fontWeight: 600 }}>Site Location</p>
      </div>

      {/* Status indicators */}
      {status === 'loading' && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 500,
          background: 'rgba(10,10,10,0.82)', color: '#C4973A', fontSize: 9,
          letterSpacing: '0.2em', textTransform: 'uppercase', padding: '6px 14px',
        }}>
          Locating…
        </div>
      )}
      {status === 'notfound' && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 500,
          background: 'rgba(10,10,10,0.82)', color: '#9B2335', fontSize: 9,
          letterSpacing: '0.2em', textTransform: 'uppercase', padding: '6px 14px',
        }}>
          Address not found
        </div>
      )}

      <style>{`
        .leaflet-tile-pane { filter: grayscale(100%); }
        .leaflet-marker-pane,
        .leaflet-shadow-pane,
        .leaflet-overlay-pane,
        .leaflet-popup-pane,
        .leaflet-control-zoom { filter: none !important; }
        .haavn-popup .leaflet-popup-content-wrapper {
          background: #fff; border-radius: 0; border: 1px solid #E0DDD8;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15); padding: 0;
        }
        .haavn-popup .leaflet-popup-tip { background: #fff; }
        .haavn-popup .leaflet-popup-content { margin: 10px 14px; }
        .leaflet-control-zoom a {
          background: #0A0A0A !important; color: #C4973A !important;
          border-color: #1E1E1E !important; border-radius: 0 !important;
        }
        .leaflet-control-zoom a:hover { background: #1A1A1A !important; }
      `}</style>
    </div>
  )
}
