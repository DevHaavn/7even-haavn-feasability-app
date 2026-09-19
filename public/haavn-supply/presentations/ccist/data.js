/* ═══════════════════════════════════════════════════════════════════════════
   HAAVN · PRESENTATION TO CCIST — CONTENT
   Everything the team edits lives in this file. index.html holds the design,
   deck.js holds the engine. Neither needs touching to change what is said.

   Sources
     Pillars + process  : Seth's HAAVN website copy (three pillars mockup)
     Partners           : Haavn Consultant Directory.xlsx, design team tab
     Pipeline           : Haavn Projects - Pipeline.xlsx
     CRM                : Haavn_Partner_CRM.xlsx
     Case study 1       : Preston crane animation from the 7EVEN site
     Case study 2       : HAAVN BLACK SOLUM mini brochure
   ══════════════════════════════════════════════════════════════════════════ */

const MEETING = {
  audience : 'CCIST',
  title    : 'HAAVN',
  date     : 'September 2026',
  place    : 'Abbotsford, Victoria',
  presenter: 'James Winstanley',
  ref      : 'HAAVN · CCIST · 2026'
};

/* ── PARTNERS, by discipline. Straight from the consultant directory. ───── */
const PARTNERS = [
  ['Architect',                     ['Fraser and Partners','LIFE Architecture','Cox','Architectus','FK','Parallel Workshop']],
  ['Structural engineer',           ['EDGE Consulting Engineers','Hera','Pivot','Webber Design','Northrop']],
  ['Civil engineer',                ['Intrax','EDGE Consulting Engineers','Northrop']],
  ['Services engineer',             ['IGS','Di Marzio Consulting',"O'Neill Group"]],
  ['Fire engineering',              ['Red Fire Engineers','SQR1']],
  ['Acoustic engineer',             ['Acoustic Logic','Arup']],
  ['Building surveyor / certifier', ['Checkpoint','SWA','JAZ','Floreancig Smith']],
  ['Compliance',                    ['Unison Modular']],
  ['Quantity surveyor',             ['Drawdown Partners','Slattery']],
  ['Builder',                       ['Hamilton Marino','Ironside','HACER','Multiplex','Hutchinson Builders']],
  ['Capital and delivery',          ['7EVEN','HAAVN Management','CCIST']]
];

/* ── PIPELINE. Latest from Callum and James, 18 September 2026. ───────────
   [project, type, client, order value $m, modules, storeys, stage, state]  */
const PIPELINE = [
  ["575 Derrimut Road, Tarneit", "Mixed use BTS", "7EVEN", 188.8, 3312, 14, "Plan rework", "VIC"],
  ["Merrimu Stage 1", "Low rise multi", "7EVEN", 110.8, 2491, 3, "Plan rework", "VIC"],
  ["1-3 Newman Street, Preston", "Mixed use BTR", "7EVEN", 70.4, 724, 14, "CCIST partition complete", "VIC"],
  ["35 Corio Street, Geelong", "Mixed use BTS", "7EVEN", 70.4, 200, 17, "Plan rework", "VIC"],
  ["21-25 Bouverie Street, Carlton", "Hotel", "", 11.9, 286, 17, "Plan rework", "VIC"],
  ["8 Warley Avenue, Cowes", "BTS", "", 9.8, 204, 3, "Plan rework", "VIC"],
  ["209-211 Clayton Road, Clayton", "Mixed use BTR", "", 8.6, 96, 4, "Plan rework", "VIC"],
  ["8 Carnarvon Street, Doncaster", "Aged care", "", 7.8, 92, 8, "Concept", "VIC"],
  ["Eden Cove Stage 1", "Low rise multi", "Anthony Doumit", 7.3, 175, 2, "Plan rework", "NSW"],
  ["11-17 Ardlie Street, Westmeadows", "Hotel", "", 6.6, 34, 3, "Concept", "VIC"],
  ["Wattle Street, Bendigo", "Hotel, apart.", "", 6.4, 88, 3, "Plan rework", "VIC"],
  ["Williams Landing", "Hotel", "Quest", 6.4, 90, 4, "Plan rework", "VIC"],
  ["53-59 Church Street, Geelong West", "BTS", "", 6.2, 41, 2, "Concept", "VIC"],
  ["Fabstone River Hotel", "Hotel", "Fabstone Invest.", 5.4, 84, 3, "Concept", "TAS"],
  ["259-265 Lava Street, Warrnambool", "Hotel", "", 5.2, 101, 3, "Plan rework", "VIC"],
  ["Bulcock Beach, Caloundra", "Hotel", "", 4.1, 75, 6, "Plan rework", "QLD"],
  ["7-9 Warrina Street, Chadstone", "BTS", "", 1.1, 12, 2, "Plan rework", "VIC"]
];

