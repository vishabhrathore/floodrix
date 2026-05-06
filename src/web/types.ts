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
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  image: string;
  category: string;
  readTime: string;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio: string;
  image: string;
  edu: string;
  expertise: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}