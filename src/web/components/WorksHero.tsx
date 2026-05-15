"use client";

import React from "react";

import CommonHero from "./CommonHero";

const WorksHero: React.FC = () => {
  const heroData = {
    category: "Project Portfolio",
    headline: (
      <>
        Engineering that
        <br />
        stands up when
        <br />
        <span className="italic text-brand-red">water pushes back.</span>
      </>
    ),
    description:
      "Every project in our portfolio begins with a specific technical problem — a highway corridor flooding seasonally, an aquifer being depleted faster than it recharges, a canal command receiving inequitable supply. These are the problems we were engaged to solve.",
    backgroundText: "PROJECTS",
    stats: [
      { value: "60+", label: "Projects", detail: "Delivered across India" },
      {
        value: "04",
        label: "Domains",
        detail: "Drainage · Groundwater · Irrigation · Structures",
      },
      { value: "08", label: "States", detail: "Active project coverage" },
      {
        value: "100%",
        label: "Compliant",
        detail: "IRC, IS, CWC & BIS standards",
      },
    ],
  };

  return <CommonHero {...heroData} />;
};

export default WorksHero;
