"use client";

// Added React import to resolve the missing React namespace error
import React from 'react';

export interface ServiceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

export interface MetricProps {
  label: string;
  target: number;
  suffix?: string;
}

export interface Project {
  id: string;
  title: string;
  category: string;
  image: string;
  description: string;
  location: string;
  challenge?: string;
  solution?: string;
  impact?: string[];
  year?: string;
  client?: string;
  fullContent?: string; // Long-form case study narrative in markdown
  relatedBlogId?: string; // Link to a blog post in constants.tsx
  technicalData?: {
    label: string;
    value: string;
  }[];
}

export interface BlogReference {
  label: string;
  url?: string;
  source?: string; // e.g. "CGWB, 2024" or "PMC" — short source tag shown below the label
}

export interface BlogDomain {
  title: string; // Short title for the domain nav, e.g. "Storm Drainage"
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  reviewedBy?: string;        // Optional: shown as "Technical Review" in header
  date: string;
  image: string;
  category: string;
  readTime: string;
  regulatoryScope?: string;   // e.g. "CWC / IRC / BIS" — shown in meta + sidebar
  geographicScope?: string;   // e.g. "Indian Subcontinent"
  methodologies?: string[];   // e.g. ["SWMM", "HEC-RAS", "MODFLOW"] — shown as tags
  domains?: BlogDomain[];     // Multi-domain articles get a sticky domain nav
  references?: BlogReference[]; // Real citations, shown in sidebar
  reportUrl?: string;         // If a downloadable PDF exists, wire it here
}


export interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio: string;
  image: string;
  edu: string;
  expertise: string[];
  yearsOfExp: string;
  notableProject: string;
  publications: number;
  availability: 'Available' | 'On Project' | 'Consulting Only';
  region: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DomainSection {
  id: string;
  tag: string;
  title: string;
  titleEmphasis: string;
  intro: string;
  problem: {
    title: string;
    vulnerabilityHeading: string;
    description: string;
    points: string[];
    image: string;
    tags: string[];
  };
  solution: {
    title: string;
    description: string;
    services: { title: string; desc: string }[];
    image: string;
    outcomeLabel: string;
    outcomeValue: string;
    outcomeDesc: string;
  };
}