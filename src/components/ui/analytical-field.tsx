"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AnalyticalFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  notation: string;
  unit: string;
  hint?: string;
}

const AnalyticalField = React.forwardRef<
  HTMLInputElement,
  AnalyticalFieldProps
>(({ label, notation, unit, hint, className, ...props }, ref) => {
  return (
    <div className="space-y-2.5 group">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="font-bold text-[11px] text-[#0070f3] uppercase tracking-wider">
            {notation}
          </span>
          <Label className="text-[11px] font-bold uppercase tracking-wider text-[#0070f3] cursor-pointer">
            {label}
          </Label>
        </div>
        {hint && (
          <span className="text-[10px] text-[#a1a1a1] font-medium px-0.5 select-none">
            {hint}
          </span>
        )}
      </div>

      <div className="flex h-[44px] overflow-hidden rounded-xl border border-[#e8e8e8] bg-white transition-all focus-within:border-[#d4d4d4] focus-within:shadow-[0_4px_12px_rgb(0,0,0,0.03)]">
        <input
          ref={ref}
          className={cn(
            "flex-1 bg-transparent px-4 py-2 text-[15px] font-mono font-medium text-[#0a0a0a] placeholder-[#d4d4d4] outline-none",
            className,
          )}
          {...props}
        />
        <div className="flex items-center justify-center border-l border-[#e8e8e8] bg-[#fafafa] px-4 min-w-[64px] select-none">
          <span className="text-[11px] font-bold text-[#a1a1a1] uppercase tracking-widest whitespace-nowrap">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
});

AnalyticalField.displayName = "AnalyticalField";

export { AnalyticalField };
