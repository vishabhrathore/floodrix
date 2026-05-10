"use client";

import React from 'react';
import { Droplets, ShieldCheck, Waves, Leaf, Microscope, Map, Recycle, Sprout } from 'lucide-react';
import { ServiceCardProps, Project, TeamMember, BlogPost, DomainSection } from './types';

export const COLORS = {
  red: '#fb3640',
  blue: '#247ba0',
  dark: '#191919',
  teal: '#0d9488',
  grey: '#6b7280'
};

export const SERVICES: ServiceCardProps[] = [
  {
    title: "Highway Drainage",
    description: "Delivery of safe and efficient drainage solutions specifically tailored for transportation networks. Bridge hydrology, hydraulic analysis, and scour protection.",
    icon: <Droplets className="w-8 h-8" />,
    category: "Highway Drainage"
  },
  {
    title: "Infrastructure & Flood Modelling",
    description: "Urban resilience and integrated stormwater systems via advanced digital simulations (1D/2D Pluvial and Fluvial Modelling).",
    icon: <Waves className="w-8 h-8" />,
    category: "Infrastructure"
  },
  {
    title: "Groundwater Services",
    description: "Scientific assessments and sustainable management of subsurface water resources using numerical simulation of aquifer behavior.",
    icon: <Map className="w-8 h-8" />,
    category: "Groundwater"
  },
  {
    title: "Technical Advisory & Dispute Resolution",
    description: "Expert witness services and technical audits for complex infrastructure litigation. We provide data-backed forensic engineering and independent peer reviews.",
    icon: <ShieldCheck className="w-8 h-8" />,
    category: "Advisory"
  }
];

export const PROJECTS: Project[] = [
  {
    id: "1",
    title: "Metropolitan Expressway",
    category: "Highway Drainage",
    location: "Mumbai, India",
    image: "https://picsum.photos/seed/mumbai/1200/800",
    description: "Complete hydrological study and hydraulic design for a major 8-lane expressway including culvert optimization.",
    challenge: "The expressway route passes through several low-lying urban areas prone to severe monsoon flooding, requiring a robust yet space-efficient drainage solution.",
    solution: "We implemented an integrated 2D hydraulic model to simulate 100-year storm events. The resulting design utilized high-capacity box culverts with optimized inlet structures and a series of interconnected attenuation ponds to manage peak discharge.",
    impact: ["Reduced flood risk for 500,000 residents", "15% cost savings through culvert optimization", "Zero traffic disruptions during record rainfall in 2023"],
    year: "2022",
    client: "National Highways Authority"
  },
  {
    id: "2",
    title: "Smart City Flood Twin",
    category: "Infrastructure",
    location: "Singapore",
    image: "https://picsum.photos/seed/sing/1200/800",
    description: "Deep integrated 2D modelling for urban flood resilience and attenuation structure design.",
    challenge: "Singapore's dense urban landscape and tropical climate demand precision in flood prediction. The challenge was to integrate real-time sensor data with predictive models.",
    solution: "Developed a digital twin of the city's drainage network using MIKE+ software. The system predicts potential flood hotspots 6 hours in advance, allowing for proactive gate operations.",
    impact: ["Real-time monitoring across 2,000 sensors", "30% faster emergency response", "Optimized pump station power consumption"],
    year: "2023",
    client: "Public Utilities Board"
  },
  {
    id: "3",
    title: "Deep Mine Dewatering",
    category: "Groundwater",
    location: "Rajasthan, India",
    image: "https://picsum.photos/seed/mine/1200/800",
    description: "Numerical aquifer modelling to optimize dewatering patterns and minimize environmental impact.",
    challenge: "Excessive groundwater entering the mine pits at 400m depth threatened operations and local community water wells.",
    solution: "Constructed a regional 3D numerical groundwater flow model (MODFLOW). We designed a perimeter dewatering system that targets pressure relief in the deep aquifer while minimizing drawdown in the shallow village wells.",
    impact: ["Stabilized mine production by 40%", "Protected 12 community drinking water sources", "Recovered 2 million liters of water/day for process use"],
    year: "2021",
    client: "Global Resource Corp"
  }
];

