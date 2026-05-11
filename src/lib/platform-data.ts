export interface Variable {
  key: string;
  label: string;
  notation: string;
  unit: string;
  defaultValue: number;
  hint?: string;
}

export interface Formula {
  expression: string;
  displayExpression: string;
  reference: string;
  region: string;
  logic: (vals: Record<string, number>) => { 
    result: number; 
    steps: { label: string; notation: string; value: string; unit: string; isResult?: boolean }[];
    chartFn: (x: number) => number;
    chartXLabel: string;
  };
}

export interface Calculator {
  id: string;
  type: 'calculator';
  name: string;
  description: string;
  categoryLabel?: string; // e.g. "Peak Discharge Method"
  icon?: string;
  variables: Variable[];
  formula: Formula;
}

export interface Category {
  id: string;
  type: 'category';
  name: string;
  children: (Category | Calculator)[];
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  children: (Category | Calculator)[];
}

export const PLATFORM_DATA: Workspace[] = [
  {
    id: 'ws-hydrology',
    name: 'Hydrology & Stormwater',
    description: 'Advanced hydrological modeling and stormwater management toolsets for urban and rural catchments.',
    children: [
      {
        id: 'cat-surface-runoff',
        type: 'category',
        name: 'Surface Runoff',
        children: [
          {
            id: 'cat-empirical',
            type: 'category',
            name: 'Empirical Methods',
            children: [
              {
                id: 'calc-rational',
                type: 'calculator',
                name: 'Rational Method Analysis',
                description: 'The global standard for peak runoff rate calculation in small watersheds (typically < 50 hectares). Verified for urban drainage design.',
                categoryLabel: 'Hydrological Peak Discharge',
                variables: [
                  { key: 'C', label: 'Runoff Coefficient', notation: 'C', unit: 'dim', defaultValue: 0.35, hint: 'Range: 0.05 to 0.95' },
                  { key: 'I', label: 'Rainfall Intensity', notation: 'i', unit: 'in/hr', defaultValue: 4.2, hint: 'Based on Tc and Return Period' },
                  { key: 'A', label: 'Drainage Area', notation: 'A', unit: 'acres', defaultValue: 12.5 },
                ],
                formula: {
                  expression: 'Q = C * i * A',
                  displayExpression: 'Q = C · i · A',
                  reference: 'ASCE Manual 77',
                  region: 'International',
                  logic: (vals) => {
                    const Q = vals.C * vals.I * vals.A;
                    return {
                      result: Q,
                      steps: [
                        { label: 'Runoff Coefficient', notation: 'C', value: vals.C.toString(), unit: '—' },
                        { label: 'Rainfall Intensity', notation: 'i', value: vals.I.toString(), unit: 'in/hr' },
                        { label: 'Drainage Area', notation: 'A', value: vals.A.toString(), unit: 'acres' },
                        { label: 'Peak Discharge', notation: 'Q', value: Q.toFixed(3), unit: 'cfs', isResult: true },
                      ],
                      chartFn: (x) => vals.C * x * vals.A,
                      chartXLabel: 'Intensity (i) vs Discharge (Q)'
                    };
                  }
                }
              },
              {
                id: 'calc-dicken',
                type: 'calculator',
                name: "Dicken's Empirical Method",
                description: "Regional peak discharge estimation for North Indian catchments. Applicable for large natural watersheds with regional adjustment factors per IRC:SP:13-2004 §3.1.",
                categoryLabel: 'Empirical Hydrology (North India)',
                variables: [
                  { key: 'Cd', label: "Dicken's Constant", notation: 'Cd', unit: '—', defaultValue: 11.5, hint: 'Range: 6 to 30' },
                  { key: 'A', label: 'Catchment Area', notation: 'A', unit: 'km²', defaultValue: 45.0 },
                ],
                formula: {
                  expression: 'Q = Cd * A^(3/4)',
                  displayExpression: 'Q = Cd · A^¾',
                  reference: 'IRC:SP:13-2004 Cl. 3.1',
                  region: 'North India',
                  logic: (vals) => {
                    const Q = vals.Cd * Math.pow(vals.A, 0.75);
                    return {
                      result: Q,
                      steps: [
                        { label: "Dicken's Constant", notation: 'Cd', value: vals.Cd.toString(), unit: '—' },
                        { label: 'Catchment Area', notation: 'A', value: vals.A.toString(), unit: 'km²' },
                        { label: 'Peak Discharge', notation: 'Q', value: Q.toFixed(3), unit: 'Cumecs', isResult: true },
                      ],
                      chartFn: (x) => vals.Cd * Math.pow(x, 0.75),
                      chartXLabel: 'Area (A) vs Discharge (Q)'
                    };
                  }
                }
              },
              {
                id: 'calc-ryves',
                type: 'calculator',
                name: "Ryve's Empirical Method",
                description: "Specialized peak discharge estimation for South Indian catchments. Incorporates regional basin characteristics per IRC:SP:13-2004 §3.2.",
                categoryLabel: 'Empirical Hydrology (South India)',
                variables: [
                  { key: 'Cr', label: "Ryve's Constant", notation: 'Cr', unit: '—', defaultValue: 6.8, hint: 'Range: 6.8 to 40' },
                  { key: 'A', label: 'Catchment Area', notation: 'A', unit: 'km²', defaultValue: 45.0 },
                ],
                formula: {
                  expression: 'Q = Cr * A^(2/3)',
                  displayExpression: 'Q = Cr · A^⅔',
                  reference: 'IRC:SP:13-2004 Cl. 3.2',
                  region: 'South India',
                  logic: (vals) => {
                    const Q = vals.Cr * Math.pow(vals.A, 2/3);
                    return {
                      result: Q,
                      steps: [
                        { label: "Ryve's Constant", notation: 'Cr', value: vals.Cr.toString(), unit: '—' },
                        { label: 'Catchment Area', notation: 'A', value: vals.A.toString(), unit: 'km²' },
                        { label: 'Peak Discharge', notation: 'Q', value: Q.toFixed(3), unit: 'Cumecs', isResult: true },
                      ],
                      chartFn: (x) => vals.Cr * Math.pow(x, 2/3),
                      chartXLabel: 'Area (A) vs Discharge (Q)'
                    };
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'ws-structural',
    name: 'Structural Assurance',
    description: 'Specialized structural engineering toolsets for bridge design, foundations, and reinforced concrete.',
    children: [
      {
        id: 'cat-concrete',
        type: 'category',
        name: 'Concrete Design',
        children: [
          {
            id: 'cat-beams',
            type: 'category',
            name: 'Beam Capacity',
            children: [
              {
                id: 'calc-flexure',
                type: 'calculator',
                name: 'Flexural Strength Verification',
                description: 'Automated verification of nominal moment capacity for reinforced concrete sections per limit state principles.',
                categoryLabel: 'Concrete Member Assurance',
                variables: [
                  { key: 'fc', label: 'Concrete Strength (f\'c)', notation: 'f\'c', unit: 'psi', defaultValue: 4000 },
                  { key: 'fy', label: 'Steel Strength (fy)', notation: 'fy', unit: 'psi', defaultValue: 60000 },
                  { key: 'b', label: 'Beam Width (b)', notation: 'b', unit: 'in', defaultValue: 12 },
                  { key: 'd', label: 'Effective Depth (d)', notation: 'd', unit: 'in', defaultValue: 20 },
                  { key: 'As', label: 'Steel Area (As)', notation: 'As', unit: 'in²', defaultValue: 1.2 },
                ],
                formula: {
                  expression: 'Mn = As * fy * (d - a/2)',
                  displayExpression: 'Mn = As · fy · (d - a/2)',
                  reference: 'ACI 318-19',
                  region: 'International',
                  logic: (vals) => {
                    const a = (vals.As * vals.fy) / (0.85 * vals.fc * vals.b);
                    const Mn = vals.As * vals.fy * (vals.d - a / 2) / 12000; // kip-ft
                    return {
                      result: Mn,
                      steps: [
                        { label: 'Steel Area', notation: 'As', value: vals.As.toString(), unit: 'in²' },
                        { label: 'Steel Yield', notation: 'fy', value: vals.fy.toString(), unit: 'psi' },
                        { label: 'Depth', notation: 'd', value: vals.d.toString(), unit: 'in' },
                        { label: 'Comp. Block', notation: 'a', value: a.toFixed(3), unit: 'in' },
                        { label: 'Nominal Moment', notation: 'Mn', value: Mn.toFixed(2), unit: 'k-ft', isResult: true },
                      ],
                      chartFn: (x) => {
                        const a_local = (x * vals.fy) / (0.85 * vals.fc * vals.b);
                        return (x * vals.fy * (vals.d - a_local / 2)) / 12000;
                      },
                      chartXLabel: 'Steel Area (As) vs Moment (Mn)'
                    };
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  }
];

// Helper to flatten calculators for search/discovery
export const getAllCalculators = (nodes: (Category | Calculator)[]): Calculator[] => {
  let calcs: Calculator[] = [];
  nodes.forEach(node => {
    if (node.type === 'calculator') {
      calcs.push(node);
    } else {
      calcs = [...calcs, ...getAllCalculators(node.children)];
    }
  });
  return calcs;
};
