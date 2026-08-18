import type { ReactNode } from "react";
import { DataCard } from "./backend-ui";
import { cn } from "@/lib/utils";

export type Column<T> = {
  /** Column header label. */
  header: string;
  /** Grid track for this column, e.g. "2fr" or "auto". Defaults to 1fr. */
  width?: string;
  align?: "left" | "right";
  cell: (row: T) => ReactNode;
};

/**
 * Header and body share one grid template, so columns line up exactly.
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  onRowClick,
  empty = "Nothing to show yet.",
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  empty?: string;
  className?: string;
}) {
  const template = columns.map((c) => c.width ?? "1fr").join(" ");

  return (
    <DataCard className={cn("overflow-x-auto", className)}>
      <div className="min-w-[44rem]">
        <div
          className="grid gap-3 border-b border-border px-4 py-2 text-sm font-medium text-muted-foreground"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((c) => (
            <span key={c.header} className={c.align === "right" ? "text-right" : undefined}>
              {c.header}
            </span>
          ))}
        </div>

        {rows.map((row, index) => {
          const cells = columns.map((c, i) => (
            <span
              key={i}
              className={cn("min-w-0 truncate", c.align === "right" && "text-right")}
            >
              {c.cell(row)}
            </span>
          ));
          const cls = cn(
            "grid w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0",
            onRowClick && "hover:bg-muted",
          );
          return onRowClick ? (
            <button
              key={getKey(row, index)}
              type="button"
              onClick={() => onRowClick(row)}
              className={cls}
              style={{ gridTemplateColumns: template }}
            >
              {cells}
            </button>
          ) : (
            <div
              key={getKey(row, index)}
              className={cls}
              style={{ gridTemplateColumns: template }}
            >
              {cells}
            </div>
          );
        })}

        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </DataCard>
  );
}