export const BLOGS: BlogPost[] = [
  {
    id: "1",
    title: "The Future of Urban Flood Resilience",
    excerpt: "How digital twins and real-time modeling are reshaping how we protect cities from extreme weather events.",
    content: "## Introduction\nAs climate change intensifies, cities are facing unprecedented flooding risks. Traditional static drainage designs are no longer enough. We need dynamic, intelligent systems that can adapt to real-time conditions.\n\n## The Role of Digital Twins\nA digital twin is more than just a 3D model. It's a living representation of our infrastructure, connected to sensors that measure water levels, flow rates, and rainfall in real-time. By running thousands of simulations per second, these twins can predict flood paths before they happen.\n\n## Conclusion\nThe transition to 'Smart Water' infrastructure is not just a technological upgrade—it's a necessity for urban survival in the 21st century.",
    author: "Dr. Sarah Mitchell",
    date: "March 15, 2024",
    image: "https://picsum.photos/seed/flood/1200/800",
    category: "Innovation",
    readTime: "5 min read"
  },
  {
    id: "2",
    title: "Groundwater: The Invisible Crisis",
    excerpt: "Exploring the critical state of global aquifers and the engineering strategies needed for sustainable extraction.",
    content: "## The Hidden Resource\nGroundwater provides half of the world's drinking water, yet it remains largely invisible and poorly managed. We are extracting water from aquifers faster than it can be replenished.\n\n## Engineering Solutions\nManaged Aquifer Recharge (MAR) and sophisticated numerical modeling are our best tools. By understanding the deep geology of our basins, we can create 'recharge highways' to put water back into the ground during wet seasons.\n\n## The Path Forward\nSustainability requires a balance between extraction and replenishment. We must move from reactive management to predictive governance.",
    author: "Prof. Kenneth Wu",
    date: "April 2, 2024",
    image: "https://picsum.photos/seed/water/1200/800",
    category: "Sustainability",
    readTime: "8 min read"
  }
];

export const TEAM: TeamMember[] = [
  {
    id: 1,
    name: "Dr. Sarah Mitchell",
    role: "Chief Hydrologist",
    bio: "Former Director of Climate Resilience at NOAA. 20+ years in basin modeling and automated flood prediction logic.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop",
    edu: "PhD, Civil Engineering - Stanford",
    expertise: ["Basin Modeling", "Urban Resilience"]
  },
  {
    id: 2,
    name: "Marcus Thorne",
    role: "Principal Structural Engineer",
    bio: "Lead engineer for the trans-continental irrigation networks across East Africa. Specialist in rapid-discharge infrastructure.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=800&auto=format&fit=crop",
    edu: "MSc, Hydraulic Structures - ETH Zurich",
    expertise: ["Kinetic Dissipation", "Concrete Analytics"]
  },
  {
    id: 3,
    name: "Elena Rodriguez",
    role: "Director of Satellite Analytics",
    bio: "Pioneer in using synthetic-aperture radar for real-time groundwater monitoring and seepage detection.",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=800&auto=format&fit=crop",
    edu: "MSc, Remote Sensing - MIT",
    expertise: ["GIS Systems", "Radar Hydrology"]
  },
  {
    id: 4,
    name: "Prof. Kenneth Wu",
    role: "Senior Scientific Advisor",
    bio: "Author of 'The Future of Liquid Infrastructure'. Emeritus professor specializing in predictive hydro-informatics.",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop",
    edu: "PhD, Hydrology - Oxford",
    expertise: ["Predictive Informatics", "Policy"]
  }
];


