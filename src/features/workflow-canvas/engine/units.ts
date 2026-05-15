// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/units.ts
//  Unit handling for the entire system
//
//  DESIGN PRINCIPLE:
//    Values flow through the execution engine as RAW NUMBERS in
//    CANONICAL UNITS. Conversion only happens at two boundaries:
//      1. INPUT boundary  — user enters in their preferred unit → convert to canonical
//      2. OUTPUT boundary — canonical value → convert to user's display unit
//
//    Formulas NEVER deal with units. They receive numbers and return numbers.
//    The variable's declared canonical unit tells everyone what those numbers mean.
//
//  WHY NOT ATTACH UNITS TO EVERY VALUE:
//    Because IRC formulas are written for specific units.
//    "Q = C × M^(3/4)" assumes M is in Km². The formula doesn't work
//    if M is in m² — you'd need a different constant C. Rather than
//    rewriting every formula to be unit-aware, we just guarantee that M
//    is always in Km² inside the engine.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Unit Definitions ────────────────────────────────────────────────────
//
// Every unit belongs to a DIMENSION (length, area, volume, etc.).
// Units in the same dimension can be converted between each other.
// Each dimension has one CANONICAL unit — what the engine uses internally.

export interface UnitDef {
  symbol: string; // "Km²" — what's displayed
  name: string; // "Square Kilometers"
  dimension: Dimension; // "area"
  toCanonical: number; // Multiply by this to convert TO canonical
  fromCanonical: number; // Multiply by this to convert FROM canonical
  // For non-linear conversions (temperature):
  toCanonicalFn?: (v: number) => number;
  fromCanonicalFn?: (v: number) => number;
}

export type Dimension =
  | "length"
  | "area"
  | "volume"
  | "discharge" // flow rate (volume/time)
  | "velocity"
  | "rainfall" // depth (used as intensity when /time)
  | "intensity" // rainfall intensity (depth/time)
  | "slope"
  | "time"
  | "mass"
  | "force"
  | "pressure"
  | "temperature"
  | "dimensionless";

// ─── The Unit Registry ───────────────────────────────────────────────────
//
// Canonical units (what the engine uses internally) are marked with ★
// These were chosen to match IRC:SP:13-2004 conventions so that
// formulas work without conversion factors.

