// src/features/registery/formula/components/formula-selector.tsx
"use client";

import * as React from "react";

import { BookOpen, Check, ChevronsUpDown, Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { useFormulas } from "../hooks/use-formulas";

interface FormulaSelectorProps {
  value?: string;
  onSelect: (formula: any) => void;
  className?: string;
}

export function FormulaSelector({
  value,
  onSelect,
  className,
}: FormulaSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data, isLoading } = useFormulas({
    search,
    pageSize: 20,
  });

  const selectedFormula = React.useMemo(
    () => data?.items.find((item) => item.id === value),
    [data, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-9 text-xs font-normal",
            className,
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            {selectedFormula ? (
              <span className="truncate">{selectedFormula.name}</span>
            ) : (
              <span className="text-slate-400">
                Select formula from registry...
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search formulas by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CommandList className="max-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                <CommandEmpty>No formulas found.</CommandEmpty>
                <CommandGroup>
                  {data?.items.map((formula) => (
                    <CommandItem
                      key={formula.id}
                      value={formula.id}
                      onSelect={() => {
                        onSelect(formula);
                        setOpen(false);
                      }}
                      className="flex flex-col items-start gap-1 py-2.5"
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-semibold">{formula.name}</span>
                        {value === formula.id && (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex w-full items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">
                          {formula.slug}
                        </span>
                        <Badge
                          variant="outline"
                          className="h-4 px-1 text-[9px]"
                        >
                          {formula.category}
                        </Badge>
                      </div>
                      {formula.description && (
                        <p className="line-clamp-1 text-[10px] text-slate-500">
                          {formula.description}
                        </p>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
