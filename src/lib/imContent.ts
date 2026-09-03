// ── HORI7ON | 7EVEN IM — editorial content per project ────────────────────────
// The NUMBERS come live from the feasibility engine (see imDocument.ts). This
// file holds only the editorial layer: the story, the plate picks and captions,
// lifted from each project's HORI7ON studio entry so the IM reads like the
// portfolio it belongs to.

export interface ImPlate { src: string; cap: string }

export interface ImContent {
  issue: string                 // issue number on the cover rail
  name: string                  // display name (mast)
  nameItalic?: string           // the gold italic half of the mast
  address: string
  city: string
  strategyLine: string          // meta: STRATEGY
  statusLine: string            // meta: STATUS
  engineLine: string            // meta: ENGINE
  headline: string              // "The idea" — one line, no full stop needed
  headlineItalic: string        // gold italic continuation
  lede: string                  // editor's note body (2–4 sentences)
  vision: { mast: string; mastItalic: string; lead: string; meta: [string, string][]; chips: string[] }
  life: { vert: string; vertItalic: string; stats: [string, string][]; copyA: string; copyB: string }
  scheme: { vert: string; vertItalic: string; note: string }
  case: { points: [string, string][] }
  arch?: string
  brandimg?: string             // project wordmark (5IVE) shown on the cover
  partners?: string[]           // partner logos (Marriott / Autograph)
  cover: ImPlate                // full-width cover plate
  contentsPlate: ImPlate        // wide band on the contents page
  visionPlate: ImPlate          // portrait plate on the vision spread
  lifePlates: [ImPlate, ImPlate, ImPlate]  // big + two
  schemePlate: ImPlate          // wide plate on the scheme page
  feasPlate: ImPlate            // portrait plate beside the ledger
  capitalPlate: ImPlate         // plate on the capital page
  casePlates: [ImPlate, ImPlate]
}

const P = (src: string, cap: string): ImPlate => ({ src, cap })

