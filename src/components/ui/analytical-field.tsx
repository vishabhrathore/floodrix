"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface AnalyticalFieldProps extends React.ComponentProps<typeof Input> {
  label: string;
  notation: string;
  unit: string;
  hint?: string;
}

const AnalyticalField = React.forwardRef<HTMLInputElement, AnalyticalFieldProps>(
  ({ label, notation, unit, hint, className, ...props }, ref) => {
    return (
      <div className="space-y-4 group">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-brand-red italic select-none">
              {notation}
            </span>
            <Label className="text-[10px] font-black uppercase tracking-widest text-brand-dark cursor-pointer">
              {label}
            </Label>
          </div>
          {hint && (
            <span className="text-[9px] text-muted-foreground font-light select-none">
              {hint}
            </span>
          )}
        </div>
        
        <div className="relative flex items-center">
          <Input
            ref={ref}
            className={cn(
              "h-auto rounded-xl border border-border bg-muted/20 px-5 py-4 text-sm font-mono font-bold text-brand-dark placeholder-muted-foreground/30 outline-none transition-all focus:border-brand-red/50 focus:bg-white focus:ring-4 focus:ring-brand-red/5",
              className
            )}
            {...props}
          />
          <div className="absolute right-4 px-3 py-1 bg-white rounded border border-border shadow-sm group-focus-within:border-brand-red/20 select-none">
            <span className="text-[10px] font-black text-brand-dark/60 uppercase tracking-widest whitespace-nowrap">
              {unit}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

AnalyticalField.displayName = "AnalyticalField";

export { AnalyticalField };
