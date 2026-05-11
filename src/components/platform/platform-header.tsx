"use client";

import React, { useState } from 'react';
import {
  Search,
  Bell,
  User,
  ChevronDown,
  Terminal,
  SearchIcon,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function PlatformHeader() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="flex flex-1 items-center gap-8">
        <div className="flex h-10 items-center">
          <button 
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-muted-foreground transition-all hover:border-brand-red hover:text-brand-red shadow-sm"
          >
            <Search size={20} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-muted-foreground transition-all hover:border-brand-red hover:text-brand-red shadow-sm">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}

function SearchItem({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-red/5 text-brand-red">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-bold text-brand-dark uppercase tracking-tight">{title}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{description}</span>
      </div>
    </div>
  );
}
