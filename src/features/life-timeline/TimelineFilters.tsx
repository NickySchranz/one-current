import { useEffect, useRef, useState } from "react";
import { matchesStatusFilter, useAppStore, type StatusFilter } from "@/stores/app-store";
import type { BranchType } from "@/domain/branches/types";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "waiting", label: "Waiting" },
  { id: "merged", label: "Merged" },
  { id: "recurring", label: "Returned" },
];

const TYPE_FILTERS: { id: BranchType; label: string }[] = [
  { id: "event", label: "Events" },
  { id: "waiting", label: "Waiting" },
  { id: "projection", label: "Fears" },
  { id: "identity", label: "Identity" },
  { id: "relationship", label: "Relationships" },
  { id: "body", label: "Body" },
  { id: "project", label: "Ideas" },
];

function FilterControls() {
  const branches = useAppStore((s) => s.branches);
  const statusFilter = useAppStore((s) => s.statusFilter);
  const typeFilter = useAppStore((s) => s.typeFilter);
  const setStatusFilter = useAppStore((s) => s.setStatusFilter);
  const setTypeFilter = useAppStore((s) => s.setTypeFilter);

  const filtered = statusFilter !== "all" || typeFilter.size > 0;

  function toggleType(t: BranchType) {
    const next = new Set(typeFilter);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setTypeFilter(next);
  }

  return (
    <div className="filter-bar" role="group" aria-label="Filter branches">
      <div className="filter-row" role="group" aria-label="By status">
        {STATUS_FILTERS.map((f) => {
          const count = branches.filter((b) => matchesStatusFilter(b, f.id)).length;
          return (
            <button
              key={f.id}
              className="btn filter-btn"
              aria-pressed={statusFilter === f.id}
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label}
              <span className="filter-count" aria-hidden="true">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="filter-row filter-kinds" role="group" aria-label="By kind">
        {TYPE_FILTERS.map((f) => {
          const count = branches.filter((b) => b.type === f.id).length;
          if (count === 0) return null;
          return (
            <button
              key={f.id}
              className="chip filter-chip"
              aria-pressed={typeFilter.has(f.id)}
              onClick={() => toggleType(f.id)}
            >
              {f.label}
            </button>
          );
        })}
        {filtered && (
          <button
            className="btn btn-quiet"
            onClick={() => {
              setStatusFilter("all");
              setTypeFilter(new Set());
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

type Props = { variant?: "inline" | "popover" };

export function TimelineFilters({ variant = "inline" }: Props) {
  const statusFilter = useAppStore((s) => s.statusFilter);
  const typeFilter = useAppStore((s) => s.typeFilter);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (variant === "inline") return <FilterControls />;

  const activeCount = (statusFilter !== "all" ? 1 : 0) + typeFilter.size;

  return (
    <div className="filter-popover-wrap" ref={wrapRef}>
      <button
        className="btn"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        Filter
        {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
      </button>
      {open && (
        <div className="filter-popover" role="dialog" aria-label="Filter branches">
          <FilterControls />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.4rem" }}>
            <button className="btn btn-quiet" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
