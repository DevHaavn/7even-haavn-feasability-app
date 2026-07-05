// Group FY27 budget — sourced verbatim from the CFO app (haavn-cfo) built by
// Daniel Sette. Fathom-style model: every line carries 12 monthly figures
// (Jul-26 → Jun-27, AUD ex-GST) plus flags — financing (below-the-line
// injections / intercompany), tax, pipeline (memo, excluded from EBITDA),
// grp (project-manager / development), cat (opex category) and fee splits.

export const CFO_MONTHS = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'] as const
export const CFO_YEARS  = ['26','26','26','26','26','26','27','27','27','27','27','27'] as const

export type Section = 'revenue' | 'cogs' | 'opex'

export interface BudgetLine {
  id: string
  name: string
  s: Section
  m: number[]            // 12 monthly figures
  grp?: string           // project manager / development / opex group
  cat?: string           // opex category
  fin?: boolean          // below-the-line financing (injection / intercompany)
  tax?: boolean          // tax / liability line (with fin)
  pipeline?: boolean     // uncommitted revenue — memo only
  splitGroup?: string    // fee-split cluster id
  pct?: number           // split share
  signed?: boolean
}

export interface Entity {
  id: string
  name: string
  type: string
  lines: BudgetLine[]
}

export const CFO_SEED: Entity[] = [
  {
    "id": "sev",
    "name": "7even Capital",
    "type": "Property development management",
    "lines": [
      {
        "m": [
          40000,
          40000,
          40000,
          40000,
          40000,
          40000,
          40000,
          40000,
          40000,
          40000,
          40000,
          40000
        ],
        "s": "revenue",
        "id": "s_pre_dm",
        "grp": "Preston",
        "name": "DM fee (3% TDC)"
      },
      {
        "m": [
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000
        ],
        "s": "revenue",
        "id": "s_pre_ad",
        "grp": "Preston",
        "name": "Admin fee"
      },
      {
        "m": [
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000
        ],
        "s": "revenue",
        "id": "s_pre_mk",
        "grp": "Preston",
        "name": "Marketing fee"
      },
      {
        "m": [
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000
        ],
        "s": "revenue",
        "id": "s_pre_lg",
        "grp": "Preston",
        "name": "Legal fee"
      },
      {
        "m": [
          10000,
          10000,
          10000,
          10000,
          10000,
          10000,
          10000,
          10000,
          10000,
          10000,
          10000,
          10000
        ],
        "s": "revenue",
        "id": "s_cal_dm",
        "grp": "Caloundra",
        "name": "DM fee (3% TDC)"
      },
      {
        "m": [
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000
        ],
        "s": "revenue",
        "id": "s_cal_ad",
        "grp": "Caloundra",
        "name": "Admin fee"
      },
      {
        "m": [
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000
        ],
        "s": "revenue",
        "id": "s_cal_mk",
        "grp": "Caloundra",
        "name": "Marketing fee"
      },
      {
        "m": [
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000
        ],
        "s": "revenue",
        "id": "s_cal_lg",
        "grp": "Caloundra",
        "name": "Legal fee"
      },
      {
        "m": [
          30000,
          30000,
          30000,
          30000,
          30000,
          30000,
          30000,
          30000,
          30000,
          30000,
          30000,
          30000
        ],
        "s": "revenue",
        "id": "s_wau_dm",
        "grp": "Waurn Ponds",
        "name": "DM fee (3% TDC)"
      },
      {
        "m": [
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000
        ],
        "s": "revenue",
        "id": "s_wau_ad",
        "grp": "Waurn Ponds",
        "name": "Admin fee"
      },
      {
        "m": [
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000
        ],
        "s": "revenue",
        "id": "s_wau_mk",
        "grp": "Waurn Ponds",
        "name": "Marketing fee"
      },
      {
        "m": [
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000
        ],
        "s": "revenue",
        "id": "s_wau_lg",
        "grp": "Waurn Ponds",
        "name": "Legal fee"
      },
      {
        "m": [
          0,
          50000,
          50000,
          50000,
          50000,
          50000,
          50000,
          50000,
          50000,
          50000,
          50000,
          50000
        ],
        "s": "revenue",
        "id": "s_wc",
        "fin": true,
        "grp": "Working capital",
        "name": "Working capital injection"
      },
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "cogs",
        "id": "s_cogs1",
        "name": "Consulting / specialist fees"
      },
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "cogs",
        "id": "s_cogs2",
        "name": "Legal (project-level)"
      },
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "cogs",
        "id": "s_cogs3",
        "name": "Due diligence costs"
      },
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "cogs",
        "id": "s_cogs4",
        "name": "Other direct project costs"
      },
      {
        "m": [
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000
        ],
        "s": "opex",
        "id": "s_w1",
        "cat": "Wages & salaries",
        "grp": "Wages & salaries",
        "name": "Daniel Sette"
      },
      {
        "m": [
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000
        ],
        "s": "opex",
        "id": "s_w2",
        "cat": "Wages & salaries",
        "grp": "Wages & salaries",
        "name": "Jamie Baldwin"
      },
      {
        "m": [
          0,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000,
          25000
        ],
        "s": "opex",
        "id": "s_w3",
        "cat": "Wages & salaries",
        "grp": "Wages & salaries",
        "name": "Lewis Jin"
      },
      {
        "m": [
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500
        ],
        "s": "opex",
        "id": "s_w5",
        "cat": "Wages & salaries",
        "grp": "Wages & salaries",
        "name": "Admin"
      },
      {
        "m": [
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800
        ],
        "s": "opex",
        "id": "s_w6",
        "cat": "Wages & salaries",
        "grp": "Wages & salaries",
        "name": "Accounts"
      },
      {
        "m": [
          600,
          600,
          600,
          600,
          600,
          600,
          600,
          600,
          600,
          600,
          600,
          600
        ],
        "s": "opex",
        "id": "s_s1",
        "cat": "Superannuation",
        "grp": "Superannuation",
        "name": "Admin / Accounts — super"
      },
      {
        "m": [
          0,
          0,
          4600,
          4600,
          4600,
          4600,
          4600,
          4600,
          4600,
          4600,
          4600,
          4600
        ],
        "s": "opex",
        "id": "s_r1",
        "cat": "Rent & outgoings",
        "grp": "Rent & outgoings",
        "name": "Office rent"
      },
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "opex",
        "id": "s_r2",
        "cat": "Rent & outgoings",
        "grp": "Rent & outgoings",
        "name": "Outgoings / strata"
      },
      {
        "m": [
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250
        ],
        "s": "opex",
        "id": "s_r3",
        "cat": "Rent & outgoings",
        "grp": "Rent & outgoings",
        "name": "Car parking"
      },
      {
        "m": [
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250
        ],
        "s": "opex",
        "id": "s_i1",
        "cat": "Insurance",
        "grp": "Insurance",
        "name": "Professional indemnity"
      },
      {
        "m": [
          600,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "opex",
        "id": "s_i2",
        "cat": "Insurance",
        "grp": "Insurance",
        "name": "Public liability"
      },
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "opex",
        "id": "s_i3",
        "cat": "Insurance",
        "grp": "Insurance",
        "name": "Business / contents"
      },
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "opex",
        "id": "s_i4",
        "cat": "Insurance",
        "grp": "Insurance",
        "name": "Workers compensation"
      },
      {
        "m": [
          967,
          967,
          967,
          967,
          967,
          967,
          967,
          967,
          967,
          967,
          967,
          967
        ],
        "s": "opex",
        "id": "s_i5",
        "cat": "Insurance",
        "grp": "Insurance",
        "name": "Motor vehicle insurance — Audi"
      },
      {
        "m": [
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250
        ],
        "s": "opex",
        "id": "s_i6",
        "cat": "Insurance",
        "grp": "Insurance",
        "name": "Motor vehicle insurance — Defender"
      },
      {
        "m": [
          2470,
          2470,
          2470,
          2470,
          2470,
          2470,
          2470,
          2470,
          2470,
          2470,
          2470,
          2470
        ],
        "s": "opex",
        "id": "s_mv1",
        "cat": "Motor vehicles",
        "grp": "Motor vehicles",
        "name": "Vehicle lease — Defender"
      },
      {
        "m": [
          3100,
          3100,
          3100,
          3100,
          3100,
          3100,
          3100,
          3100,
          3100,
          3100,
          3100,
          3100
        ],
        "s": "opex",
        "id": "s_mv2",
        "cat": "Motor vehicles",
        "grp": "Motor vehicles",
        "name": "Vehicle lease — Range Rover"
      },
      {
        "m": [
          3370,
          3370,
          3370,
          3370,
          3370,
          3370,
          3370,
          3370,
          3370,
          3370,
          3370,
          3370
        ],
        "s": "opex",
        "id": "s_mv3",
        "cat": "Motor vehicles",
        "grp": "Motor vehicles",
        "name": "Vehicle lease — SQ8"
      },
      {
        "m": [
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500
        ],
        "s": "opex",
        "id": "s_mv4",
        "cat": "Motor vehicles",
        "grp": "Motor vehicles",
        "name": "Fuel & running costs"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "s_mv5",
        "cat": "Motor vehicles",
        "grp": "Motor vehicles",
        "name": "Tolls"
      },
      {
        "m": [
          225,
          225,
          225,
          225,
          225,
          225,
          225,
          225,
          225,
          225,
          225,
          225
        ],
        "s": "opex",
        "id": "s_mv6",
        "cat": "Motor vehicles",
        "grp": "Motor vehicles",
        "name": "Registration & CTP"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "s_it1",
        "cat": "IT & software",
        "grp": "IT & software",
        "name": "Hardware / equipment"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "s_it2",
        "cat": "IT & software",
        "grp": "IT & software",
        "name": "Other IT costs"
      },
      {
        "m": [
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120
        ],
        "s": "opex",
        "id": "s_sub1",
        "cat": "Subscriptions",
        "grp": "Subscriptions",
        "name": "Xero subscription"
      },
      {
        "m": [
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120
        ],
        "s": "opex",
        "id": "s_sub2",
        "cat": "Subscriptions",
        "grp": "Subscriptions",
        "name": "Claude AI"
      },
      {
        "m": [
          130,
          130,
          130,
          130,
          130,
          130,
          130,
          130,
          130,
          130,
          130,
          130
        ],
        "s": "opex",
        "id": "s_sub3",
        "cat": "Subscriptions",
        "grp": "Subscriptions",
        "name": "Adobe Acrobat"
      },
      {
        "m": [
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120
        ],
        "s": "opex",
        "id": "s_sub4",
        "cat": "Subscriptions",
        "grp": "Subscriptions",
        "name": "Office 365 / Technicalities"
      },
      {
        "m": [
          185,
          185,
          185,
          185,
          185,
          185,
          185,
          185,
          185,
          185,
          185,
          185
        ],
        "s": "opex",
        "id": "s_sub5",
        "cat": "Subscriptions",
        "grp": "Subscriptions",
        "name": "Estatemaster"
      },
      {
        "m": [
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75
        ],
        "s": "opex",
        "id": "s_sub6",
        "cat": "Subscriptions",
        "grp": "Subscriptions",
        "name": "Landchecker"
      },
      {
        "m": [
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75
        ],
        "s": "opex",
        "id": "s_sub7",
        "cat": "Subscriptions",
        "grp": "Subscriptions",
        "name": "Canva"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "s_mk1",
        "cat": "Marketing & BD",
        "grp": "Marketing & BD",
        "name": "Digital / online marketing"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "s_mk2",
        "cat": "Marketing & BD",
        "grp": "Marketing & BD",
        "name": "Print / collateral"
      },
      {
        "m": [
          3334,
          3334,
          3334,
          3334,
          3334,
          3334,
          3334,
          3334,
          3334,
          3334,
          3334,
          3334
        ],
        "s": "opex",
        "id": "s_mk3",
        "cat": "Marketing & BD",
        "grp": "Marketing & BD",
        "name": "Identity X"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "s_mk4",
        "cat": "Marketing & BD",
        "grp": "Marketing & BD",
        "name": "BD materials"
      },
      {
        "m": [
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500
        ],
        "s": "opex",
        "id": "s_mk5",
        "cat": "Marketing & BD",
        "grp": "Marketing & BD",
        "name": "Events / conferences"
      },
      {
        "m": [
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500
        ],
        "s": "opex",
        "id": "s_e1",
        "cat": "Entertainment",
        "grp": "Entertainment",
        "name": "Client dining / restaurants"
      },
      {
        "m": [
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500
        ],
        "s": "opex",
        "id": "s_e2",
        "cat": "Entertainment",
        "grp": "Entertainment",
        "name": "Other entertainment"
      },
      {
        "m": [
          550,
          550,
          550,
          550,
          550,
          550,
          550,
          550,
          550,
          550,
          550,
          550
        ],
        "s": "opex",
        "id": "s_a1",
        "cat": "Accounting & legal",
        "grp": "Accounting & legal",
        "name": "Accounting fees"
      },
      {
        "m": [
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350
        ],
        "s": "opex",
        "id": "s_a2",
        "cat": "Accounting & legal",
        "grp": "Accounting & legal",
        "name": "Legal fees"
      },
      {
        "m": [
          40,
          40,
          40,
          40,
          40,
          40,
          40,
          40,
          40,
          40,
          40,
          40
        ],
        "s": "opex",
        "id": "s_a3",
        "cat": "Accounting & legal",
        "grp": "Accounting & legal",
        "name": "ASIC fees"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "s_ph1",
        "cat": "Phone & internet",
        "grp": "Phone & internet",
        "name": "Mobile phones"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "s_ph2",
        "cat": "Phone & internet",
        "grp": "Phone & internet",
        "name": "Internet / NBN"
      },
      {
        "m": [
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100
        ],
        "s": "opex",
        "id": "s_o1",
        "cat": "Office & general",
        "grp": "Office & general",
        "name": "Office supplies"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "s_o2",
        "cat": "Office & general",
        "grp": "Office & general",
        "name": "Cleaning"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "s_o3",
        "cat": "Office & general",
        "grp": "Office & general",
        "name": "Milk / coffee / food"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "s_o4",
        "cat": "Office & general",
        "grp": "Office & general",
        "name": "Electricity"
      },
      {
        "m": [
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50
        ],
        "s": "opex",
        "id": "s_o5",
        "cat": "Office & general",
        "grp": "Office & general",
        "name": "Water"
      },
      {
        "m": [
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100
        ],
        "s": "opex",
        "id": "s_o6",
        "cat": "Office & general",
        "grp": "Office & general",
        "name": "General / miscellaneous"
      },
      {
        "m": [
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10
        ],
        "s": "opex",
        "id": "s_bk1",
        "cat": "Bank & finance",
        "grp": "Bank & finance",
        "name": "Bank fees"
      },
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "opex",
        "id": "s_bk2",
        "cat": "Bank & finance",
        "grp": "Bank & finance",
        "name": "Interest expense"
      },
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "opex",
        "id": "s_bk3",
        "cat": "Bank & finance",
        "grp": "Bank & finance",
        "name": "International transfer fees"
      },
      {
        "m": [
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250
        ],
        "s": "opex",
        "id": "s_trv1",
        "cat": "Travel",
        "grp": "Travel",
        "name": "Domestic flights & accommodation"
      },
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "opex",
        "id": "s_trv2",
        "cat": "Travel",
        "grp": "Travel",
        "name": "International travel"
      },
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "opex",
        "id": "s_trv3",
        "cat": "Travel",
        "grp": "Travel",
        "name": "Staff reimbursements"
      }
    ]
  },
  {
    "id": "hm",
    "name": "Haavn Management",
    "type": "Project management services (fka M2Co)",
    "lines": [
      {
        "m": [
          4500,
          4500,
          4500,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "revenue",
        "id": "m_p1",
        "grp": "James Maloney",
        "name": "Heidelberg Childcare"
      },
      {
        "m": [
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "revenue",
        "id": "m_p2",
        "grp": "James Maloney",
        "name": "106 Princess Street Kew"
      },
      {
        "m": [
          2500,
          2500,
          2500,
          2500,
          2500,
          2500,
          2500,
          2500,
          2500,
          2500,
          2500,
          2500
        ],
        "s": "revenue",
        "id": "m_p5",
        "grp": "James Maloney",
        "name": "Raynor — Glen Waverley"
      },
      {
        "m": [
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000
        ],
        "s": "revenue",
        "id": "m_p6",
        "grp": "James Maloney",
        "name": "Dekas One — Blackburn"
      },
      {
        "m": [
          2100,
          2100,
          2100,
          2100,
          2100,
          2100,
          2100,
          2100,
          2100,
          2100,
          2100,
          2100
        ],
        "s": "revenue",
        "id": "xjf0pz8",
        "grp": "James Maloney",
        "pct": 30,
        "name": "BFG Fitout",
        "splitGroup": "xw1z0to"
      },
      {
        "m": [
          3300,
          3300,
          3300,
          3300,
          3300,
          3300,
          3300,
          3300,
          3300,
          3300,
          3300,
          3300
        ],
        "s": "revenue",
        "id": "xsic18v",
        "grp": "James Maloney",
        "pct": 60,
        "name": "Lee Macro Project",
        "splitGroup": "x8ry3de"
      },
      {
        "m": [
          3000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000
        ],
        "s": "revenue",
        "id": "xoimpw7",
        "grp": "James Maloney",
        "name": "A1 Rec Project"
      },
      {
        "m": [
          4500,
          4500,
          4500,
          4500,
          4500,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "revenue",
        "id": "m_q2",
        "grp": "John Dimattina",
        "name": "56-58 Development Trust"
      },
      {
        "m": [
          5786,
          5786,
          5786,
          5786,
          5786,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "revenue",
        "id": "m_q3",
        "grp": "John Dimattina",
        "name": "HG-19 Peel Street Kew"
      },
      {
        "m": [
          4500,
          4500,
          4500,
          4500,
          4500,
          4500,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "revenue",
        "id": "m_q4",
        "grp": "John Dimattina",
        "name": "1542 HSGI — Glen Iris"
      },
      {
        "m": [
          1100,
          1100,
          1100,
          1100,
          1100,
          1100,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "revenue",
        "id": "m_q5",
        "grp": "John Dimattina",
        "name": "Propel Byron Bay"
      },
      {
        "m": [
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          0,
          0
        ],
        "s": "revenue",
        "id": "m_q6",
        "grp": "John Dimattina",
        "name": "Midland — S. Melbourne"
      },
      {
        "m": [
          8800,
          8800,
          30000,
          8800,
          8800,
          30000,
          8800,
          8800,
          30000,
          8800,
          8800,
          30000
        ],
        "s": "revenue",
        "id": "m_q7",
        "grp": "John Dimattina",
        "name": "Hiland"
      },
      {
        "m": [
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500
        ],
        "s": "revenue",
        "id": "m_q8",
        "grp": "John Dimattina",
        "name": "HG16 High Street Windsor"
      },
      {
        "m": [
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500
        ],
        "s": "revenue",
        "id": "m_q9",
        "grp": "John Dimattina",
        "name": "Young Brunswick"
      },
      {
        "m": [
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500,
          5500
        ],
        "s": "revenue",
        "id": "m_q10",
        "grp": "John Dimattina",
        "name": "JT Property — Packington Kew"
      },
      {
        "m": [
          2500,
          2500,
          2500,
          2500,
          2500,
          2500,
          2500,
          2500,
          2500,
          2500,
          2500,
          2500
        ],
        "s": "revenue",
        "id": "m_q11",
        "grp": "John Dimattina",
        "name": "Raynor (Split)"
      },
      {
        "m": [
          4900,
          4900,
          4900,
          4900,
          4900,
          4900,
          4900,
          4900,
          4900,
          4900,
          4900,
          4900
        ],
        "s": "revenue",
        "id": "xs6hmn3",
        "grp": "John Dimattina",
        "pct": 70,
        "name": "BFG Fitout",
        "splitGroup": "xw1z0to"
      },
      {
        "m": [
          2200,
          2200,
          2200,
          2200,
          2200,
          2200,
          2200,
          2200,
          2200,
          2200,
          2200,
          2200
        ],
        "s": "revenue",
        "id": "x755glq",
        "grp": "John Dimattina",
        "pct": 40,
        "name": "Lee Macro Project",
        "splitGroup": "x8ry3de"
      },
      {
        "m": [
          3375,
          3375,
          3375,
          3375,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "revenue",
        "id": "xhc82nq",
        "grp": "John Dimattina",
        "pct": 75,
        "name": "White Street Mordialloc",
        "splitGroup": "xmefqmo"
      },
      {
        "m": [
          7500,
          7500,
          7500,
          7500,
          7500,
          7500,
          7500,
          7500,
          7500,
          7500,
          7500,
          7500
        ],
        "s": "revenue",
        "id": "m_p3",
        "grp": "James Winstanley",
        "name": "Molti Investments — Armadale"
      },
      {
        "m": [
          3500,
          3500,
          3500,
          3500,
          3500,
          3500,
          3500,
          3500,
          3500,
          3500,
          3500,
          3500
        ],
        "s": "revenue",
        "id": "m_p4",
        "grp": "James Winstanley",
        "name": "Molti Investments — Toorak"
      },
      {
        "m": [
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000,
          1000
        ],
        "s": "revenue",
        "id": "x4i7dcy",
        "grp": "Dom Paolilli",
        "name": "Town Planning (HR)"
      },
      {
        "m": [
          1125,
          1125,
          1125,
          1125,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "revenue",
        "id": "xoktsb5",
        "grp": "Dom Paolilli",
        "pct": 25,
        "name": "White Street Mordialloc",
        "splitGroup": "xmefqmo"
      },
      {
        "m": [
          10000,
          10000,
          10000,
          10000,
          10000,
          10000,
          10000,
          10000,
          10000,
          10000,
          10000,
          10000
        ],
        "s": "revenue",
        "id": "m_wc",
        "fin": true,
        "grp": "Working capital",
        "name": "Working capital (loan)"
      },
      {
        "m": [
          0,
          0,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000
        ],
        "s": "revenue",
        "id": "m_pl2",
        "name": "Mr Geng — Nunawading",
        "pipeline": true
      },
      {
        "m": [
          0,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000
        ],
        "s": "revenue",
        "id": "m_pl3",
        "name": "Ray Li",
        "pipeline": true
      },
      {
        "m": [
          0,
          3500,
          3500,
          3500,
          3500,
          3500,
          3500,
          3500,
          3500,
          3500,
          3500,
          3500
        ],
        "s": "revenue",
        "id": "m_pl4",
        "name": "Nolan J — Lilydale",
        "pipeline": true
      },
      {
        "m": [
          0,
          0,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000,
          3000
        ],
        "s": "revenue",
        "id": "m_pl5",
        "name": "MRA Development — Camberwell",
        "pipeline": true
      },
      {
        "m": [
          0,
          0,
          11000,
          11000,
          11000,
          11000,
          11000,
          11000,
          11000,
          11000,
          11000,
          11000
        ],
        "s": "revenue",
        "id": "m_pl6",
        "name": "CSR Monash",
        "pipeline": true
      },
      {
        "m": [
          0,
          0,
          11000,
          11000,
          11000,
          11000,
          11000,
          11000,
          11000,
          11000,
          11000,
          11000
        ],
        "s": "revenue",
        "id": "m_pl7",
        "name": "Carl Sydney",
        "pipeline": true
      },
      {
        "m": [
          0,
          7000,
          7000,
          7000,
          7000,
          7000,
          7000,
          7000,
          7000,
          7000,
          7000,
          7000
        ],
        "s": "revenue",
        "id": "m_pl9",
        "name": "Virgate",
        "pipeline": true
      },
      {
        "m": [
          4000,
          4000,
          15000,
          4000,
          4000,
          15000,
          4000,
          4000,
          15000,
          4000,
          4000,
          15000
        ],
        "s": "cogs",
        "id": "m_del",
        "name": "Consulting fees"
      },
      {
        "m": [
          20000,
          20000,
          20000,
          20000,
          20000,
          20000,
          20000,
          20000,
          20000,
          20000,
          20000,
          20000
        ],
        "s": "opex",
        "id": "m_w2",
        "cat": "Wages & salaries",
        "grp": "Wages & salaries",
        "name": "James Winstanley"
      },
      {
        "m": [
          11921,
          12500,
          12500,
          12500,
          12500,
          12500,
          12500,
          12500,
          12500,
          12500,
          12500,
          12500
        ],
        "s": "opex",
        "id": "m_w3",
        "cat": "Wages & salaries",
        "grp": "Wages & salaries",
        "name": "John Dimattina"
      },
      {
        "m": [
          9865,
          9865,
          9865,
          9865,
          9865,
          9865,
          9865,
          9865,
          9865,
          9865,
          9865,
          9865
        ],
        "s": "opex",
        "id": "m_w4",
        "cat": "Wages & salaries",
        "grp": "Wages & salaries",
        "name": "James Maloney"
      },
      {
        "m": [
          8221,
          8221,
          8221,
          8221,
          8221,
          8221,
          8221,
          8221,
          8221,
          8221,
          8221,
          8221
        ],
        "s": "opex",
        "id": "m_w5",
        "cat": "Wages & salaries",
        "grp": "Wages & salaries",
        "name": "Dom Paolilli"
      },
      {
        "m": [
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500
        ],
        "s": "opex",
        "id": "m_w6",
        "cat": "Wages & salaries",
        "grp": "Wages & salaries",
        "name": "Admin"
      },
      {
        "m": [
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800
        ],
        "s": "opex",
        "id": "m_w7",
        "cat": "Wages & salaries",
        "grp": "Wages & salaries",
        "name": "Accounts"
      },
      {
        "m": [
          1371,
          1371,
          1371,
          1371,
          1371,
          1371,
          1371,
          1371,
          1371,
          1371,
          1371,
          1371
        ],
        "s": "opex",
        "id": "m_s1",
        "cat": "Superannuation",
        "grp": "Superannuation",
        "name": "John Dimattina "
      },
      {
        "m": [
          1135,
          1300,
          1300,
          1300,
          1300,
          1300,
          1300,
          1300,
          1300,
          1300,
          1300,
          1300
        ],
        "s": "opex",
        "id": "m_s2",
        "cat": "Superannuation",
        "grp": "Superannuation",
        "name": "James Maloney "
      },
      {
        "m": [
          945,
          945,
          945,
          945,
          945,
          945,
          945,
          945,
          945,
          945,
          945,
          945
        ],
        "s": "opex",
        "id": "m_s3",
        "cat": "Superannuation",
        "grp": "Superannuation",
        "name": "Dom Paolilli "
      },
      {
        "m": [
          430,
          430,
          430,
          430,
          430,
          430,
          430,
          430,
          430,
          430,
          430,
          430
        ],
        "s": "opex",
        "id": "m_s4",
        "cat": "Superannuation",
        "grp": "Superannuation",
        "name": "Accounts / Admin — super"
      },
      {
        "m": [
          0,
          0,
          4600,
          4600,
          4600,
          4600,
          4600,
          4600,
          4600,
          4600,
          4600,
          4600
        ],
        "s": "opex",
        "id": "m_r1",
        "cat": "Rent & outgoings",
        "grp": "Rent & outgoings",
        "name": "Office rent"
      },
      {
        "m": [
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250
        ],
        "s": "opex",
        "id": "m_r2",
        "cat": "Rent & outgoings",
        "grp": "Rent & outgoings",
        "name": "Car parking"
      },
      {
        "m": [
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500,
          1500
        ],
        "s": "opex",
        "id": "m_i1",
        "cat": "Insurance",
        "grp": "Insurance",
        "name": "Professional indemnity"
      },
      {
        "m": [
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500,
          500
        ],
        "s": "opex",
        "id": "m_i2",
        "cat": "Insurance",
        "grp": "Insurance",
        "name": "Workers compensation"
      },
      {
        "m": [
          200,
          200,
          200,
          200,
          200,
          200,
          200,
          200,
          200,
          200,
          200,
          200
        ],
        "s": "opex",
        "id": "m_i3",
        "cat": "Insurance",
        "grp": "Insurance",
        "name": "Motor vehicle insurance"
      },
      {
        "m": [
          2100,
          2100,
          2100,
          2100,
          2100,
          2100,
          2100,
          2100,
          2100,
          2100,
          2100,
          2100
        ],
        "s": "opex",
        "id": "m_v1",
        "cat": "Motor vehicles",
        "grp": "Motor vehicles",
        "name": "Vehicle lease / Defender"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "m_v2",
        "cat": "Motor vehicles",
        "grp": "Motor vehicles",
        "name": "Fuel & running costs"
      },
      {
        "m": [
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250,
          250
        ],
        "s": "opex",
        "id": "m_v3",
        "cat": "Motor vehicles",
        "grp": "Motor vehicles",
        "name": "Tolls"
      },
      {
        "m": [
          950,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "opex",
        "id": "m_v4",
        "cat": "Motor vehicles",
        "grp": "Motor vehicles",
        "name": "Registration & CTP"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "m_t1",
        "cat": "IT & software",
        "grp": "IT & software",
        "name": "Hardware / equipment"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "m_t2",
        "cat": "IT & software",
        "grp": "IT & software",
        "name": "Other IT costs"
      },
      {
        "m": [
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120,
          120
        ],
        "s": "opex",
        "id": "m_b1",
        "cat": "Subscriptions",
        "grp": "Subscriptions",
        "name": "Xero subscription"
      },
      {
        "m": [
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50
        ],
        "s": "opex",
        "id": "m_b2",
        "cat": "Subscriptions",
        "grp": "Subscriptions",
        "name": "Claude AI"
      },
      {
        "m": [
          130,
          130,
          130,
          130,
          130,
          130,
          130,
          130,
          130,
          130,
          130,
          130
        ],
        "s": "opex",
        "id": "m_b3",
        "cat": "Subscriptions",
        "grp": "Subscriptions",
        "name": "Adobe Acrobat"
      },
      {
        "m": [
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20
        ],
        "s": "opex",
        "id": "m_b4",
        "cat": "Subscriptions",
        "grp": "Subscriptions",
        "name": "Office 365 / Technicalities"
      },
      {
        "m": [
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100
        ],
        "s": "opex",
        "id": "m_b5",
        "cat": "Subscriptions",
        "grp": "Subscriptions",
        "name": "Other subscriptions"
      },
      {
        "m": [
          3334,
          3334,
          3334,
          3334,
          3334,
          3334,
          3334,
          3334,
          3334,
          3334,
          3334,
          3334
        ],
        "s": "opex",
        "id": "m_mk1",
        "cat": "Marketing & BD",
        "grp": "Marketing & BD",
        "name": "Identity X"
      },
      {
        "m": [
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100
        ],
        "s": "opex",
        "id": "m_e1",
        "cat": "Entertainment",
        "grp": "Entertainment",
        "name": "Client dining / restaurants"
      },
      {
        "m": [
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100
        ],
        "s": "opex",
        "id": "m_e2",
        "cat": "Entertainment",
        "grp": "Entertainment",
        "name": "Other entertainment"
      },
      {
        "m": [
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350
        ],
        "s": "opex",
        "id": "m_a1",
        "cat": "Accounting & legal",
        "grp": "Accounting & legal",
        "name": "Accounting fees"
      },
      {
        "m": [
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100
        ],
        "s": "opex",
        "id": "m_a2",
        "cat": "Accounting & legal",
        "grp": "Accounting & legal",
        "name": "Legal fees"
      },
      {
        "m": [
          40,
          40,
          40,
          40,
          40,
          40,
          40,
          40,
          40,
          40,
          40,
          40
        ],
        "s": "opex",
        "id": "m_a3",
        "cat": "Accounting & legal",
        "grp": "Accounting & legal",
        "name": "ASIC fees"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "m_ph1",
        "cat": "Phone & internet",
        "grp": "Phone & internet",
        "name": "Mobile phones"
      },
      {
        "m": [
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50
        ],
        "s": "opex",
        "id": "m_ph2",
        "cat": "Phone & internet",
        "grp": "Phone & internet",
        "name": "Internet / NBN"
      },
      {
        "m": [
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100
        ],
        "s": "opex",
        "id": "m_o1",
        "cat": "Office & general",
        "grp": "Office & general",
        "name": "Office supplies"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "m_o2",
        "cat": "Office & general",
        "grp": "Office & general",
        "name": "Cleaning"
      },
      {
        "m": [
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75,
          75
        ],
        "s": "opex",
        "id": "m_o3",
        "cat": "Office & general",
        "grp": "Office & general",
        "name": "Milk / coffee / food"
      },
      {
        "m": [
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150,
          150
        ],
        "s": "opex",
        "id": "m_o4",
        "cat": "Office & general",
        "grp": "Office & general",
        "name": "Electricity"
      },
      {
        "m": [
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50,
          50
        ],
        "s": "opex",
        "id": "m_o5",
        "cat": "Office & general",
        "grp": "Office & general",
        "name": "Water"
      },
      {
        "m": [
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100,
          100
        ],
        "s": "opex",
        "id": "m_o6",
        "cat": "Office & general",
        "grp": "Office & general",
        "name": "General / miscellaneous"
      },
      {
        "m": [
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10,
          10
        ],
        "s": "opex",
        "id": "m_bk1",
        "cat": "Bank & finance",
        "grp": "Bank & finance",
        "name": "Bank fees"
      },
      {
        "m": [
          -10000,
          -10000,
          -10000,
          -10000,
          -10000,
          -10000,
          -10000,
          -10000,
          -10000,
          -10000,
          -10000,
          -10000
        ],
        "s": "cogs",
        "id": "xzgfzr6",
        "fin": true,
        "tax": true,
        "name": "ATO Plan",
        "signed": true
      }
    ]
  },
  {
    "id": "hprec",
    "name": "Haavn Precision",
    "type": "Modular supply · pre-revenue",
    "lines": [
      {
        "m": [
          30000,
          30000,
          30000,
          30000,
          30000,
          30000,
          30000,
          30000,
          30000,
          30000,
          30000,
          30000
        ],
        "s": "revenue",
        "id": "p_wc",
        "fin": true,
        "name": "Working capital injection"
      },
      {
        "m": [
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800,
          2800
        ],
        "s": "opex",
        "id": "p_wag",
        "name": "Wages & salaries"
      },
      {
        "m": [
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350,
          350
        ],
        "s": "opex",
        "id": "p_sup",
        "name": "Superannuation"
      },
      {
        "m": [
          0,
          0,
          4800,
          4800,
          4800,
          4800,
          4800,
          4800,
          4800,
          4800,
          4800,
          4800
        ],
        "s": "opex",
        "id": "p_rent",
        "name": "Rent & outgoings"
      },
      {
        "m": [
          390,
          390,
          390,
          390,
          390,
          390,
          390,
          390,
          390,
          390,
          390,
          390
        ],
        "s": "opex",
        "id": "p_subs",
        "name": "Subscriptions"
      },
      {
        "m": [
          3984,
          3984,
          3984,
          3984,
          3984,
          3984,
          3984,
          3984,
          3984,
          3984,
          3984,
          3984
        ],
        "s": "opex",
        "id": "p_mkt",
        "name": "Marketing & BD"
      },
      {
        "m": [
          1480,
          1480,
          1480,
          1480,
          1480,
          1480,
          1480,
          1480,
          1480,
          1480,
          1480,
          1480
        ],
        "s": "opex",
        "id": "p_acc",
        "name": "Accounting & legal"
      },
      {
        "m": [
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20
        ],
        "s": "opex",
        "id": "p_bnk",
        "name": "Bank & finance"
      }
    ]
  },
  {
    "id": "htec",
    "name": "Haavn Technologies",
    "type": "Pre-revenue · no budget set",
    "lines": [
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "revenue",
        "id": "t_rev",
        "name": "Contract revenue (TBC)"
      },
      {
        "m": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        "s": "opex",
        "id": "t_ovh",
        "name": "Overheads (TBC)"
      }
    ]
  }
]


// ── Calc engine (mirrors the CFO app) ────────────────────────────────────────
// Trading vs financing split: injections/intercompany (fin) and tax sit below
// the line; pipeline is a memo. EBITDA is trading only.

export interface Calc {
  tRev: number; fin: number; pipe: number; cogs: number; ico: number; tax: number
  opex: number; opexCat: Record<string, number>
  gp: number; ebitda: number; gm: number; ebitdaP: number; netCash: number
}

const sumTo = (m: number[], through: number) => {
  let v = 0
  for (let i = 0; i <= through; i++) v += +m[i] || 0
  return v
}

export function calcEntity(e: Entity, through = 11): Calc {
  const r: Calc = { tRev: 0, fin: 0, pipe: 0, cogs: 0, ico: 0, tax: 0, opex: 0, opexCat: {}, gp: 0, ebitda: 0, gm: 0, ebitdaP: 0, netCash: 0 }
  e.lines.forEach(l => {
    const v = sumTo(l.m, through)
    if (l.s === 'revenue') {
      if (l.fin) r.fin += v
      else if (l.pipeline) r.pipe += v
      else r.tRev += v
    } else if (l.s === 'cogs') {
      if (l.fin) { if (l.tax) r.tax += v; else r.ico += v }
      else r.cogs += v
    } else {
      r.opex += v
      const k = l.cat || l.name
      r.opexCat[k] = (r.opexCat[k] || 0) + v
    }
  })
  r.gp = r.tRev - r.cogs
  r.ebitda = r.gp - r.opex
  r.gm = r.tRev ? r.gp / r.tRev : 0
  r.ebitdaP = r.ebitda + r.pipe
  r.netCash = r.ebitda + r.fin + r.ico + r.tax
  return r
}

export function calcGroup(entities: Entity[], through = 11): Calc & { per: Record<string, Calc> } {
  const g: Calc & { per: Record<string, Calc> } = { tRev: 0, fin: 0, pipe: 0, cogs: 0, ico: 0, tax: 0, opex: 0, opexCat: {}, gp: 0, ebitda: 0, gm: 0, ebitdaP: 0, netCash: 0, per: {} }
  entities.forEach(e => {
    const c = calcEntity(e, through)
    g.tRev += c.tRev; g.fin += c.fin; g.pipe += c.pipe; g.cogs += c.cogs; g.ico += c.ico; g.tax += c.tax; g.opex += c.opex
    Object.entries(c.opexCat).forEach(([k, v]) => { g.opexCat[k] = (g.opexCat[k] || 0) + v })
    g.per[e.id] = c
  })
  g.gp = g.tRev - g.cogs
  g.ebitda = g.gp - g.opex
  g.gm = g.tRev ? g.gp / g.tRev : 0
  g.ebitdaP = g.ebitda + g.pipe
  g.netCash = g.ebitda + g.fin + g.ico + g.tax
  return g
}

// Monthly trading series (rev / ebitda / opex / gm) for sparklines & bars.
export function seriesFor(entities: Entity[], kind: 'rev' | 'ebitda' | 'opex' | 'gm'): number[] {
  const out: number[] = []
  for (let mi = 0; mi < 12; mi++) {
    let tr = 0, cg = 0, ox = 0
    entities.forEach(e => e.lines.forEach(l => {
      const v = +l.m[mi] || 0
      if (l.s === 'revenue' && !l.fin && !l.pipeline) tr += v
      else if (l.s === 'cogs' && !l.fin) cg += v
      else if (l.s === 'opex') ox += v
    }))
    const gp = tr - cg, eb = gp - ox
    out.push(kind === 'rev' ? tr : kind === 'ebitda' ? eb : kind === 'opex' ? ox : (tr ? gp / tr * 100 : 0))
  }
  return out
}

// Revenue per fee-earner — gross revenue vs 3× (salary + super), rule of thirds.
export interface FeeEarner { name: string; gr: number; cost: number; mult: number; targetRev: number }
export function feeEarners(e: Entity, through = 11): FeeEarner[] {
  const fy = (l: BudgetLine) => sumTo(l.m, through)
  const pms = [...new Set(e.lines.filter(l => l.s === 'revenue' && !l.pipeline && !l.fin && l.grp && l.grp !== 'Working capital').map(l => l.grp!))]
  const wage = (n: string) => { const l = e.lines.find(x => x.s === 'opex' && x.cat === 'Wages & salaries' && x.name === n); return l ? fy(l) : 0 }
  const sup = (n: string) => { const l = e.lines.find(x => x.s === 'opex' && x.cat === 'Superannuation' && x.name.indexOf(n) === 0); return l ? fy(l) : 0 }
  const emp = pms.filter(p => wage(p) > 0)
  return emp.map(p => {
    const cost = wage(p) + sup(p)
    const gr = e.lines.filter(l => l.s === 'revenue' && l.grp === p && !l.pipeline && !l.fin).reduce((a, l) => a + fy(l), 0)
    return { name: p, gr, cost, mult: cost ? gr / cost : 0, targetRev: 3 * cost }
  })
}
