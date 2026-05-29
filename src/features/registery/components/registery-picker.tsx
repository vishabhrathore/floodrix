"use client";

import { useEffect, useRef, useState } from "react";

// import { useTRPC } from "@/lib/trpc-client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  FunctionSquare,
  Globe,
  Loader2,
  Lock,
  Search,
  Star,
  Table2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

// ── Types ─────────────────────────────────────────────────────────────────
export interface RegistryItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string | null;
  sourceStandard?: string | null;
  reference?: string | null;
  region?: string | null;
  isSystem: boolean;
  isPublished: boolean;
  visibility: string;
  // Formula-specific
  expressionNotation?: string;
  displayExpression?: string;
  inputVariables?: { notation: string; displayLabel: string; unit?: string }[];
  outputVariable?: { notation: string; displayLabel: string; unit?: string };
  // Table-specific
  tableType?: string;
  data?: unknown[];
  columns?: { key: string; label: string }[];
}

export type RegistryType = "formula" | "table";

interface RegistryPickerProps {
  type: RegistryType;
  value?: string | null;
  onChange: (id: string | null, item: RegistryItem | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

// ── Preview card ──────────────────────────────────────────────────────────
function ItemPreview({
  item,
  type,
}: {
  item: RegistryItem;
  type: RegistryType;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">{item.name}</p>
          {item.sourceStandard && (
            <p className="text-[10px] text-muted-foreground">
              {item.sourceStandard}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {item.isSystem && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              <Star className="mr-0.5 h-2 w-2" />
              IRC
            </Badge>
          )}
          {item.visibility === "PUBLIC" ? (
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {type === "formula" && item.displayExpression && (
        <div className="rounded border border-emerald-200/60 bg-emerald-50/50 px-2 py-1.5">
          <code className="font-mono text-xs text-emerald-800">
            {item.displayExpression}
          </code>
        </div>
      )}

      {type === "formula" &&
        item.inputVariables &&
        item.inputVariables.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.inputVariables.map((v) => (
              <span
                key={v.notation}
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {v.notation}
              </span>
            ))}
            {item.outputVariable && (
              <>
                <span className="text-[10px] text-muted-foreground">→</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
                  {item.outputVariable.notation}
                </span>
              </>
            )}
          </div>
        )}

      {type === "table" && item.tableType && (
        <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
          {item.tableType.replace(/_/g, " ")}
          {item.data &&
            Array.isArray(item.data) &&
            ` · ${item.data.length} rows`}
        </Badge>
      )}

      {item.reference && (
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <BookOpen className="h-2.5 w-2.5" />
          {item.reference}
        </p>
      )}
    </div>
  );
}

// ── List item ─────────────────────────────────────────────────────────────
function ListItem({
  item,
  type,
  selected,
  onSelect,
}: {
  item: RegistryItem;
  type: RegistryType;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-md p-2.5 text-left transition-colors",
        selected ? "bg-primary/10 text-primary" : "hover:bg-muted/60",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded",
          type === "formula"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-blue-100 text-blue-700",
        )}
      >
        {type === "formula" ? (
          <FunctionSquare className="h-3 w-3" />
        ) : (
          <Table2 className="h-3 w-3" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "truncate text-xs font-medium",
              selected && "text-primary",
            )}
          >
            {item.name}
          </p>
          {item.isSystem && (
            <Star className="h-2.5 w-2.5 shrink-0 text-amber-500" />
          )}
          {!item.isPublished && (
            <Badge
              variant="outline"
              className="h-3.5 px-1 text-[9px] border-amber-300 text-amber-600"
            >
              Draft
            </Badge>
          )}
        </div>
        <p className="truncate text-[10px] text-muted-foreground">
          {type === "formula"
            ? item.displayExpression || item.expressionNotation
            : item.category}
        </p>
      </div>
      {selected && (
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function RegistryPicker({
  type,
  value,
  onChange,
  placeholder,
  disabled = false,
}: RegistryPickerProps) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoveredItem, setHoveredItem] = useState<RegistryItem | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const queryFn =
    type === "formula"
      ? (trpc.formulas.getMany as any).queryOptions
      : (trpc.tables.getMany as any).queryOptions;

  const { data, isLoading } = useQuery(
    (queryFn as any)(
      { search: search || undefined, limit: 30 },
      { enabled: open },
    ),
  );

  const { data: selectedData } = useQuery(
    type === "formula"
      ? (trpc.formulas.getOne as any).queryOptions(
          { id: value! },
          { enabled: !!value },
        )
      : (trpc.tables.getOne as any).queryOptions(
          { id: value! },
          { enabled: !!value },
        ),
  );

  const items: RegistryItem[] = (data as any)?.items ?? [];
  const selectedItem = selectedData as any as RegistryItem | undefined;

  // Group by category
  const grouped = items.reduce<Record<string, RegistryItem[]>>((acc, item) => {
    const cat = item.category || "Uncategorised";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
      setHoveredItem(null);
    }
  }, [open]);

  const handleSelect = (item: RegistryItem) => {
    onChange(item.id, item);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
  };

  const Icon = type === "formula" ? FunctionSquare : Table2;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm",
              "transition-colors hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              open && "ring-2 ring-ring ring-offset-2",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selectedItem ? (
              <span className="flex-1 truncate font-medium">
                {selectedItem.name}
              </span>
            ) : (
              <span className="flex-1 text-muted-foreground">
                {placeholder ?? `Select a ${type}…`}
              </span>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {value && !disabled && (
                <span
                  role="button"
                  onClick={handleClear}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[560px] p-0"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <div className="flex h-[400px]">
            {/* List panel */}
            <div className="flex w-[260px] shrink-0 flex-col border-r border-border/60">
              {/* Search */}
              <div className="border-b border-border/40 p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${type}s…`}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-xs text-muted-foreground">
                    <AlertCircle className="mb-2 h-4 w-4" />
                    No {type}s found
                  </div>
                ) : (
                  Object.entries(grouped).map(([cat, catItems]) => (
                    <div key={cat}>
                      <p className="mb-1 mt-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                        {cat}
                      </p>
                      {catItems.map((item) => (
                        <ListItem
                          key={item.id}
                          item={item}
                          type={type}
                          selected={item.id === value}
                          onSelect={() => handleSelect(item)}
                        />
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Preview panel */}
            <div className="flex flex-1 flex-col p-4">
              {hoveredItem || selectedItem ? (
                <>
                  <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Preview
                  </p>
                  <ItemPreview
                    item={(hoveredItem ?? selectedItem)!}
                    type={type}
                  />
                  <div className="mt-auto">
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      onClick={() =>
                        handleSelect((hoveredItem ?? selectedItem)!)
                      }
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Select {(hoveredItem ?? selectedItem)?.name}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-xs text-muted-foreground">
                  <Icon className="mb-2 h-8 w-8 opacity-30" />
                  <p>Hover over a {type}</p>
                  <p className="mt-0.5 opacity-60">to preview details</p>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>



      {/* Selected item quick preview */}
      {value && selectedItem && !open && (
        <div className="rounded-md border border-border/40 bg-muted/10 px-3 py-2">
          {type === "formula" && selectedItem.displayExpression && (
            <code className="font-mono text-xs text-emerald-700">
              {selectedItem.displayExpression}
            </code>
          )}
          {type === "table" && (
            <p className="text-xs text-muted-foreground">
              {selectedItem.tableType?.replace(/_/g, " ")} ·{" "}
              {Array.isArray(selectedItem.data)
                ? `${(selectedItem.data as unknown[]).length} rows`
                : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
