"use client";

export interface WorkflowStep {
  title: string;
  desc: string;
  software: string;
  softwareDotColor: string;
  softwareBg: string;
  softwareTextColor: string;
  toolNote: string;
  nodeColor: string;
  nodeRingColor: string;
}

export interface DomainWorkflow {
  id: string;
  label: string;
  steps: WorkflowStep[];
  outputs: { title: string; highlighted: boolean }[];
  coords: string;
}

export const workflows: Record<string, DomainWorkflow> = {
  highway: {
    id: "highway",
    label: "How we work — Highway Drainage",
    coords: "Highway Hydraulics · Active",
    steps: [
      {
        title: "Catchment Hydrology",
        desc: "We define the catchment, analyse rainfall return periods and simulate runoff using SCS-CN or Rational Method to establish design peak flows.",
        software: "HEC-HMS",
        softwareDotColor: "#00C9A0",
        softwareBg: "rgba(0,201,160,0.08)",
        softwareTextColor: "#00C9A0",
        toolNote: "USACE · Hydrologic Engineering Centre",
        nodeColor: "#00C9A0",
        nodeRingColor: "rgba(0,201,160,0.4)",
      },
      {
        title: "Hydraulic Modelling & Scour",
        desc: "Water surface profile computation, culvert sizing, bridge hydraulics and scour depth assessment per HEC-18 & HEC-23 guidelines.",
        software: "HEC-RAS 1D / 2D",
        softwareDotColor: "#E8382A",
        softwareBg: "rgba(232,56,42,0.08)",
        softwareTextColor: "#E8382A",
        toolNote: "USACE · River Analysis System",
        nodeColor: "#E8382A",
        nodeRingColor: "rgba(232,56,42,0.5)",
      },
      {
        title: "Drainage Design & Mapping",
        desc: "Roadside drains, kerb inlets, storm sewers, energy dissipators and riprap protection — fully drawn and documented for construction.",
        software: "AutoCAD Civil 3D + ArcGIS",
        softwareDotColor: "rgba(255,255,255,0.3)",
        softwareBg: "rgba(255,255,255,0.05)",
        softwareTextColor: "rgba(240,237,232,0.55)",
        toolNote: "Autodesk · Esri / QGIS",
        nodeColor: "rgba(255,255,255,0.35)",
        nodeRingColor: "rgba(255,255,255,0.2)",
      },
    ],
    outputs: [
      { title: "Hydraulic Report", highlighted: true },
      { title: "Scour Assessment", highlighted: true },
      { title: "Drainage Design Drawings", highlighted: false },
      { title: "HEC-RAS Model Files", highlighted: false },
      { title: "Erosion Protection Design", highlighted: false },
      { title: "Culvert Sizing Schedule", highlighted: false },
    ],
  },
  infrastructure: {
    id: "infrastructure",
    label: "Workflow — Urban Infra & Flood",
    coords: "Urban Resilience · Operational",
    steps: [
      {
        title: "Master Planning",
        desc: "Integrated catchment modelling for large scale developments to ensure no-impact on downstream receptors.",
        software: "InfoWorks ICM",
        softwareDotColor: "#00C9A0",
        softwareBg: "rgba(0,201,160,0.08)",
        softwareTextColor: "#00C9A0",
        toolNote: "Innovyze · Global Leader",
        nodeColor: "#00C9A0",
        nodeRingColor: "rgba(0,201,160,0.4)",
      },
      {
        title: "Network Optimization",
        desc: "Dynamic simulation of storm and foul networks to minimize surcharging and optimize storage tank sizes.",
        software: "XP-SWMM / MicroDrainage",
        softwareDotColor: "#E8382A",
        softwareBg: "rgba(232,56,42,0.08)",
        softwareTextColor: "#E8382A",
        toolNote: "Stormwater Management Plan",
        nodeColor: "#E8382A",
        nodeRingColor: "rgba(232,56,42,0.5)",
      },
      {
        title: "Flood Hazard Mapping",
        desc: "2D surface flow modelling to determine velocity, depth and hazard rating for site specific flood risk.",
        software: "TUFLOW 2D",
        softwareDotColor: "rgba(255,255,255,0.3)",
        softwareBg: "rgba(255,255,255,0.05)",
        softwareTextColor: "rgba(240,237,232,0.55)",
        toolNote: "BMT · Advance 2D Simulation",
        nodeColor: "rgba(255,255,255,0.35)",
        nodeRingColor: "rgba(255,255,255,0.2)",
      },
    ],
    outputs: [
      { title: "Flood Risk Assessment (FRA)", highlighted: true },
      { title: "Surface Water Strategy", highlighted: true },
      { title: "Drainage Layouts", highlighted: false },
      { title: "Infiltration Studies", highlighted: false },
      { title: "Basin Sizing Charts", highlighted: false },
      { title: "Exceedance Flow Routes", highlighted: false },
    ],
  },
  groundwater: {
    id: "groundwater",
    label: "Process — Subsurface Matrix",
    coords: "Aquifer Systems · Simulated",
    steps: [
      {
        title: "Hydrogeological Input",
        desc: "Analysis of borehole data, pumping tests and aquifer parameters to build the conceptual model.",
        software: "AquiferTest / GMS",
        softwareDotColor: "#00C9A0",
        softwareBg: "rgba(0,201,160,0.08)",
        softwareTextColor: "#00C9A0",
        toolNote: "Conceptualization & Field Data",
        nodeColor: "#00C9A0",
        nodeRingColor: "rgba(0,201,160,0.4)",
      },
      {
        title: "Numerical Simulation",
        desc: "Large scale 3D groundwater flow and transport modelling for dewatering or plume migration.",
        software: "MODFLOW / FEFLOW",
        softwareDotColor: "#E8382A",
        softwareBg: "rgba(232,56,42,0.08)",
        softwareTextColor: "#E8382A",
        toolNote: "USGS · 3D Subsurface Experts",
        nodeColor: "#E8382A",
        nodeRingColor: "rgba(232,56,42,0.5)",
      },
      {
        title: "Dewatering Design",
        desc: "Optimization of pumping rates, well locations and drawdown impact assessment on surrounding structures.",
        software: "Visual MODFLOW Flex",
        softwareDotColor: "rgba(255,255,255,0.3)",
        softwareBg: "rgba(255,255,255,0.05)",
        softwareTextColor: "rgba(240,237,232,0.55)",
        toolNote: "Schlumberger · Engineering Design",
        nodeColor: "rgba(255,255,255,0.35)",
        nodeRingColor: "rgba(255,255,255,0.2)",
      },
    ],
    outputs: [
      { title: "Impact Assessment (HIA)", highlighted: true },
      { title: "Dewatering Design Pack", highlighted: true },
      { title: "Yield Analysis", highlighted: false },
      { title: "Contaminant Plume Maps", highlighted: false },
      { title: "Monitoring Strategy", highlighted: false },
      { title: "Seepage Analysis", highlighted: false },
    ],
  },
};