export const UNITS: Record<string, UnitDef> = {
  // ── Length ──────────────────────────────────────────────────────────
  // ★ Canonical: Km (IRC formulas use Km for basin length)
  m: {
    symbol: "m",
    name: "Meters",
    dimension: "length",
    toCanonical: 0.001,
    fromCanonical: 1000,
  },
  Km: {
    symbol: "Km",
    name: "Kilometers",
    dimension: "length",
    toCanonical: 1,
    fromCanonical: 1,
  }, // ★
  ft: {
    symbol: "ft",
    name: "Feet",
    dimension: "length",
    toCanonical: 0.0003048,
    fromCanonical: 3280.84,
  },
  mi: {
    symbol: "mi",
    name: "Miles",
    dimension: "length",
    toCanonical: 1.60934,
    fromCanonical: 0.621371,
  },
  cm: {
    symbol: "cm",
    name: "Centimeters",
    dimension: "length",
    toCanonical: 0.00001,
    fromCanonical: 100000,
  },
  mm: {
    symbol: "mm",
    name: "Millimeters",
    dimension: "length",
    toCanonical: 0.000001,
    fromCanonical: 1000000,
  },

  // ── Elevation (special case of length — canonical is meters) ───────
  // ★ Canonical: m (elevations are always in meters in IRC)
  m_elev: {
    symbol: "m",
    name: "Meters (elevation)",
    dimension: "length",
    toCanonical: 0.001,
    fromCanonical: 1000,
  },
  // NOTE: For elevation fields, the canonical is actually meters,
  // but since our length canonical is Km, elevation fields declare
  // their own canonical unit explicitly. See "per-variable canonical" below.

  // ── Area ───────────────────────────────────────────────────────────
  // ★ Canonical: Km² (Dicken's, Ryve's, Ingli's all use Km²)
  "Km²": {
    symbol: "Km²",
    name: "Square Kilometers",
    dimension: "area",
    toCanonical: 1,
    fromCanonical: 1,
  }, // ★
  "m²": {
    symbol: "m²",
    name: "Square Meters",
    dimension: "area",
    toCanonical: 0.000001,
    fromCanonical: 1000000,
  },
  ha: {
    symbol: "ha",
    name: "Hectares",
    dimension: "area",
    toCanonical: 0.01,
    fromCanonical: 100,
  },
  acres: {
    symbol: "acres",
    name: "Acres",
    dimension: "area",
    toCanonical: 0.00404686,
    fromCanonical: 247.105,
  },
  "sq.mi": {
    symbol: "sq.mi",
    name: "Square Miles",
    dimension: "area",
    toCanonical: 2.58999,
    fromCanonical: 0.386102,
  },
  "sq.ft": {
    symbol: "sq.ft",
    name: "Square Feet",
    dimension: "area",
    toCanonical: 0.0000000929,
    fromCanonical: 10763910.4,
  },

  // ── Discharge (flow rate) ──────────────────────────────────────────
  // ★ Canonical: Cumecs (m³/s — standard in IRC)
  Cumecs: {
    symbol: "Cumecs",
    name: "Cubic Meters per Second",
    dimension: "discharge",
    toCanonical: 1,
    fromCanonical: 1,
  }, // ★
  "m³/s": {
    symbol: "m³/s",
    name: "Cubic Meters per Second",
    dimension: "discharge",
    toCanonical: 1,
    fromCanonical: 1,
  },
  cusecs: {
    symbol: "cusecs",
    name: "Cubic Feet per Second",
    dimension: "discharge",
    toCanonical: 0.028317,
    fromCanonical: 35.3147,
  },
  "l/s": {
    symbol: "l/s",
    name: "Liters per Second",
    dimension: "discharge",
    toCanonical: 0.001,
    fromCanonical: 1000,
  },
  "Ml/d": {
    symbol: "Ml/d",
    name: "Megalitres per Day",
    dimension: "discharge",
    toCanonical: 0.011574,
    fromCanonical: 86.4,
  },

  // ── Rainfall depth ────────────────────────────────────────────────
  // ★ Canonical: cm (IRC uses cm for annual rainfall, 24-hr rainfall)
  cm_rain: {
    symbol: "cm",
    name: "Centimeters",
    dimension: "rainfall",
    toCanonical: 1,
    fromCanonical: 1,
  }, // ★
  mm_rain: {
    symbol: "mm",
    name: "Millimeters",
    dimension: "rainfall",
    toCanonical: 0.1,
    fromCanonical: 10,
  },
  in_rain: {
    symbol: "in",
    name: "Inches",
    dimension: "rainfall",
    toCanonical: 2.54,
    fromCanonical: 0.3937,
  },

  // ── Rainfall intensity ────────────────────────────────────────────
  // ★ Canonical: cm/hr (IRC uses cm/hr for critical intensity Ic)
  "cm/hr": {
    symbol: "cm/hr",
    name: "Centimeters per Hour",
    dimension: "intensity",
    toCanonical: 1,
    fromCanonical: 1,
  }, // ★
  "mm/hr": {
    symbol: "mm/hr",
    name: "Millimeters per Hour",
    dimension: "intensity",
    toCanonical: 0.1,
    fromCanonical: 10,
  },
  "in/hr": {
    symbol: "in/hr",
    name: "Inches per Hour",
    dimension: "intensity",
    toCanonical: 2.54,
    fromCanonical: 0.3937,
  },

  // ── Velocity ──────────────────────────────────────────────────────
  // ★ Canonical: m/s
  "m/s": {
    symbol: "m/s",
    name: "Meters per Second",
    dimension: "velocity",
    toCanonical: 1,
    fromCanonical: 1,
  }, // ★
  "ft/s": {
    symbol: "ft/s",
    name: "Feet per Second",
    dimension: "velocity",
    toCanonical: 0.3048,
    fromCanonical: 3.28084,
  },
  "Km/hr": {
    symbol: "Km/hr",
    name: "Kilometers per Hour",
    dimension: "velocity",
    toCanonical: 0.27778,
    fromCanonical: 3.6,
  },

  // ── Time ──────────────────────────────────────────────────────────
  // ★ Canonical: hr (IRC uses hours for time of concentration)
  hr: {
    symbol: "hr",
    name: "Hours",
    dimension: "time",
    toCanonical: 1,
    fromCanonical: 1,
  }, // ★
  min: {
    symbol: "min",
    name: "Minutes",
    dimension: "time",
    toCanonical: 1 / 60,
    fromCanonical: 60,
  },
  s: {
    symbol: "s",
    name: "Seconds",
    dimension: "time",
    toCanonical: 1 / 3600,
    fromCanonical: 3600,
  },
  days: {
    symbol: "days",
    name: "Days",
    dimension: "time",
    toCanonical: 24,
    fromCanonical: 1 / 24,
  },
  years: {
    symbol: "years",
    name: "Years",
    dimension: "time",
    toCanonical: 8766,
    fromCanonical: 0.000114,
  },

  // ── Volume ────────────────────────────────────────────────────────
  // ★ Canonical: m³
  "m³": {
    symbol: "m³",
    name: "Cubic Meters",
    dimension: "volume",
    toCanonical: 1,
    fromCanonical: 1,
  }, // ★
  l: {
    symbol: "l",
    name: "Liters",
    dimension: "volume",
    toCanonical: 0.001,
    fromCanonical: 1000,
  },
  "ft³": {
    symbol: "ft³",
    name: "Cubic Feet",
    dimension: "volume",
    toCanonical: 0.028317,
    fromCanonical: 35.3147,
  },
  Ml: {
    symbol: "Ml",
    name: "Megalitres",
    dimension: "volume",
    toCanonical: 1000,
    fromCanonical: 0.001,
  },

  // ── Slope ─────────────────────────────────────────────────────────
  // ★ Canonical: dimensionless ratio (0.001 = 1:1000)
  ratio: {
    symbol: "",
    name: "Slope Ratio",
    dimension: "slope",
    toCanonical: 1,
    fromCanonical: 1,
  }, // ★
  "%": {
    symbol: "%",
    name: "Percent",
    dimension: "slope",
    toCanonical: 0.01,
    fromCanonical: 100,
  },
  "‰": {
    symbol: "‰",
    name: "Per Mille",
    dimension: "slope",
    toCanonical: 0.001,
    fromCanonical: 1000,
  },
  "1_in_N": {
    symbol: "1 in N",
    name: "One in N",
    dimension: "slope",
    toCanonical: 1,
    fromCanonical: 1,
  },

  // ── Dimensionless (coefficients, factors) ─────────────────────────
  "—": {
    symbol: "—",
    name: "Dimensionless",
    dimension: "dimensionless",
    toCanonical: 1,
    fromCanonical: 1,
  },
  "": {
    symbol: "",
    name: "Dimensionless",
    dimension: "dimensionless",
    toCanonical: 1,
    fromCanonical: 1,
  },
};

