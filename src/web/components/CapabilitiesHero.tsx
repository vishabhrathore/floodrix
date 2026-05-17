"use client";

import React from "react";

import CommonHero from "./CommonHero";

const CapabilitiesHero: React.FC = () => {
  const heroData = {
    category: "Water Resources Engineering",
    headline: (
      <>
        Four domains.
        <br />
        One mandate —<br />
        <span className="italic text-brand-red">water, controlled.</span>
      </>
    ),
    description:
      "From highway drainage networks and flood model submissions to aquifer investigations and hydraulic structure design — FloodRix delivers engineering that is technically defensible, code-compliant, and built to outlast the infrastructure it serves.",
    backgroundText: "SERVICES",
    stats: [
      {
        value: "04",
        label: "Core Domains",
        detail: "Storm · Groundwater · Irrigation · Structures",
      },
      { value: "60+", label: "Projects", detail: "Delivered across India" },
      { value: "08", label: "States", detail: "Active project coverage" },
      {
        value: "100%",
        label: "Regulatory",
        detail: "First-review approval rate",
      },
    ],
  };

  return <CommonHero {...heroData} />;
};

export default CapabilitiesHero;
