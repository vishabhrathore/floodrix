"use client";

import * as React from "react";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

export interface DataGridColumn<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
  headerClassName?: string;
}

interface DataGridProps<T> {
  data: T[];
  columns: DataGridColumn<T>[];
  isLoading?: boolean;
  isTransitioning?: boolean;
  skeletonRows?: number;
  emptyView?: React.ReactNode;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
  className?: string;
  rowClassName?: string;
  getKey?: (item: T, index: number) => string | number;
}

export function DataGrid<T>({
  data,
  columns,
  isLoading = false,
  isTransitioning = false,
  skeletonRows = 5,
  emptyView,
  sortBy,
  sortOrder,
  onSort,
  className,
  rowClassName,
  getKey,
}: DataGridProps<T>) {
  const handleSortClick = (column: DataGridColumn<T>) => {
    if (!column.sortable || !onSort) return;

    let nextOrder: "asc" | "desc" = "asc";
    if (sortBy === column.key) {
      nextOrder = sortOrder === "asc" ? "desc" : "asc";
    }

    onSort(column.key, nextOrder);
  };

  return (
    <div
      className={cn(
        "relative rounded-lg border border-[#e8e8e8] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)] w-full",
        className,
      )}
    >
      {/* Self-contained style tag for high-performance linear progress animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes datagrid-progress {
          0% { left: -40%; width: 30%; }
          50% { left: 40%; width: 40%; }
          100% { left: 100%; width: 30%; }
        }
        .datagrid-progress-bar {
          position: absolute;
          height: 100%;
          background-color: #0a0a0a;
          animation: datagrid-progress 1.2s infinite ease-in-out;
        }
      `,
        }}
      />

      {/* Linear Progress Bar */}
      {isTransitioning && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#f5f5f5] overflow-hidden z-30">
          <div className="datagrid-progress-bar" />
        </div>
      )}

      {/* Interaction Overlay Shield */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-white/40 z-20 backdrop-blur-[0.5px] cursor-not-allowed pointer-events-auto transition-opacity duration-200" />
      )}

      <Table>
        <TableHeader>
          <TableRow className="bg-[#fafafa]">
            {columns.map((column) => {
              const isSorted = sortBy === column.key;
              const canSort = column.sortable && !!onSort;

              return (
                <TableHead
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    "font-semibold text-[#a1a1a1] text-[11px] tracking-[0.04em] uppercase py-3.5 px-6 border-b border-[#e8e8e8] select-none",
                    canSort &&
                      "cursor-pointer hover:bg-[#f5f5f5]/80 hover:text-[#0a0a0a] transition-colors",
                    column.headerClassName,
                  )}
                  onClick={() => canSort && handleSortClick(column)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{column.header}</span>
                    {canSort && (
                      <span className="text-[#a1a1a1] group-hover:text-current shrink-0">
                        {isSorted ? (
                          sortOrder === "asc" ? (
                            <ArrowUpIcon className="size-3 text-[#0a0a0a]" />
                          ) : (
                            <ArrowDownIcon className="size-3 text-[#0a0a0a]" />
                          )
                        ) : (
                          <ArrowUpDownIcon className="size-3 opacity-40 group-hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // pulse skeleton placeholder rows to prevent layout shifting
            Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <TableRow
                key={`skeleton-${rowIndex}`}
                className="hover:bg-transparent"
              >
                {columns.map((column) => (
                  <TableCell
                    key={`skeleton-${rowIndex}-${column.key}`}
                    className="px-6 py-4 border-b border-[#e8e8e8]"
                  >
                    <div className="h-4 w-4/5 rounded bg-slate-100 animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-48 text-center px-6 py-4 border-b-0 hover:bg-transparent"
              >
                {emptyView || (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-8">
                    <span className="text-sm font-medium text-[#0a0a0a]">
                      No records found
                    </span>
                    <span className="text-xs text-[#a1a1a1]">
                      Try adjusting your search query or filters.
                    </span>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, itemIndex) => {
              const rowKey = getKey ? getKey(item, itemIndex) : itemIndex;
              return (
                <TableRow
                  key={rowKey}
                  className={cn(
                    "transition-colors hover:bg-[#fafafa]/50 group",
                    rowClassName,
                  )}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={`${rowKey}-${column.key}`}
                      className={cn(
                        "px-6 py-4 text-[#0a0a0a] text-[13px] border-b border-[#e8e8e8]",
                        column.className,
                      )}
                    >
                      {column.render
                        ? column.render(item, itemIndex)
                        : (item as any)[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