// Canonical unit per dimension — what the engine uses internally
export const CANONICAL_UNITS: Record<Dimension, string> = {
  length: "Km",
  area: "Km²",
  volume: "m³",
  discharge: "Cumecs",
  velocity: "m/s",
  rainfall: "cm_rain",
  intensity: "cm/hr",
  slope: "ratio",
  time: "hr",
  mass: "Kg",
  force: "kN",
  pressure: "kPa",
  temperature: "°C",
  dimensionless: "—",
};

// ─── Conversion Functions ────────────────────────────────────────────────

/**
 * Convert a value from one unit to another.
 * Both units must be in the same dimension.
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
): number {
  if (fromUnit === toUnit) return value;

  const from = UNITS[fromUnit];
  const to = UNITS[toUnit];

  if (!from) throw new Error(`Unknown unit: "${fromUnit}"`);
  if (!to) throw new Error(`Unknown unit: "${toUnit}"`);

  if (from.dimension !== to.dimension) {
    throw new Error(
      `Cannot convert ${from.name} (${from.dimension}) to ${to.name} (${to.dimension})`,
    );
  }

  // Convert: source → canonical → target
  const canonical = from.toCanonicalFn
    ? from.toCanonicalFn(value)
    : value * from.toCanonical;

  const result = to.fromCanonicalFn
    ? to.fromCanonicalFn(canonical)
    : canonical * to.fromCanonical;

  return result;
}

/**
 * Convert a value TO the canonical unit for its dimension.
 */
export function toCanonical(value: number, fromUnit: string): number {
  const def = UNITS[fromUnit];
  if (!def) return value; // Unknown unit, pass through
  if (def.dimension === "dimensionless") return value;

  return def.toCanonicalFn ? def.toCanonicalFn(value) : value * def.toCanonical;
}

/**
 * Convert a value FROM canonical to a display unit.
 */
export function fromCanonical(value: number, toUnit: string): number {
  const def = UNITS[toUnit];
  if (!def) return value;
  if (def.dimension === "dimensionless") return value;

  return def.fromCanonicalFn
    ? def.fromCanonicalFn(value)
    : value * def.fromCanonical;
}

