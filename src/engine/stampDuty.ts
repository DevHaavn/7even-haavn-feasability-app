/**
 * Australian stamp (transfer) duty calculator — general/standard rate.
 *
 * Covers all 8 states/territories, three property categories (vacant land,
 * house & land / residential, commercial or industrial), and foreign
 * purchaser surcharges where applicable.
 *
 * Figures current as at 3 July 2026 — sourced from each state/territory
 * revenue office (see comments per state). Rates and thresholds change
 * (often annually, sometimes mid-year) — re-verify before relying on this
 * for a live transaction, and re-check this file periodically.
 *
 * SCOPE: this calculates the GENERAL/STANDARD duty rate only. It does NOT
 * apply first-home-buyer, owner-occupier/PPR (except ACT, which has no
 * general owner-occupier-agnostic scale), or off-the-plan concessions —
 * those depend on buyer eligibility and are returned as advisory notes
 * instead of being auto-applied. Treat the output as an estimate.
 */

export type AuState =
  | "VIC"
  | "NSW"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "ACT"
  | "NT";

export type PropertyType = "vacant_land" | "house_and_land" | "commercial";

export interface StampDutyOptions {
  /** Foreign person/corporation/trust acquiring the property. */
  foreignBuyer?: boolean;
  /** ACT only: whether the buyer will occupy as their principal residence (lower scale). Defaults to false (investor scale). */
  ownerOccupier?: boolean;
}

