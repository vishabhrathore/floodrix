"use client";

import React from 'react';
import { Droplets, ShieldCheck, Waves, Leaf, Microscope, Map, Recycle, Sprout } from 'lucide-react';
import { ServiceCardProps, Project, TeamMember, BlogPost } from './types';

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