/**
 * Get all units available for a given dimension.
 * Used by the UI to show unit dropdown on input fields.
 */
export function getUnitsForDimension(dimension: Dimension): UnitDef[] {
  return Object.values(UNITS).filter((u) => u.dimension === dimension);
}

/**
 * Check if two units are compatible (same dimension).
 */
export function areCompatible(unitA: string, unitB: string): boolean {
  const a = UNITS[unitA];
  const b = UNITS[unitB];
  if (!a || !b) return false;
  return a.dimension === b.dimension;
}

/**
 * Get the dimension of a unit symbol.
 */
export function getDimension(unit: string): Dimension | null {
  return UNITS[unit]?.dimension ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  HOW UNITS FLOW THROUGH THE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
//
//  ┌──────────────────────────────────────────────────────────────────┐
//  │                     INPUT NODE                                   │
//  │                                                                  │
//  │  User enters: 24.1  [Km² ▾]                                    │
//  │                            ↑ dropdown shows all area units       │
//  │                                                                  │
//  │  Field config:                                                   │
//  │    canonicalUnit: "Km²"     ← what the formula expects          │
//  │    displayUnit:   "Km²"     ← what the user chose (default)     │
//  │    userCanChangeUnit: true  ← allow switching to ha, acres, etc │
//  │                                                                  │
//  │  If user switches to hectares and types 2410:                    │
//  │    displayValue = 2410                                           │
//  │    canonicalValue = 2410 × 0.01 = 24.1                          │
//  │    → stored in variables as: { M: 24.1 }  (always canonical)    │
//  │                                                                  │
//  └──────────────────────────────────────────────────────────────────┘
//                              │
//                              ▼
//  ┌──────────────────────────────────────────────────────────────────┐
//  │                  VARIABLE CONTEXT                                │
//  │                                                                  │
//  │  { M: 24.1, annual_rain: 120, F_24hr: 25.1, tc: 2.72 }        │
//  │                                                                  │
//  │  ALL values are in canonical units:                               │
//  │    M         → 24.1 Km²    (not ha, not acres)                  │
//  │    annual_rain → 120 cm    (not mm, not inches)                  │
//  │    F_24hr    → 25.1 cm     (not mm)                              │
//  │    tc        → 2.72 hr     (not minutes)                         │
//  │                                                                  │
//  │  Formulas NEVER see units. They just see numbers.                │
//  │  "C * M^(3/4)" computes 14 × 24.1^0.75 = 152.06               │
//  │  The result IS in Cumecs because the formula was derived         │
//  │  for M in Km² and C calibrated accordingly.                      │
//  │                                                                  │
//  └──────────────────────────────────────────────────────────────────┘
//                              │
//                              ▼
//  ┌──────────────────────────────────────────────────────────────────┐
//  │                   DISPLAY NODE                                   │
//  │                                                                  │
//  │  Shows: Q = 152.06 Cumecs                                       │
//  │                                                                  │
//  │  User can toggle display unit:                                   │
//  │    [Cumecs ▾]  → 152.06                                         │
//  │    [cusecs ▾]  → 5369.4  (152.06 × 35.31)                      │
//  │    [l/s ▾]     → 152060  (152.06 × 1000)                       │
//  │                                                                  │
//  │  The stored value doesn't change. Only the display converts.     │
//  │                                                                  │
//  └──────────────────────────────────────────────────────────────────┘

// ═══════════════════════════════════════════════════════════════════════════
//  INTEGRATION: How existing node configs change to support units
// ═══════════════════════════════════════════════════════════════════════════

// ─── INPUT node field: now has canonical + display unit ──────────────────

export interface InputFieldWithUnit {
  key: string;
  label: string;

  // Unit handling
  canonicalUnit: string; // "Km²" — what goes into variable context
  defaultDisplayUnit: string; // "Km²" — what the UI shows initially
  userCanChangeUnit: boolean; // true → show unit dropdown
  dimension: Dimension; // "area" → determines which units appear in dropdown

  // Validation (in canonical units)
  constraints?: {
    min?: number; // 0 (in Km²)
    max?: number; // 100000 (in Km²)
    step?: number;
    required?: boolean;
  };

  default?: number; // Default value (in canonical units)
  hint?: string;
}

// Example: catchment area field
const catchmentAreaField: InputFieldWithUnit = {
  key: "M",
  label: "Catchment Area",
  canonicalUnit: "Km²",
  defaultDisplayUnit: "Km²",
  userCanChangeUnit: true, // User can switch to ha, acres, m², etc.
  dimension: "area",
  constraints: { min: 0, max: 100000, required: true },
  default: 24.1,
  hint: "Total drainage area upstream of bridge",
};

// Example: elevation field (canonical is meters, not Km)
const elevationField: InputFieldWithUnit = {
  key: "H_high",
  label: "Highest Elevation",
  canonicalUnit: "m", // This variable uses meters, not Km
  defaultDisplayUnit: "m",
  userCanChangeUnit: true, // User could switch to ft
  dimension: "length",
  constraints: { min: 0, max: 10000, required: true },
  default: 209,
  hint: "Maximum elevation in catchment",
};

// ─── WORKFLOW VARIABLE: now declares its canonical unit ──────────────────
//
// This is what goes in the workflow_variables table.
// The `unit` field we already have becomes the canonical unit.

export interface WorkflowVariableWithUnit {
  contextKey: string; // "M"
  displayLabel: string; // "Catchment Area"
  notation: string; // "M"

  unit: string; // "Km²" — canonical unit (already in schema)
  dimension: Dimension; // "area" — NEW field needed in schema

  // For display purposes
  defaultDisplayUnit?: string; // If different from canonical
}

// ─── FORMULA REGISTRY: input/output units are canonical ─────────────────
//
// When the registry says a formula's input M has unit "Km²",
// it means the formula EXPECTS M in Km². The engine guarantees this
// because all values in the variable context are already canonical.

// No change needed to formula_registry — the unit fields already there
// serve as canonical unit declarations.

// ─── DISPLAY node: adds unit conversion for output ──────────────────────

export interface DisplayConfig {
  compare_variables: {
    key: string;
    label: string;
    canonicalUnit: string; // "Cumecs"
    displayUnit?: string; // User can override: "cusecs"
  }[];
  result_variable: string;
  result_unit: string; // Canonical: "Cumecs"
  result_display_unit?: string; // Override: "cusecs" if user prefers
}

// ═══════════════════════════════════════════════════════════════════════════
//  INPUT NODE: Convert user input to canonical at the boundary
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process user input from an INPUT node.
 * Converts each field value from the user's chosen display unit
 * to the canonical unit before storing in variable context.
 *
 * Called by the executor when resuming from an INPUT pause.
 */
export function processInputValues(
  userInput: Record<string, unknown>,
  fieldDefs: InputFieldWithUnit[],
  userUnits?: Record<string, string>, // { M: "ha", H_high: "ft" }
): Record<string, number> {
  const canonical: Record<string, number> = {};

  for (const field of fieldDefs) {
    const rawValue = userInput[field.key];
    if (rawValue === undefined || rawValue === null) continue;

    const numericValue =
      typeof rawValue === "string" ? parseFloat(rawValue) : Number(rawValue);

    if (isNaN(numericValue)) {
      throw new Error(`${field.label}: expected a number, got "${rawValue}"`);
    }

    // What unit did the user enter in?
    const userUnit = userUnits?.[field.key] ?? field.defaultDisplayUnit;

    // Convert to canonical
    if (userUnit === field.canonicalUnit) {
      canonical[field.key] = numericValue;
    } else {
      canonical[field.key] = convertUnit(
        numericValue,
        userUnit,
        field.canonicalUnit,
      );
    }

    // Validate (in canonical units)
    if (field.constraints) {
      const v = canonical[field.key];
      if (field.constraints.min !== undefined && v < field.constraints.min) {
        throw new Error(
          `${field.label}: ${v} ${field.canonicalUnit} is below minimum ${field.constraints.min} ${field.canonicalUnit}`,
        );
      }
      if (field.constraints.max !== undefined && v > field.constraints.max) {
        throw new Error(
          `${field.label}: ${v} ${field.canonicalUnit} exceeds maximum ${field.constraints.max} ${field.canonicalUnit}`,
        );
      }
    }
  }

  return canonical;
}

// ═══════════════════════════════════════════════════════════════════════════
//  DISPLAY: Convert canonical values for user viewing
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format a canonical value for display in the user's preferred unit.
 */
export function formatForDisplay(
  value: number,
  canonicalUnit: string,
  displayUnit?: string,
  precision: number = 3,
): { value: number; display: string; unit: string } {
  const targetUnit = displayUnit ?? canonicalUnit;

  let displayValue: number;
  if (targetUnit === canonicalUnit) {
    displayValue = value;
  } else {
    displayValue = convertUnit(value, canonicalUnit, targetUnit);
  }

  const rounded = parseFloat(displayValue.toFixed(precision));
  const unitDef = UNITS[targetUnit];
  const unitSymbol = unitDef?.symbol ?? targetUnit;

  return {
    value: rounded,
    display: `${rounded} ${unitSymbol}`,
    unit: unitSymbol,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  BATCH MODE: Detect and convert units from Excel column headers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a column header like "Area (ha)" or "Rainfall (mm)"
 * to extract the variable name and unit.
 */
export function parseColumnHeader(header: string): {
  name: string;
  unit: string | null;
} {
  // Match patterns like "Area (ha)", "M (Km²)", "Rainfall [mm]"
  const match = header.match(/^(.+?)\s*[\(\[](.+?)[\)\]]\s*$/);
  if (match) {
    return { name: match[1].trim(), unit: match[2].trim() };
  }
  return { name: header.trim(), unit: null };
}

/**
 * Build a column mapping that includes unit conversion.
 * Used when processing uploaded Excel/CSV files.
 *
 * If the Excel column says "Area (ha)" and the workflow variable M
 * expects Km², the mapping includes the conversion factor.
 */
export function buildBatchColumnMapping(
  fileColumns: string[],
  workflowVariables: WorkflowVariableWithUnit[],
): {
  mapping: Record<
    string,
    {
      contextKey: string;
      fileColumn: string;
      fileUnit: string | null;
      canonicalUnit: string;
      needsConversion: boolean;
      conversionFactor: number;
    }
  >;
  warnings: string[];
  errors: string[];
} {
  const mapping: Record<string, any> = {};
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const col of fileColumns) {
    const parsed = parseColumnHeader(col);

    // Find matching workflow variable
    const variable = workflowVariables.find(
      (v) =>
        v.contextKey === parsed.name ||
        v.displayLabel.toLowerCase() === parsed.name.toLowerCase() ||
        v.notation === parsed.name,
    );

    if (!variable) {
      warnings.push(`Column "${col}" does not match any workflow variable`);
      continue;
    }

    let needsConversion = false;
    let conversionFactor = 1;

    if (parsed.unit && parsed.unit !== variable.unit) {
      // Check if units are compatible
      if (areCompatible(parsed.unit, variable.unit)) {
        needsConversion = true;
        // Pre-compute the conversion factor for the entire column
        conversionFactor = convertUnit(1, parsed.unit, variable.unit);
        warnings.push(
          `Column "${col}": converting from ${parsed.unit} to ${variable.unit} (×${conversionFactor.toFixed(6)})`,
        );
      } else {
        errors.push(
          `Column "${col}" has unit ${parsed.unit} but variable ${variable.contextKey} expects ${variable.unit} — incompatible dimensions`,
        );
      }
    }

    mapping[col] = {
      contextKey: variable.contextKey,
      fileColumn: col,
      fileUnit: parsed.unit,
      canonicalUnit: variable.unit,
      needsConversion,
      conversionFactor,
    };
  }

  return { mapping, warnings, errors };
}

// ═══════════════════════════════════════════════════════════════════════════
//  UNIT_CONVERSION NODE: Explicit conversion in the workflow
// ═══════════════════════════════════════════════════════════════════════════
//
// Sometimes a workflow needs to convert between unit systems mid-flow.
// For example: compute area in m² from length measurements, then
// convert to Km² before feeding into Dicken's formula.
//
// The UNIT_CONVERSION node config:
//
//  {
//    "input_variable": "area_m2",
//    "input_unit": "m²",
//    "output_variable": "M",
//    "output_unit": "Km²",
//    // Auto-computed from unit registry:
//    "conversion_factor": 0.000001
//  }
//
// The executor runs: M = area_m2 × 0.000001
// This is already handled by the existing UNIT_CONVERSION node type
// in the executor. The unit registry provides the conversion factor.

// ═══════════════════════════════════════════════════════════════════════════
//  SCHEMA CHANGE NEEDED
// ═══════════════════════════════════════════════════════════════════════════
//
// The workflow_variables table needs ONE new field:
//
//   dimension  String?   // "area", "length", "discharge", etc.
//
// This tells the UI which unit dropdown to show.
// The existing `unit` field already serves as the canonical unit.
//
// Everything else (conversion logic, unit registry, validation)
// lives in application code, not in the database.