export interface StampDutyResult {
  state: AuState;
  propertyType: PropertyType;
  price: number;
  duty: number;
  foreignSurcharge: number;
  total: number;
  notes: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// General/standard rate schedules per state
// (bracket thresholds + marginal rates, exactly mirroring each revenue
// office's published table as at July 2026)
// ---------------------------------------------------------------------------

/** VIC — sro.vic.gov.au, non-PPR (general) land transfer duty scale. */
function vicGeneralDuty(price: number): number {
  if (price <= 25_000) return price * 0.014;
  if (price <= 130_000) return 350 + (price - 25_000) * 0.024;
  if (price <= 960_000) return 2_870 + (price - 130_000) * 0.06;
  if (price <= 2_000_000) return price * 0.055;
  return 110_000 + (price - 2_000_000) * 0.065;
}

/** NSW — revenue.nsw.gov.au, general transfer duty scale (2026/27 FY, CPI-indexed). */
function nswGeneralDuty(price: number): number {
  if (price <= 18_000) return Math.max(20, price * 0.0125);
  if (price <= 38_000) return 225 + (price - 18_000) * 0.015;
  if (price <= 103_000) return 525 + (price - 38_000) * 0.0175;
  if (price <= 387_000) return 1_662 + (price - 103_000) * 0.035;
  if (price <= 1_290_000) return 11_602 + (price - 387_000) * 0.045;
  return 52_237 + (price - 1_290_000) * 0.055;
}

/** NSW premium property duty — residential only, over $3.87m, replaces general duty above threshold. */
function nswPremiumDuty(price: number): number {
  if (price <= 3_870_000) return nswGeneralDuty(price);
  return 194_137 + (price - 3_870_000) * 0.07;
}

/** QLD — qro.qld.gov.au, general transfer duty scale. */
function qldGeneralDuty(price: number): number {
  if (price <= 5_000) return 0;
  if (price <= 75_000) return (price - 5_000) * 0.015;
  if (price <= 540_000) return 1_050 + (price - 75_000) * 0.035;
  if (price <= 1_000_000) return 17_325 + (price - 540_000) * 0.045;
  return 38_025 + (price - 1_000_000) * 0.0575;
}

/** WA — wa.gov.au, general rate (applies uniformly to residential + commercial since 1 Jul 2022). */
function waGeneralDuty(price: number): number {
  if (price <= 120_000) return price * 0.019;
  if (price <= 150_000) return 2_280 + (price - 120_000) * 0.0285;
  if (price <= 360_000) return 3_135 + (price - 150_000) * 0.038;
  if (price <= 725_000) return 11_115 + (price - 360_000) * 0.0475;
  return 28_453 + (price - 725_000) * 0.0515;
}

/** SA — revenuesa.sa.gov.au, general conveyance duty scale (residential/primary production land). */
function saGeneralDuty(price: number): number {
  if (price <= 12_000) return price * 0.01;
  if (price <= 30_000) return 120 + (price - 12_000) * 0.02;
  if (price <= 50_000) return 480 + (price - 30_000) * 0.03;
  if (price <= 100_000) return 1_080 + (price - 50_000) * 0.035;
  if (price <= 200_000) return 2_830 + (price - 100_000) * 0.04;
  if (price <= 250_000) return 6_830 + (price - 200_000) * 0.0425;
  if (price <= 300_000) return 8_955 + (price - 250_000) * 0.0475;
  if (price <= 500_000) return 11_330 + (price - 300_000) * 0.05;
  return 21_330 + (price - 500_000) * 0.055;
}

/** TAS — sro.tas.gov.au, general conveyance duty scale (all property types). */
function tasGeneralDuty(price: number): number {
  if (price <= 3_000) return 50;
  if (price <= 25_000) return 50 + (price - 3_000) * 0.0175;
  if (price <= 75_000) return 435 + (price - 25_000) * 0.0225;
  if (price <= 200_000) return 1_560 + (price - 75_000) * 0.035;
  if (price <= 375_000) return 5_935 + (price - 200_000) * 0.04;
  if (price <= 725_000) return 12_935 + (price - 375_000) * 0.0425;
  return 27_810 + (price - 725_000) * 0.045;
}

/** ACT — revenue.act.gov.au, non-commercial owner-occupier scale. */
function actOwnerOccupierDuty(price: number): number {
  if (price <= 260_000) return price * 0.0028;
  if (price <= 300_000) return 728 + (price - 260_000) * 0.022;
  if (price <= 500_000) return 1_608 + (price - 300_000) * 0.034;
  if (price <= 750_000) return 8_408 + (price - 500_000) * 0.0432;
  if (price <= 1_000_000) return 19_208 + (price - 750_000) * 0.059;
  if (price <= 1_455_000) return 33_958 + (price - 1_000_000) * 0.064;
  return price * 0.0454; // flat on total value
}

/** ACT — non-commercial non-owner-occupier (investor/entity) scale. Use this for developer purchases. */
function actInvestorDuty(price: number): number {
  if (price <= 200_000) return price * 0.012;
  if (price <= 300_000) return 2_400 + (price - 200_000) * 0.022;
  if (price <= 500_000) return 4_600 + (price - 300_000) * 0.034;
  if (price <= 750_000) return 11_400 + (price - 500_000) * 0.0432;
  if (price <= 1_000_000) return 22_200 + (price - 750_000) * 0.059;
  if (price <= 1_455_000) return 36_950 + (price - 1_000_000) * 0.064;
  return price * 0.0454; // flat on total value
}

/** ACT — commercial property scale (flat, from 1 Jul 2026). */
function actCommercialDuty(price: number): number {
  if (price <= 2_100_000) return 0;
  return price * 0.05; // flat 5% of TOTAL value, not just the excess
}

/** NT — treasury.nt.gov.au, general scale (quadratic to $525k, then flat marginal bands). */
function ntGeneralDuty(price: number): number {
  if (price <= 525_000) {
    const v = price / 1000;
    return 0.06571441 * v * v + 15 * v;
  }
  if (price <= 3_000_000) return price * 0.0495;
  if (price <= 5_000_000) return price * 0.0575;
  return price * 0.0595;
}

// ---------------------------------------------------------------------------
// Foreign purchaser surcharge rates (flat %, added on top of duty).
// All current surcharges apply to RESIDENTIAL land only (house & land and,
// in most states, vacant land intended for residential use) — none apply
// to genuine commercial/industrial property under current rules.
// ---------------------------------------------------------------------------
const FOREIGN_SURCHARGE_RATE: Record<AuState, number> = {
  VIC: 0.08, // Foreign Purchaser Additional Duty
  NSW: 0.09, // Surcharge Purchaser Duty
  QLD: 0.08, // Additional Foreign Acquirer Duty (AFAD)
  WA: 0.07, // Foreign Buyers Duty
  SA: 0.07, // Foreign Ownership Surcharge
  TAS: 0.08, // Foreign Investor Duty Surcharge (residential rate; primary production is 1.5%, not modelled here)
  ACT: 0, // no duty surcharge (0.75%/yr land tax surcharge instead — not a transaction duty)
  NT: 0, // no foreign purchaser surcharge
};

/**
 * Estimate stamp duty for a given state, price and property type.
 */
export function calculateStampDuty(
  state: AuState,
  price: number,
  propertyType: PropertyType,
  options: StampDutyOptions = {}
): StampDutyResult {
  const { foreignBuyer = false, ownerOccupier = false } = options;
  const notes: string[] = [];
  let duty = 0;

  switch (state) {
    case "VIC":
      duty = vicGeneralDuty(price);
      if (propertyType === "house_and_land") {
        notes.push(
          "PPR concession (owner-occupier, capped at $550,000 dutiable value) and first-home exemption/concession (nil to $600,000, tapered to $750,000) are not applied — check eligibility separately."
        );
      }
      if (propertyType === "commercial") {
        notes.push(
          "This is the one-off entry duty under VIC's Commercial & Industrial Property Tax (CIPT) reform. If entering the reform on/after 1 Jul 2024, no further duty applies on resale — an annual 1% property tax on unimproved land value begins in year 11 instead."
        );
      }
      break;

    case "NSW":
      duty =
        propertyType !== "commercial" && price > 3_870_000
          ? nswPremiumDuty(price)
          : nswGeneralDuty(price);
      if (propertyType !== "commercial" && price > 3_870_000) {
        notes.push("Premium property duty rate applied (residential, >$3.87m).");
      }
      if (propertyType === "house_and_land" || propertyType === "vacant_land") {
        notes.push(
          "First Home Buyers Assistance Scheme (nil duty ≤$800,000 home / ≤$350,000 vacant land, tapered concession to $1,000,000 / $450,000) not applied — check eligibility separately."
        );
      }
      break;

    case "QLD":
      duty = qldGeneralDuty(price);
      if (propertyType !== "commercial") {
        notes.push(
          "Home concession (any owner-occupier) and first-home concessions (uncapped nil duty since 1 May 2025) not applied. From 1 Aug 2026 these concessions are restricted to citizens/PR/specified retirees — confirm eligibility."
        );
      }
      break;

    case "WA":
      duty = waGeneralDuty(price);
      if (propertyType !== "commercial") {
        notes.push(
          "First home owner rate (nil to $500,000 home / $350,000 vacant land) not applied — check eligibility separately."
        );
      }
      break;

    case "SA":
      if (propertyType === "commercial") {
        duty = 0;
        notes.push(
          "SA commercial/industrial ('qualifying') land has been fully duty-exempt since 1 July 2018."
        );
      } else {
        duty = saGeneralDuty(price);
        notes.push(
          "First home buyer relief (100% exemption, uncapped, since 6 Jun 2024, for new homes/off-the-plan/vacant land) not applied — check eligibility separately."
        );
      }
      break;

    case "TAS":
      duty = tasGeneralDuty(price);
      if (propertyType === "house_and_land") {
        notes.push(
          "TAS's first-home 100% exemption for established homes ≤$750,000 expired 30 June 2026 — confirm whether it has been reinstated before relying on this."
        );
      }
      break;

    case "ACT":
      if (propertyType === "commercial") {
        duty = actCommercialDuty(price);
      } else {
        duty = ownerOccupier ? actOwnerOccupierDuty(price) : actInvestorDuty(price);
        if (ownerOccupier) {
          notes.push(
            "From 1 July 2026, ACT first home buyers pay $0 duty (uncapped) — not modelled here as a distinct scale; if the buyer is a first home buyer, actual duty is likely $0."
          );
        }
      }
      break;

    case "NT":
      duty = ntGeneralDuty(price);
      if (propertyType === "house_and_land" || propertyType === "vacant_land") {
        notes.push(
          "NT has no first-home duty concession (ended 2021). Check eligibility for the HomeGrown Territory Grant ($50,000), FreshStart Grant ($30,000), or House and Land Package Exemption (full duty exemption, contracts to 30 Jun 2027) instead."
        );
      }
      break;
  }

  let foreignSurcharge = 0;
  if (foreignBuyer && propertyType !== "commercial") {
    foreignSurcharge = price * FOREIGN_SURCHARGE_RATE[state];
    if (FOREIGN_SURCHARGE_RATE[state] === 0) {
      notes.push(`${state} does not currently impose a foreign purchaser duty surcharge.`);
    }
  } else if (foreignBuyer && propertyType === "commercial") {
    notes.push(
      "Foreign purchaser surcharges in all states currently apply to residential land only — not modelled for commercial property."
    );
  }

  duty = round2(duty);
  foreignSurcharge = round2(foreignSurcharge);

  return {
    state,
    propertyType,
    price,
    duty,
    foreignSurcharge,
    total: round2(duty + foreignSurcharge),
    notes,
  };
}

export const ALL_STATES: AuState[] = [
  "VIC",
  "NSW",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
];

/** Convenience: compare estimated duty for the same price/property type across all 8 jurisdictions. */
export function compareAllStates(
  price: number,
  propertyType: PropertyType,
  options: StampDutyOptions = {}
): StampDutyResult[] {
  return ALL_STATES.map((s) => calculateStampDuty(s, price, propertyType, options));
}
