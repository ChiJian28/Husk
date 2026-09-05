"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import {
  type ShelfCategoryFilter,
  type ShelfCoverageFilter,
  type ShelfFilter,
  type ShelfImportanceFilter,
  type ShelfTimeWindow,
  shelfFilterIsDefault,
  shelfFilterLabel,
} from "@/lib/shelf-filter";
import { cn } from "@/lib/utils";
import { useUi } from "@/stores/ui";

type FilterOption<T extends string> = { id: T; label: string; shortLabel?: string };

const COVERAGE_OPTIONS: FilterOption<ShelfCoverageFilter>[] = [
  { id: "all", label: "All statuses", shortLabel: "All" },
  { id: "uncovered", label: "Uncovered", shortLabel: "Uncov." },
  { id: "pending", label: "Pending", shortLabel: "Pend." },
  { id: "covered", label: "Covered", shortLabel: "Cov." },
];

const TIME_OPTIONS: FilterOption<ShelfTimeWindow>[] = [
  { id: "all", label: "All upcoming", shortLabel: "All" },
  { id: "3d", label: "Within 3 days", shortLabel: "3 days" },
  { id: "5d", label: "Within 5 days", shortLabel: "5 days" },
  { id: "7d", label: "Within 7 days", shortLabel: "7 days" },
];

const IMPORTANCE_OPTIONS: FilterOption<ShelfImportanceFilter>[] = [
  { id: "all", label: "All importance", shortLabel: "All" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

const CATEGORY_OPTIONS: FilterOption<ShelfCategoryFilter>[] = [
  { id: "all", label: "All event types", shortLabel: "All" },
  { id: "macro", label: "Macro", shortLabel: "Macro" },
  { id: "fed", label: "Fed / FOMC", shortLabel: "Fed" },
  { id: "crypto", label: "Crypto events", shortLabel: "Crypto" },
  { id: "derivatives", label: "Derivatives expiry", shortLabel: "Deriv." },
  { id: "custom", label: "Custom windows", shortLabel: "Custom" },
];

export function ShelfFilterBar({ matchCount }: { matchCount: number }) {
  const filter = useUi((s) => s.shelfFilter);
  const setShelfFilter = useUi((s) => s.setShelfFilter);
  const resetShelfFilter = useUi((s) => s.resetShelfFilter);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const active = !shelfFilterIsDefault(filter);
  const label = shelfFilterLabel(filter);

  const patch = (next: Partial<ShelfFilter>) => setShelfFilter({ ...filter, ...next });

  return (
    <div className="relative z-20 mt-4 space-y-3 overflow-visible">
      <div className="grid grid-cols-4 gap-1 overflow-visible sm:gap-3">
        <FilterSelect
          filterKey="coverage"
          openKey={openKey}
          setOpenKey={setOpenKey}
          label="Status"
          value={filter.coverage}
          options={COVERAGE_OPTIONS}
          onChange={(value) => patch({ coverage: value })}
        />
        <FilterSelect
          filterKey="time"
          openKey={openKey}
          setOpenKey={setOpenKey}
          label="Time"
          labelDesktop="Time window"
          value={filter.timeWindow}
          options={TIME_OPTIONS}
          onChange={(value) => patch({ timeWindow: value })}
        />
        <FilterSelect
          filterKey="importance"
          openKey={openKey}
          setOpenKey={setOpenKey}
          label="Imp."
          labelDesktop="Importance"
          value={filter.importance}
          options={IMPORTANCE_OPTIONS}
          onChange={(value) => patch({ importance: value })}
        />
        <FilterSelect
          filterKey="category"
          openKey={openKey}
          setOpenKey={setOpenKey}
          label="Type"
          labelDesktop="Event type"
          value={filter.category}
          options={CATEGORY_OPTIONS}
          onChange={(value) => patch({ category: value })}
        />
      </div>
      {active ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-line bg-sunken/40 px-3 py-2">
          <p className="text-xs text-mute">
            Showing <span className="font-medium text-ink">{matchCount}</span>
            {matchCount === 1 ? " event" : " events"}
            {label ? <> · {label}</> : null}
          </p>
          <button
            type="button"
            onClick={resetShelfFilter}
            className="text-xs font-medium text-husk underline-offset-2 hover:underline"
          >
            Show all
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect<T extends string>({
  filterKey,
  openKey,
  setOpenKey,
  label,
  labelDesktop,
  value,
  options,
  onChange,
}: {
  filterKey: string;
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
  label: string;
  labelDesktop?: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const open = openKey === filterKey;
  const selected = options.find((opt) => opt.id === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenKey(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenKey(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpenKey]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <span className="mb-0.5 block truncate text-[9px] font-medium uppercase tracking-wide text-mute sm:mb-1.5 sm:text-[11px]">
        {labelDesktop ? (
          <>
            <span className="sm:hidden">{label}</span>
            <span className="hidden sm:inline">{labelDesktop}</span>
          </>
        ) : (
          label
        )}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpenKey(open ? null : filterKey)}
        className={cn(
          "flex h-8 w-full min-w-0 items-center justify-between gap-0.5 rounded-input border border-line bg-raised px-1.5 text-left text-[11px] text-ink sm:h-10 sm:gap-1 sm:px-3 sm:text-sm",
          "transition-[border-color,box-shadow] duration-200 ease-husk",
          open ? "border-husk ring-2 ring-husk/25" : "hover:border-husk/40",
        )}
      >
        <span className="truncate">
          <span className="sm:hidden">{selected?.shortLabel ?? selected?.label}</span>
          <span className="hidden sm:inline">{selected?.label}</span>
        </span>
        <CaretDown className={cn("size-3 shrink-0 text-mute transition-transform sm:size-4", open && "rotate-180")} />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+0.25rem)] z-50 overflow-hidden rounded-input border border-line bg-raised py-1 shadow-lift"
        >
          {options.map((opt) => {
            const active = opt.id === value;
            return (
              <li key={opt.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                    active ? "bg-husk-soft text-husk" : "text-ink hover:bg-sunken/60",
                  )}
                  onClick={() => {
                    onChange(opt.id);
                    setOpenKey(null);
                  }}
                >
                  <span>{opt.label}</span>
                  {active ? <Check className="size-4 shrink-0" weight="bold" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