export const domains: DomainSection[] = [
  {
    id: "storm-drainage",
    tag: "Domain 01 of 04",
    title: "Storm Drainage &",
    titleEmphasis: "Flood Management",
    intro:
      "Every monsoon season exposes the same truth: most Indian highway and urban drainage networks were not designed for the rainfall intensities they are now receiving. What was once a 50-year storm now arrives every few years — and the infrastructure sized to the old assumptions fails visibly and expensively.",
    problem: {
      title: "Drainage is routinely postponed until it becomes the most expensive line item on the project.",
      vulnerabilityHeading: "When drainage fails, the pavement above it is already lost — the damage just hasn't surfaced yet.",
      description:
        "MoRTH audits have identified inadequate drainage as a primary cause of premature pavement failure on national highway corridors. Research confirms that once surface water infiltrates sub-base layers, subgrade shear strength can drop by over 50% as moisture content approaches saturation — at which point no amount of surface repair prevents structural collapse from below.",
      points: [
        "Culverts sized on outdated IDF data consistently fail during peak monsoon discharge, washing out road embankments and triggering network closures that cost multiples of what proper hydraulic design would have required",
        "Highway pavement deterioration accelerates sharply once surface water reaches sub-base layers; rutting begins in heavily loaded lanes, channels water into the failure zones, and deepens the collapse — exactly the cycle CRRI documents in premature NH failures"
      ],
      image: "/b_highway.jpeg",
      tags: ["National Highways", "Expressway Corridors", "Urban Townships", "Industrial Parks", "Bridge Crossings", "SEZ Developments"]
    },
    solution: {
      title: "Drainage sized for the storms that will actually occur — not the ones that used to.",
      description:
        "We design integrated stormwater systems from first principles — combining site-specific hydrological analysis, HEC-RAS hydraulic modelling, and IRC/IS-compliant structural design. Every system is analytically validated before drawings are issued for construction.",
      services: [
        { title: "Hydrological Analysis & Design Flood Estimation", desc: "Catchment delineation, rational method and unit hydrograph analysis, design storm estimation at 10, 25, 50, and 100-year return periods per IRC:SP:42 and IS:5542." },
        { title: "Highway Drainage Network Design", desc: "Roadside ditches, median drains, subsurface pipe networks, kerb and gutter systems, inlet spacing design, and outfall structures for NH, SH, and expressway classifications." },
        { title: "Culvert & Cross-Drainage Hydraulics", desc: "Box, pipe, and arch culvert sizing using HEC-RAS and HY-8; backwater and afflux analysis; scour depth estimation per IRC:89; riprap and gabion protection design at all outfalls." },
        { title: "Urban Stormwater Master Planning", desc: "SWMM-based network modelling for new townships and industrial parks; attenuation pond and detention basin sizing; sustainable drainage (SuDS) integration for planning compliance." },
        { title: "Scour Assessment & Energy Dissipation", desc: "Bridge pier and abutment scour vulnerability assessment; stilling basin, riprap apron, and trajectory bucket energy dissipator design at outfall and drop structures." }
      ],
      image: "/g_highway.jpeg",
      outcomeLabel: "Design Standard",
      outcomeValue: "IRC / IS",
      outcomeDesc: "All highway drainage deliverables conform to MoRTH, IRC, and IS specifications"
    }
  },

  {
    id: "groundwater",
    tag: "Domain 02 of 04",
    title: "Groundwater &",
    titleEmphasis: "Hydrogeology",
    intro:
      "India is the world's largest user of groundwater — and one of its least efficient managers. The Central Ground Water Board reports 17% of assessment blocks are already over-exploited. In Punjab alone, 78% of wells are classified over-exploited, and the water table in affected north-western districts is projected to drop below 300 metres by 2039. For developers, industrialists, and planners, the question is no longer whether groundwater risk exists — it is whether it has been quantified.",
    problem: {
      title: "A generation ago borewells were 100 feet deep. Today they go 800 feet and still fail.",
      vulnerabilityHeading: "India's aquifers are being spent faster than monsoons can replenish them — and most projects never measure the deficit they create.",
      description:
        "Groundwater problems accumulate in silence. Construction dewatering proceeds without aquifer impact assessment. Industrial operations discharge without contamination monitoring. Agricultural schemes extract beyond sustainable yield with no recharge accounting. By the time consequences appear — failed borewells, settlement in adjacent structures, contaminated supply zones — remediation costs are an order of magnitude higher than prevention.",
      points: [
        "Construction dewatering for deep foundations, metro corridors, and tunnel drives regularly proceeds without hydrogeological assessment, creating unquantified drawdown in adjacent aquifers and triggering differential settlement in nearby structures — liability that falls on the project developer",
        "CGWB data shows 839 of 5,723 assessment blocks are over-exploited nationally; GRACE satellite gravimetry identifies the Gangetic Basin as exhibiting some of the highest aquifer depletion rates recorded globally, with marked seasonal fluctuations worsening each decade",
        "Industrial and mining contamination plumes migrate through permeable geology for years before surfacing at public supply borewells; at that point the remediation liability and regulatory consequence are both severe and expensive to dispute",
        "Rapid urbanisation in Delhi, Mumbai, and second-tier cities has converted natural recharge zones to impermeable surfaces, disrupting the monsoon recharge mechanisms that replenish aquifer storage — a compounding deficit no additional extraction infrastructure can overcome"
      ],
      image: "/b_groundwater.jpeg",
      tags: ["Large Construction", "Mining Operations", "Agricultural Planning", "Industrial Facilities", "Water Authorities", "EIA Submissions"]
    },
    solution: {
      title: "Aquifer behaviour characterised with precision — not approximated with assumptions.",
      description:
        "We integrate field hydrogeological investigation with numerical groundwater modelling to give clients a defensible, quantitative understanding of subsurface conditions. Our work supports engineering decisions, regulatory submissions, and long-term resource management equally.",
      services: [
        { title: "Hydrogeological Site Investigation", desc: "Borehole siting, lithological and geophysical logging, aquifer test design — slug tests, step-drawdown, and long-duration pumping tests interpreted using Theis, Cooper-Jacob, and Neuman methods." },
        { title: "Numerical Groundwater Modelling", desc: "Steady-state and transient flow modelling using MODFLOW and FEFLOW; predictive simulations for dewatering drawdown, aquifer recovery, and long-term water table response across extraction and recharge scenarios." },
        { title: "Aquifer Mapping & Vulnerability Assessment", desc: "Hydrogeological mapping, recharge zone delineation, aquifer boundary characterisation, and DRASTIC vulnerability indexing for planning submissions, EIA chapters, and CGWB licensing applications." },
        { title: "Construction Dewatering Design", desc: "Dewatering system design for deep excavations, mine pits, and tunnel drives; quantified drawdown impact on adjacent structures and public supply sources; compliance monitoring programme design." },
        { title: "Water Balance & Availability Studies", desc: "Basin-scale water balance modelling, sustainable yield estimation, and groundwater availability reports for irrigation licensing, urban supply master planning, and CGWB regulatory submissions." }
      ],
      image: "/g_groundwater.jpeg",
      outcomeLabel: "Regulatory Record",
      outcomeValue: "100%",
      outcomeDesc: "Every groundwater regulatory submission approved on first review"
    }
  },

  {
    id: "irrigation",
    tag: "Domain 03 of 04",
    title: "Irrigation Water",
    titleEmphasis: "Management",
    intro:
      "India irrigates more land than any country on earth — yet FAO data shows 45% of water diverted from headworks to farms is lost before it reaches a crop. In an era of depleting aquifers, erratic monsoons, and rising energy costs for pumping, irrigation inefficiency is no longer an engineering footnote. It is a food security and financial risk.",
    problem: {
      title: "Nearly half of every litre diverted for irrigation in India is lost before it reaches the field.",
      vulnerabilityHeading: "The farmer at the tail end of the canal is not a victim of drought — he is a victim of engineering that was never done properly.",
      description:
        "The dominant cause of irrigation water loss is not drought or rainfall failure — it is engineering. FAO Aquastat records show 45% of water in India's agricultural conveyance systems is consumed by seepage and evaporation losses between headworks and farm. Studies on earthen canals in Gujarat and Maharashtra have measured seepage rates of up to 45% of channel flow. The farmers paying the price are those at the tail end of distribution systems.",
      points: [
        "FAO Aquastat data for India records 45% of water diverted for agriculture is lost to conveyance losses — meaning irrigation schemes must be built at roughly double the capacity that a well-designed system would require to deliver the same agricultural output",
        "Unlined earthen field channels lose 35–45% of their flow to seepage; where waterlogging combines with poor drainage, the Indira Gandhi Canal command in Rajasthan documents the result — progressive soil salinity rendering formerly productive land uncultivable",
        "Pressurised irrigation systems installed without hydraulic design routinely operate outside manufacturer pressure tolerances, producing uneven application uniformity, premature emitter failure, and yield variability that farmers misattribute to seed or soil",
        "Calendar-based irrigation scheduling applies water to administrative convenience rather than crop demand, simultaneously over-irrigating in cool months and withholding supply during critical peak evapo-transpiration periods"
      ],
      image: "/b_irrigation.jpeg",
      tags: ["Command Area Development", "State Irrigation Depts", "Micro-Irrigation Schemes", "Agri-Infrastructure", "Rural Development Projects"]
    },
    solution: {
      title: "Irrigation infrastructure engineered to deliver every litre to where the crop needs it.",
      description:
        "We design irrigation systems from command area planning through to pressurised network hydraulics — ensuring equitable distribution across the full command, correct operating pressures at every emission point, and water application schedules calibrated to actual crop demand rather than administrative routine.",
      services: [
        { title: "Command Area Planning & Water Allocation", desc: "Gross and net command area delineation, crop water demand estimation using FAO Penman-Monteith, seasonal water balance analysis, and rotational supply scheduling for equitable distribution." },
        { title: "Pressurised Irrigation Network Design", desc: "Full hydraulic design of drip and sprinkler distribution networks — pipe sizing, pressure zone management, booster station specification, manifold layout, and emission uniformity verification per BIS standards." },
        { title: "Canal & Field Channel Design", desc: "Lined and unlined canal design, canal falls and cross-regulators, field channel layout and lining, on-farm water management structures — conforming to CWC and state irrigation department requirements." },
        { title: "Demand-Based Irrigation Scheduling", desc: "Scheduling models integrating evapo-transpiration data, soil moisture, and crop growth stage — eliminating both over-application and deficit stress while reducing total applied water volume." },
        { title: "Micro-Irrigation Audits & Rehabilitation", desc: "Field performance evaluation of existing drip and sprinkler installations — emission uniformity testing, pressure mapping, emitter clogging assessment, and costed rehabilitation reporting." }
      ],
      image: "/g_irrigation.jpeg",
      outcomeLabel: "Potential Water Saving",
      outcomeValue: "Up to 45%",
      outcomeDesc: "Reduction in applied irrigation water through demand-based network design"
    }
  },

  {
    id: "hydraulic-structures",
    tag: "Domain 04 of 04",
    title: "Hydraulic Structures",
    titleEmphasis: "Engineering",
    intro:
      "Hydraulic structures are the points where engineering meets consequence. Research on Indian dam failures attributes 23% of structural failures directly to inadequate spillway capacity. Scour beneath weirs and barrage floors remains the leading mechanism of foundation failure in water infrastructure. The Machchhu dam collapse in 1979 — where actual peak inflow reached three times the spillway design capacity — is not an isolated historical event. It is the reference case for what happens when hydraulic design is based on underestimated hydrological inputs.",
    problem: {
      title: "Most hydraulic structure failures are not acts of nature — they are design events the structure was never equipped to survive.",
      vulnerabilityHeading: "A structure that performs within its design envelope offers no safety margin for the flood that exceeds it — and in India, that flood will come.",
      description:
        "Recent failures at Karam dam in Madhya Pradesh (2022) and the Pulichintala Irrigation Project on the Krishna River in Andhra Pradesh (2021) follow a consistent pattern: ageing structures operating beyond their original design envelope, without hydraulic revalidation against current hydrological conditions or climate-adjusted design floods.",
      points: [
        "Research on Indian dam failures identifies inadequate spillway capacity as responsible for 23% of structural failures — exceeded only by foundation deficiency, which is itself often initiated by uncontrolled seepage uplift beneath weir and barrage floors under high-head conditions",
        "Check dams and weirs constructed without scour analysis are progressively undermined at their foundations during high-velocity monsoon flows; repeated emergency repair on the same structures is the direct consequence of absent scour protection in the original design",
        "Canal falls and drop structures without properly proportioned energy dissipators generate high-velocity tailwater that erodes downstream channel beds and embankments, causing secondary failures across the distribution network more expensive to repair than the primary structure",
        "River training works placed without 1D/2D hydraulic modelling constrict natural flow sections, raise upstream flood levels on agricultural and residential land, and accelerate bank erosion at adjacent reaches — generating liability for the implementing authority"
      ],
      image: "/b_hydraulic.jpeg",
      tags: ["Irrigation Authorities", "State Water Boards", "River Basin Organisations", "Highway Infrastructure", "Industrial Water Supply"]
    },
    solution: {
      title: "Every structure validated through the full range of flows — from routine operations to design flood.",
      description:
        "We apply rigorous hydraulic analysis at every stage of structural design. PMF estimation, scour depth calculation, energy dissipator proportioning, and HEC-RAS model validation are standard deliverables — not optional additions. No structure leaves our office without a demonstrated hydraulic performance envelope.",
      services: [
        { title: "Spillway & Weir Hydraulic Design", desc: "Ogee, broad-crested, and sharp-crested weir design; gated and ungated spillway hydraulics; PMF estimation per CWC guidelines; afflux and backwater analysis; cavitation risk assessment for high-head structures." },
        { title: "Canal Falls & Drop Structure Design", desc: "Sarda fall, glacis fall, and straight glacis design; USBR Type I–IV stilling basin selection and proportioning; trajectory and roller bucket energy dissipators; cistern and cutoff wall design for all head conditions." },
        { title: "Check Dams & River Training Works", desc: "Gabion, masonry, and RCC check dam hydraulic design; scour depth analysis and upstream/downstream protection; guide bund, spur, and revetment design per IS:10751 for channel stabilisation and flood control." },
        { title: "Cross-Drainage & Aqueduct Structures", desc: "Hydraulic and structural design of aqueducts, super-passages, level crossings, and siphons at canal–drain and canal–river intersections; head loss estimation and afflux analysis for all crossing configurations." },
        { title: "HEC-RAS Modelling & Design Validation", desc: "1D steady and unsteady flow modelling for design validation and regulatory submission; backwater curve analysis; bridge and barrage afflux studies; flood inundation mapping in support of detailed design." }
      ],
      image: "/g_hydraulic.jpeg",
      outcomeLabel: "Design Assurance",
      outcomeValue: "CWC / BIS",
      outcomeDesc: "All hydraulic structures independently reviewed against CWC manuals and BIS codes before issue"
    }
  }
];