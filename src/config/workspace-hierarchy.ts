export type WorkspaceNodeType =
  | "FOLDER"
  | "CALCULATOR_LINK"
  | "EXTERNAL_LINK"
  | "ROOT";

export interface WorkspaceNodeJSON {
  id: string;
  type: WorkspaceNodeType;
  name: string;
  description?: string;
  icon?: string;
  calculatorId?: string; // Linked to Calculator ID in platform-data
  url?: string;
  children?: WorkspaceNodeJSON[];
  sortOrder?: number;
}

export interface WorkspaceJSON {
  id: string;
  name: string;
  description: string;
  icon?: string;
  nodes: WorkspaceNodeJSON[];
}

/**
 * WORKSPACE_HIERARCHY
 *
 * This constant serves as the structural blueprint for the platform's workspaces,
 * mimicking the tree-like hierarchy found in the Prisma WorkspaceNode model.
 * Each branch represents a technical domain or sub-domain, with calculators
 * always serving as the terminal (leaf) nodes.
 */
export const WORKSPACE_HIERARCHY: WorkspaceJSON[] = [
  {
    id: "ws-hydrology",
    name: "Hydrology & Stormwater",
    description:
      "Advanced hydrological modeling and stormwater management toolsets for urban and rural catchments.",
    icon: "droplets",
    nodes: [
      {
        id: "node-surface-runoff",
        type: "FOLDER",
        name: "Surface Runoff",
        icon: "waves",
        children: [
          {
            id: "node-empirical",
            type: "FOLDER",
            name: "Empirical Methods",
            icon: "sigma",
            children: [
              {
                id: "node-rational",
                type: "CALCULATOR_LINK",
                name: "Rational Method Analysis",
                calculatorId: "calc-rational",
              },
              {
                id: "node-dicken",
                type: "CALCULATOR_LINK",
                name: "Dicken's Empirical Method",
                calculatorId: "calc-dicken",
              },
              {
                id: "node-ryves",
                type: "CALCULATOR_LINK",
                name: "Ryve's Empirical Method",
                calculatorId: "calc-ryves",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "ws-structural",
    name: "Structural Assurance",
    description:
      "Specialized structural engineering toolsets for bridge design, foundations, and reinforced concrete.",
    icon: "building2",
    nodes: [
      {
        id: "node-concrete",
        type: "FOLDER",
        name: "Concrete Design",
        icon: "anvil",
        children: [
          {
            id: "node-beams",
            type: "FOLDER",
            name: "Beam Capacity",
            children: [
              {
                id: "node-flexure",
                type: "CALCULATOR_LINK",
                name: "Flexural Strength Verification",
                calculatorId: "calc-flexure",
              },
            ],
          },
        ],
      },
    ],
  },
];