export const IM_CONTENT: Record<string, ImContent> = {

  // ══ ST VILLAGE PRESTON — BTR ══════════════════════════════════════════════
  'seed-preston-001': {
    issue: 'N° 03', name: 'St Village', nameItalic: 'Preston.',
    address: '2–3 Newman Street', city: 'Preston VIC 3072',
    strategyLine: 'Build-to-Rent · 400 homes', statusLine: 'Planning · Live model', engineLine: 'Capital · Enterprise',
    headline: 'Home', headlineItalic: 'on the park.',
    lede: 'St Village Preston is a build-to-rent landmark set on the park — its podium and every home above commanding uninterrupted views across parkland to the Melbourne CBD skyline, seven kilometres away. Four hundred premium residences rise over a world-class ground plane: 1,500 m² of retail and food precinct, 1,500 m² of co-working and more than 1,000 m² of wellness, day-spa and five-star hotel-grade facilities. In a tightly planning-controlled pocket of Preston it is a rare, amenity-led rental community at institutional scale — single ownership, one operator, one standard.',
    vision: {
      mast: 'Home', mastItalic: 'on the park.',
      lead: "Preston's build-to-rent landmark — twin green towers over an arched brick podium, wrapped around a members' club, a bath house and a working ground plane.",
      meta: [['Address', '2–3 Newman Street · Preston VIC 3072'], ['Mandate', 'Asset-backed. Income-generating. Disciplined.'], ['The offer', 'Institutional-scale rental in a supply-starved pocket, 7 km from the CBD.']],
      chips: ['400 BTR residences', 'Park frontage', '7 km to CBD'],
    },
    life: {
      vert: 'Amenity that', vertItalic: 'earns the rent.',
      stats: [['2,911 M²', 'Saints Row Club'], ['1,500 M²', 'Co-working'], ['1,000 M²+', 'Wellness & spa']],
      copyA: "<b>The club is the contract.</b> Residents keep the Saints Row Members Club — dining hall, co-working and an indoor basketball court across 2,911 m² — with a bath house and day spa built to five-star hotel grade below the towers.",
      copyB: 'The arched brick laneways carry 1,112 m² of cafés, dining and retail; 1,500 m² of co-working keeps the working day on site. Amenity depth drives the rental premium — and keeps it, tenancy after tenancy.',
    },
    scheme: { vert: 'Built to the', vertItalic: 'millimetre.', note: 'Every area feeds the cost model on the next page — one engine, no re-typing.' },
    case: { points: [
      ['Park frontage, city views', 'Uninterrupted, podium-up views to the Melbourne CBD skyline — protected by the park itself.'],
      ['400 homes, one owner', 'Single-ownership, institutional-grade rental at scale — long-hold, income-producing.'],
      ['Amenity that earns the rent', 'Club, bath house, co-working and laneway retail drive the premium — and keep it.'],
      ['Supply-constrained pocket', 'Tight planning controls make new scale rental stock in Preston genuinely rare.'],
      ['Policy tailwind', 'Aligned to Victorian Government build-to-rent incentives.'],
    ] },
    cover: P('/im-stv-2.jpg', 'PLATE 01 — TWIN TOWERS FROM THE PARK · GOLDEN HOUR'),
    contentsPlate: P('/im-stv-4.jpg', 'PLATE 02 — THE GREEN TOWER · FRONT ELEVATION'),
    visionPlate: P('/im-stv-3.jpg', '<b>On the park.</b> Planted facades rising over the arched ground plane — capital at work in the built world.'),
    lifePlates: [P('/im-stv-11.jpg', 'FIG. 01 — THE BATH HOUSE'), P('/im-stv-10.jpg', 'FIG. 02 — SAINTS ROW CLUB'), P('/im-stv-8.jpg', 'FIG. 03 — THE LANEWAY')],
    schemePlate: P('/im-stv-1.jpg', 'PLATE 03 — TOWERS OVER THE PODIUM · DUSK'),
    feasPlate: P('/im-stv-7.jpg', 'FIG. 04 — STREET ARRIVAL · DUSK'),
    capitalPlate: P('/im-stv-16.jpg', 'FIG. 05 — ROOFTOP GARDENS · LAST LIGHT'),
    casePlates: [P('/im-stv-6.jpg', 'FIG. 06 — THE CORNER · ROOFTOP GARDEN'), P('/im-stv-13.jpg', 'FIG. 07 — THE RETAIL STREET')],
  },

  // ══ 5IVE HOTELS CALOUNDRA — Hotel ═════════════════════════════════════════
  'seed-caloundra-001': {
    issue: 'N° 01', name: '5IVE Hotels', nameItalic: 'Caloundra.',
    address: '31 Esplanade & 16 Leeding Tce · Bulcock Beach', city: 'Caloundra QLD 4551',
    strategyLine: 'Hotel · Marriott Bonvoy', statusLine: 'Fraser & Partners scheme', engineLine: 'Capital · Enterprise',
    headline: "Australia's first", headlineItalic: '5IVE.',
    lede: "5IVE Caloundra is the first five-star branded hotel on the Sunshine Coast — a Callum Fraser–designed, eight-storey beachfront landmark on the edge of Bulcock Beach. 5IVE is backed and managed by Marriott Bonvoy, the world's largest hotelier, opening a new hotel every 48 hours across more than 10,000 hotels worldwide, and joins its Autograph Collection alongside St Regis, EDITION, The Ritz-Carlton and W Hotels. From a double-frontage site the hotel steps out over the water with a 1,000 m² elevated bar above the ocean, crowned by a rooftop pool, fire pit and bar. Caloundra is one of three host locations for the villages of the 2032 Australian Olympic Games.",
    vision: {
      mast: 'A landmark', mastItalic: 'on the sand.',
      lead: 'Eight storeys of luxury residence hotel on the Bulcock Beach esplanade — an over-water bar, a rooftop pool and the first five-star flag on the Sunshine Coast.',
      meta: [['Address', '31 Esplanade & 16 Leeding Tce · Caloundra QLD'], ['Operator', 'Marriott Bonvoy · Autograph Collection'], ['The offer', 'First-mover five-star position in a supply-starved coastal market.']],
      chips: ['Marriott Bonvoy', 'Autograph Collection', '2032 Olympic host city'],
    },
    life: {
      vert: 'A bar over', vertItalic: 'the ocean.',
      stats: [['1,000 M²', 'Elevated ocean bar'], ['1,036 M²', 'Retail & F&B NSA'], ['48', 'Basement car spaces']],
      copyA: "<b>The arrival is the theatre.</b> A combined drop-off and entry runs beneath a 1,000 m² elevated bar suspended over the water — a destination in its own right before a single key is touched.",
      copyB: 'Above, every key holds an uninterrupted Coral Sea outlook; the roof carries a pool, fire pit and bar for guests and members alike. Ground-floor dining opens straight onto the esplanade and the sand.',
    },
    scheme: { vert: 'Built to the', vertItalic: 'millimetre.', note: 'Fraser & Partners scheme 24014 Rev B — areas feed the cost model on the next page.' },
    case: { points: [
      ['First 5-star on the Sunshine Coast', "The region's first five-star branded hotel — absolute beachfront on the Bulcock Beach esplanade."],
      ['5IVE × Marriott Bonvoy', 'Autograph Collection — the family of St Regis, EDITION, The Ritz-Carlton and W Hotels; 10,000+ hotels worldwide.'],
      ['A 1,000 m² bar over the ocean', 'An elevated over-water bar with combined drop-off and entry — a destination in itself.'],
      ['Rooftop pool & fire pit', 'Crowning amenity with uninterrupted Coral Sea horizons.'],
      ['2032 Olympic Games', 'One of three host locations for the Australian Games villages — a decade-long demand runway.'],
    ] },
    arch: 'Callum Fraser · Fraser & Partners',
    brandimg: '/5ive-hotels-white.png',
    partners: ['/marriott-bonvoy-white.png', '/autograph-collection-white.png'],
    cover: P('/im-5ive-1.jpg', 'PLATE 01 — 31 ESPLANADE · EIGHT STOREYS OVER BULCOCK BEACH'),
    contentsPlate: P('/im-5ive-0.jpg', 'PLATE 02 — THE ESPLANADE ELEVATION'),
    visionPlate: P('/im-5ive-3.jpg', '<b>Over the water.</b> The rooftop at dusk — pool, fire pit and bar above the Coral Sea.'),
    lifePlates: [P('/im-5ive-4.jpg', 'FIG. 01 — ROOFTOP POOL · SUNSET'), P('/im-5ive-3.jpg', 'FIG. 02 — THE FIRE PIT'), P('/im-5ive-2.jpg', 'FIG. 03 — STREET ARRIVAL & CAFE')],
    schemePlate: P('/im-5ive-0.jpg', 'PLATE 03 — THE BEACHFRONT ELEVATION'),
    feasPlate: P('/im-5ive-2.jpg', 'FIG. 04 — CAFE & BRONZE STAIR'),
    capitalPlate: P('/im-5ive-4.jpg', 'FIG. 05 — ROOFTOP POOL · LAST LIGHT'),
    casePlates: [P('/im-5ive-1.jpg', 'FIG. 06 — THE ESPLANADE APPROACH'), P('/im-5ive-3.jpg', 'FIG. 07 — ROOFTOP AT DUSK')],
  },

  // ══ CUNNINGHAM PLACE — Geelong BTR ════════════════════════════════════════
  'geelong-35-corio': {
    issue: 'N° 02', name: 'Cunningham', nameItalic: 'Place.',
    address: '35 Corio Street', city: 'Geelong VIC 3220',
    strategyLine: 'Build-to-Rent + Sell', statusLine: 'Fraser & Partners design', engineLine: 'Capital · Enterprise',
    headline: 'Two towers.', headlineItalic: 'One landmark.',
    lede: "Cunningham Place is a two-tower, Callum Fraser–designed landmark rising over a world-class food, beverage and premium market podium in the centre of Geelong's CBD. Tower One delivers premium build-to-rent apartments; Tower Two, premium build-to-sell residences — every home commanding uninterrupted views from the podium up across Geelong's world-class harbour. Anchored to more than $3 billion of committed pipeline — hotels, residential and harbour upgrades — it is simplicity and elegance at civic scale.",
    vision: {
      mast: 'The new heart', mastItalic: "of Geelong's CBD.",
      lead: 'Twin towers over a premium market and food hall, with protected views across Corio Bay from the podium up.',
      meta: [['Address', '35 Corio Street · Geelong VIC 3220'], ['Tenure', 'Dual — build-to-rent and build-to-sell'], ['The offer', 'BTR income plus BTS capital velocity in one landmark.']],
      chips: ['Two towers', 'Harbour views', '$3B+ pipeline halo'],
    },
    life: {
      vert: 'A ground plane', vertItalic: 'that works.',
      stats: [['1,936 M²', 'Retail & supermarket'], ['3,038 M²', 'Wellness & commercial'], ['2,216 M²', 'Communal amenity']],
      copyA: '<b>The podium is the city.</b> A premium market and food-and-beverage hall activates the CBD core at street level, with wellness and commercial floors above and a ballroom, auditorium and rooftop terraces for residents.',
      copyB: "Every home above the podium holds a protected outlook across Geelong's world-class waterfront — an outlook the surrounding $3 billion of committed hotel, residential and harbour investment can only reinforce.",
    },
    scheme: { vert: 'Built to the', vertItalic: 'millimetre.', note: 'Fraser & Partners design — areas feed the cost model on the next page.' },
    case: { points: [
      ['Two towers, one address', 'Premium build-to-rent and premium build-to-sell residences over a shared podium.'],
      ['Uninterrupted harbour views', "A protected outlook from the podium up across Geelong's world-class waterfront."],
      ['A Callum Fraser icon', 'Fraser & Partners–designed — simplicity and elegance at civic scale.'],
      ['World-class ground plane', 'A premium market and food-and-beverage hall activating the CBD core.'],
      ['A $3B+ pipeline halo', 'Anchored to committed hotel, residential and harbour-upgrade investment.'],
    ] },
    arch: 'Callum Fraser · Fraser & Partners',
    cover: P('/im-cun-1.jpg', 'PLATE 01 — TWIN TOWERS OVER THE PODIUM · CORIO STREET'),
    contentsPlate: P('/im-cun-0.jpg', 'PLATE 02 — THE TOWERS FROM THE BAY'),
    visionPlate: P('/im-cun-3.jpg', '<b>Over the harbour.</b> Planted terraces stepping up from the podium — protected views to Corio Bay.'),
    lifePlates: [P('/im-cun-2.jpg', 'FIG. 01 — ELEVATED GARDEN TERRACES'), P('/im-cun-4.jpg', 'FIG. 02 — THE MARKET HALL'), P('/im-cun-1.jpg', 'FIG. 03 — CORIO STREET ARRIVAL')],
    schemePlate: P('/im-cun-0.jpg', 'PLATE 03 — THE CIVIC ELEVATION'),
    feasPlate: P('/im-cun-3.jpg', 'FIG. 04 — THE GREEN FACADE'),
    capitalPlate: P('/im-cun-4.jpg', 'FIG. 05 — PREMIUM MARKET & F&B HALL'),
    casePlates: [P('/im-cun-2.jpg', 'FIG. 06 — GARDEN TERRACES'), P('/im-cun-1.jpg', 'FIG. 07 — THE STREET')],
  },

  // ══ WAURNVALE DRIVE — Geelong BTS village ═════════════════════════════════
  'seed-geelong-001': {
    issue: 'N° 04', name: 'Waurnvale', nameItalic: 'Drive.',
    address: '48 Waurnvale Drive', city: 'Belmont, Geelong VIC 3216',
    strategyLine: 'Master-planned village', statusLine: 'Fraser & Partners master plan', engineLine: 'Capital · Enterprise · Project 7',
    headline: 'A village', headlineItalic: 'with a soul.',
    lede: "Waurnvale Drive is a 7.5-acre master-planned village in Belmont, Geelong's established outer south — delivered in partnership with the local church. 7EVEN Developments and the congregation are building a genuine town centre together: a world-class convention centre and community church at the heart of the site, new homes rising from garden buildings to seven-storey towers around a water-led central green, and more than 3,000 m² of wellness, co-working, medical suites, cafes and restaurants at the ground plane. Inspired by the historic chain of ponds, the landscape weaves swales, ponds and indigenous planting through every street.",
    vision: {
      mast: 'Australia’s first', mastItalic: 'church-partnered village.',
      lead: 'A convention centre and community church anchor the neighbourhood from day one — activation no competitor can buy, minutes from Deakin University.',
      meta: [['Address', '48 Waurnvale Drive · Belmont, Geelong VIC'], ['Partnership', 'Delivered with the local church congregation'], ['The offer', 'Staged build-to-sell releases with early capital velocity.']],
      chips: ['7.5 acres', 'Church partnership', 'Deakin corridor'],
    },
    life: {
      vert: 'A community with', vertItalic: 'a built-in heart.',
      stats: [['1,520 M²', 'Convention centre'], ['960 M²', 'Childcare'], ['3,000 M²+', 'Wellness & lifestyle']],
      copyA: '<b>The heart comes first.</b> A 1,520 m², two-level convention centre and community church delivers conferences, worship and community programs — weekday and weekend activation from the day the doors open.',
      copyB: 'Around it: wellness centre, co-working, medical suites, childcare, cafes and restaurants at the ground plane, with swales, ponds and indigenous planting recalling the historic chain of ponds through every street.',
    },
    scheme: { vert: 'Built to the', vertItalic: 'millimetre.', note: 'Fraser & Partners master plan 25042 — areas feed the cost model on the next page.' },
    case: { points: [
      ['A community with a built-in heart', "Australia's first church-partnered master-planned village — the congregation and convention centre anchor the neighbourhood from day one."],
      ['New homes on 7.5 acres', 'From three-storey garden buildings to seven-storey towers across four parcels, wrapped around a central park and playground.'],
      ['A world-class convention centre', "A 1,520 m², two-level venue delivering conferences, worship and community programs — activation other projects can't buy."],
      ['3,000 m²+ of daily life', 'Wellness centre, co-working, medical suites, childcare, cafes and restaurants at the ground plane.'],
      ['The Deakin corridor', 'Minutes from Deakin University, Waurn Ponds Shopping Centre and the aquatic & recreation precinct.'],
    ] },
    arch: 'Callum Fraser · Fraser & Partners',
    cover: P('/im-wv-0.jpg', 'PLATE 01 — THE CONVENTION CENTRE ON THE FOUNTAIN PLAZA'),
    contentsPlate: P('/im-wv-2.jpg', 'PLATE 02 — THE BOULEVARD · WATER-LED STREETS'),
    visionPlate: P('/im-wv-8.jpg', '<b>The village heart.</b> The church from the roundabout — the anchor the neighbourhood is built around.'),
    lifePlates: [P('/im-wv-5.jpg', 'FIG. 01 — THE COLONNADE'), P('/im-wv-1.jpg', 'FIG. 02 — GARDEN BUILDINGS AT DUSK'), P('/im-wv-3.jpg', 'FIG. 03 — CORNER ARRIVAL & CAFES')],
    schemePlate: P('/im-wv-6.jpg', 'PLATE 03 — THE MASTERPLAN FROM ABOVE · SOLAR ROOFS'),
    feasPlate: P('/im-wv-9.jpg', 'FIG. 04 — COURTYARD HOMES'),
    capitalPlate: P('/im-wv-7.jpg', 'FIG. 05 — SUNSET OVER THE VILLAGE'),
    casePlates: [P('/im-wv-4.jpg', 'FIG. 06 — BELMONT FROM ABOVE'), P('/im-wv-2.jpg', 'FIG. 07 — THE BOULEVARD')],
  },

  // ══ 575 DERRIMUT ROAD TARNEIT — mixed-use town centre ═════════════════════
  'proj-tarneit-575': {
    issue: 'N° 05', name: '575 Derrimut', nameItalic: 'Road.',
    address: '575 Derrimut Road, cnr Leakes Road', city: 'Tarneit VIC 3029',
    strategyLine: 'Mixed-use town centre', statusLine: 'Town planning · flōdesign', engineLine: 'Capital · Enterprise',
    headline: 'The town centre of', headlineItalic: "Australia's fastest corridor.",
    lede: "575 Derrimut Road is a master plan on 6.4 hectares at the corner of Leakes Road, Tarneit — the largest development in the area, in one of Australia's fastest-growing growth corridors. Sections 1–3 deliver six buildings and more than 120,000 m²: a Novotel hotel with 188 keys, function centre, restaurant, gym and pool; a dedicated health building pairing a doctors surgery and medical care with 150 aged-care suites; and four mixed-use buildings layering commercial offices, retail, food & beverage and apartments over an activated main-street ground plane.",
    vision: {
      mast: 'A town centre,', mastItalic: 'not a subdivision.',
      lead: 'Hotel, health, aged care, offices, retail and homes on one 6.4-hectare corner — minutes from Tarneit station, 25 minutes to the Melbourne CBD.',
      meta: [['Address', '575 Derrimut Road, cnr Leakes Road · Tarneit VIC'], ['Design', 'flōdesign — Sections 1–3 in town planning'], ['The offer', 'The largest development in the area, staged across three sections.']],
      chips: ['6.4 hectares', 'Novotel 188 keys', '25 min to CBD'],
    },
    life: {
      vert: 'Everything the', vertItalic: 'corridor lacks.',
      stats: [['188', 'Novotel hotel keys'], ['20,058 M²', 'Health & aged care'], ['6,900 M²+', 'Commercial & retail']],
      copyA: '<b>A hotel anchors the corner.</b> A 188-key Novotel with a 1,247 m² function centre, restaurant, gym and pool gives the corridor a business and events address it has never had.',
      copyB: 'Beside it, a dedicated health building pairs a doctors surgery and medical care with 150 aged-care suites, while four mixed-use buildings layer offices, retail and food & beverage beneath apartments on an activated main street.',
    },
    scheme: { vert: 'Built to the', vertItalic: 'millimetre.', note: 'flōdesign Sections 1–3 — six buildings, 120,870 m² GFA. Areas feed the cost model on the next page.' },
    case: { points: [
      ['The largest development in the area', "A master-planned town centre in one of Australia's fastest-growing corridors."],
      ['A Novotel hotel anchor', '188 keys plus a 1,247 m² function centre, restaurant, gym and pool — a business address for the corridor.'],
      ['Health and aged care', 'A dedicated building pairing a doctors surgery and medical care with 150 aged-care suites.'],
      ['An activated main street', 'Offices, retail and food & beverage under apartments — daily life at the ground plane.'],
      ['25 minutes to the CBD', 'Tarneit station minutes away, with Tarneit Central, schools and the recreation precinct at the doorstep.'],
    ] },
    arch: 'flōdesign',
    cover: P('/im-dm-2.jpg', 'PLATE 01 — THE MAIN STREET FROM ABOVE'),
    contentsPlate: P('/im-dm-1.jpg', 'PLATE 02 — THE MASTERPLAN · SECTIONS 1–3'),
    visionPlate: P('/im-dm-3.jpg', '<b>The corner.</b> The hotel and health buildings anchoring Derrimut and Leakes Roads.'),
    lifePlates: [P('/im-dm-0.jpg', 'FIG. 01 — THE BOULEVARD'), P('/im-dm-4.jpg', 'FIG. 02 — COMMERCIAL & RETAIL'), P('/im-dm-6.jpg', 'FIG. 03 — THE MIXED-USE BUILDINGS')],
    schemePlate: P('/im-dm-1.jpg', 'PLATE 03 — SECTIONS 1–3 FROM ABOVE'),
    feasPlate: P('/im-dm-3.jpg', 'FIG. 04 — THE HOTEL TOWER'),
    capitalPlate: P('/im-dm-5.jpg', 'FIG. 05 — THE HEALTH BUILDING'),
    casePlates: [P('/im-dm-7.jpg', 'FIG. 06 — THE STREET'), P('/im-dm-0.jpg', 'FIG. 07 — THE APPROACH')],
  },
}