/* ── CRM SNAPSHOT. Figures from James, 18 September 2026.
   Active = live conversations. Potential = identified, not yet approached.
   bySector splits the active leads across the six sectors on slide 7. */
const CRM = {
  active: 17,
  potential: 27,
  bySector: [
    ['build-to-rent',         'Build to rent',       2],
    ['affordable-housing',    'Affordable housing',  1],
    ['aged-care',             'Senior living',       1],
    ['student-accommodation', 'Student living',      0],
    ['hotels',                'Hotels',              7],
    ['data-centre',           'Multi-residential',   6]
  ],
  toAssign: 0
};

/* ── HAAVN BLACK LAUNCH ──────────────────────────────────────────────────
   The live HAAVN BLACK landing page, animation and soundtrack together,
   shown straight after the first HAAVN BLACK brochure page. The soundtrack
   is generated in the page itself and starts when the slide opens. */
const LAUNCH = { type:'live', section:'HAAVN BLACK', title:'Launch film', theme:'dark',
  src:'assets/landing/index.html',
  notes:'Sound up. This is the HAAVN BLACK launch page running live, the same one going to market on 15 October. Let the first pass of the light show and the scan play out before you talk.' };

/* ── DECK ──────────────────────────────────────────────────────────────── */
const DECK = [

/* 01 */ { type:'cover', theme:'cover', title:'Welcome CCIST',
  notes:'The haavn.au landing, playing live. Let the wordmark land and the colour flick finish before you speak. Then: we are here to show CCIST the order book we are building and the standard we hold ourselves to.' },

/* 02 */ { type:'contents', title:'Contents' },

/* 03 */ { type:'statement', section:'HAAVN', title:'Who we are', theme:'light',
  mark:'Who we are',
  h:'One structure. <b>Three disciplines.</b> A better outcome.',
  body:[
    'HAAVN is a Melbourne based management, intelligence and precision manufacturing supply group for the construction industry. We do the three things that decide whether a project succeeds, and we do them under one structure.',
    'Three pillars. One outcome, a smarter, faster, better build.'
  ],
  tag:'The home that arrives.',
  notes:'Say the three pillars out loud before the next slide shows them. Management, Intelligence, Precision. Everything in this deck hangs off those three words.' },

/* ── MIP: MANAGEMENT · INTELLIGENCE · PRECISION ───────────────────────────
   Management content from the 7EVEN site Management page, Intelligence and
   Precision from the 7EVEN site HAAVN page. */

/* 04 */ { type:'mipdiv', section:'MIP', title:'The MIP process', theme:'dark',
  mark:'The HAAVN method',
  s:'Three disciplines run as one process. The reason HAAVN and CCIST can deliver precision manufactured building in Australia at scale.',
  letters:[
    ['M','Management',  'We manage','Every consultant and service under one structure, with one point of accountability from feasibility to handover.'],
    ['I','Intelligence','We integrate','Every project designed for the CCIST line before a module is ordered, and the site sequenced to meet it.'],
    ['P','Precision',   'We supply and support','Precision manufactured build form, delivered complete to site and supported through installation.']
  ],
  notes:'This is the heart of the deck. Say MIP once, clearly, and tell them the next few slides show why it matters to them.' },

/* 07 */ { type:'lifecycle', section:'MIP', title:'The lifecycle', theme:'dark',
  mark:'M · The lifecycle',
  h:'One partner, every stage. <b>No hand offs.</b>',
  stages:['Acquisition & feasibility','Planning & approvals','Design for manufacture','Precision manufacture','Construction delivery','Handover','Hold or exit'],
  line:[2,3],
  features:[
    ['01','Project management','Feasibility to practical completion','One team runs the program, the cost and the quality from the first feasibility to the day the keys are handed over.'],
    ['02','Technology led delivery','Data · Automation · Precision','Digital programming, live reporting and precision manufacture give every project the same visibility and certainty.'],
    ['03','Asset & hotel management','Leasing · Stabilisation · Hospitality','Leasing, stabilisation and long term operation. One owner, one operator, one standard.']
  ],
  notes:'Point at stages 03 and 04, lit in lime. That is where CCIST sits inside the lifecycle, and HAAVN holds every stage either side of it.' },

/* 09 */ { type:'program', section:'MIP', title:'Parallel, not sequential', theme:'dark',
  mark:'I · The program',
  h:'Factory and site run <b>in parallel.</b>',
  trad:[ ['Design & approvals',0,22], ['Site & structure',22,34], ['Fit out & services',56,30], ['Handover',86,14] ],
  mip:[  ['Design for manufacture',0,22], ['Site works · builder',22,26,'site'], ['Manufacture · CCIST',22,26,'line'], ['Set & connect',48,12], ['Handover',60,10] ],
  outcomes:[ ['Less time','Factory and site run together, not one after the other.'], ['Less cost','Waste, rework and variations engineered out first.'], ['Better quality','Controlled conditions, verified before dispatch.'], ['Better outcome','One process, the builder set up to succeed.'] ],
  notes:'Illustrative sequence, not a program for a specific project. The shape is the point: the CCIST line and the site run at the same time, so the building arrives sooner.' },

/* 11 */ { type:'sectorsgrid', section:'MIP', title:'What we supply', theme:'stone',
  mark:'P · What we supply',
  h:'Six sectors. <b>One line.</b>',
  items:[
    ['build-to-rent','Build to rent','Repeatable apartment typologies across sale, rental and mixed tenure.'],
    ['affordable-housing','Affordable housing','Community housing compliant plans at a fixed supply rate and program.'],
    ['aged-care','Senior living','Care ready rooms with services installed and commissioned in factory.'],
    ['student-accommodation','Student living','High density studio and cluster rooms on tight inner city sites.'],
    ['hotels','Hotels','Key ready rooms including bathroom pods, FF&E and finishes.'],
    ['data-centre','Multi-residential','Low to high rise. Apartment and townhouse product on one repeating module set.']
  ],
  notes:'Every one of these runs down the same CCIST line. Volume across six sectors is what keeps the line busy.' },

/* 09 */ { type:'marquee', section:'Partners', title:'Partners', theme:'light',
  mark:'Partners and consultants',
  h:'The team <b>around every project.</b>',
  rows:PARTNERS,
  notes:'Let this run while you talk. The point is depth, not names. Forty plus firms already work inside the HAAVN structure, and every one of them now designs knowing the factory is at the other end.' },

/* 10 */ { type:'divider', section:'Pipeline', title:'Pipeline', theme:'dark',
  mark:'The order book', n:'01',
  h:'The<br>Pipeline',
  s:'Seventeen live projects across four states. What is coming to the line, what stage it is at, and what it is worth.',
  m:['17 projects','8,105 modules','$527m order value','VIC · NSW · QLD · TAS'],
  notes:'Take a breath before this. The order book is the whole reason for the meeting.' },

/* 12 */ { type:'score', section:'Pipeline', title:'Pipeline in numbers', theme:'dark',
  mark:'The pipeline',
  hero:{ pre:'$', to:500, suf:'M+', l:'Order value · AUD', n:'Module orders in our pipeline now exceed five hundred million dollars.' },
  stats:[
    { to:17,   l:'Projects in pipeline' },
    { to:6,    l:'Clients committed to HAAVN' },
    { to:4,    l:'States supplied', chips:['VIC','NSW','QLD','TAS'] },
    { to:8000, suf:'+', l:'Modules in pipeline' }
  ],
  notes:'Let the numbers land, do not read them. Then one line: this is what is already coming to the line.' },

/* 13 */ { type:'crm', section:'Pipeline', title:'CRM Snapshot', theme:'stone',
  mark:'Trade and channel partners',
  h:'CRM <b>Snapshot.</b>',
  notes:'Seventeen active leads, led by hotels and multi-residential, with twenty seven developers identified behind them.' },

/* 14 */ { type:'divider', section:'Preston', title:'Case study 01', theme:'dark',
  mark:'Case study 01', n:'02',
  h:'Preston',
  s:'1-3 Newman Street, Preston. Mixed use build to rent for 7EVEN. Fourteen storeys, 724 modules, approximately $70m to the line. Partition complete at CCIST.',
  m:['724 modules','14 storeys','$70m approx.','Fraser and Partners'],
  notes:'This is the one that is real. Partition is complete. Everything after this slide is about showing them we understand how it goes together.' },

/* 15 */ { type:'video', section:'Preston', title:'Assembly film', theme:'dark',
  mark:'Modular assembly · Two minutes',
  h:'A floor a day.',
  p:'Ground floor in situ, level one and above modular. Twelve by three and a half metre modules craned and connected in sequence.',
  src:'assets/video/preston-modular.mp4',
  loop:true, muted:true, autoplay:true,
  cinema:true,   /* the film carries its own titles; nothing on top */
  score:true,    /* the HAAVN BLACK launch score plays underneath */
  notes:'Two minutes twelve, with the HAAVN BLACK score underneath. It starts on its own, V pauses it. Do not talk over the first thirty seconds. Then point out the split: ground floor in situ, everything above it factory built. That is what makes the program work.' },

/* 16 */ { type:'metrics', section:'Preston', title:'Preston numbers', theme:'light',
  mark:'Preston · Key numbers',
  h:'1-3 Newman Street, <b>Preston.</b>',
  stats:[
    { v:'724',  u:'',    l:'Modules',          n:'Volumetric modules across fourteen storeys, on a repeating plate.' },
    { v:'70', u:'$m',  l:'Module order value, approx.',n:'The first project in the book to reach partition at CCIST.' },
    { v:'14',   u:'lvl', l:'Storeys',          n:'Ground floor in situ, levels one to fourteen manufactured.' }
  ],
  notes:'Client is 7EVEN, architect is Fraser and Partners, permit status is letter of acceptance DFP. Have those three ready.' },

/* 17 */ { type:'divider', section:'HAAVN BLACK', title:'Case study 02', theme:'dark',
  mark:'Case study 02', n:'03',
  h:'HAAVN<br>BLACK',
  s:'The residential product line. SOLUM, the first release, taken from plan to a finished manufactured home ready for market.',
  m:['SOLUM','Residential series','Manufactured','Ready for market'],
  notes:'Switch register here. Pipeline is volume, BLACK is product. It shows CCIST what the finished article looks like when we control the whole chain.' },

/* 18 */ { type:'editorial', section:'Partnership', title:'Precision partnership', theme:'dark',
  mark:'HAAVN × CCIST',
  h:'HAAVN thanks <em>CCIST</em> for our <b>precision partnership.</b>',
  lede:'Together we work towards a modular future.',
  sig:['HAAVN · CCIST','September 2026'],
  down:'Precision partnership',
  across:'A modular future',
  notes:'Say the line on the slide, then stop. Let the room have it.' },

/* 19 */ { type:'thanks', section:'Thank you', title:'Thank you', theme:'cover',
  notes:'Hold here for questions.' }
];