/** Fallback content for a project with no editorial entry yet — the IM still
 *  generates, carrying the live numbers with neutral copy. */
export function fallbackContent(name: string, address: string, type?: string): ImContent {
  const strat = type === 'hotel' ? 'Hotel' : type === 'bts' ? 'Build-to-Sell' : type === 'btr' ? 'Build-to-Rent' : 'Mixed-use'
  return {
    issue: 'N° —', name, address, city: '',
    strategyLine: strat, statusLine: 'Live model', engineLine: 'Capital · Enterprise',
    headline: 'A 7EVEN', headlineItalic: 'development.',
    lede: `${name} is a ${strat.toLowerCase()} development in the 7EVEN portfolio. The figures in this memorandum are live outputs of the 7EVEN ATRIUM feasibility engine — cost stack, cashflow-plotted finance waterfall and conservative-basis valuation.`,
    vision: { mast: 'The', mastItalic: 'opportunity.', lead: `${name} — ${address}.`, meta: [['Address', address], ['Strategy', strat], ['Mandate', 'Asset-backed. Income-generating. Disciplined.']], chips: [strat] },
    life: { vert: 'The', vertItalic: 'project.', stats: [], copyA: '', copyB: '' },
    scheme: { vert: 'Built to the', vertItalic: 'millimetre.', note: 'Areas feed the cost model on the next page.' },
    case: { points: [] },
    cover: P('', ''), contentsPlate: P('', ''), visionPlate: P('', ''),
    lifePlates: [P('', ''), P('', ''), P('', '')],
    schemePlate: P('', ''), feasPlate: P('', ''), capitalPlate: P('', ''),
    casePlates: [P('', ''), P('', '')],
  }
}
