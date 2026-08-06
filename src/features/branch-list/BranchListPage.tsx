import { useMemo, useState } from "react";
import { filterBranches, useAppStore } from "@/stores/app-store";
import { isOpen, isWaiting, isClosed } from "@/domain/branches/logic";
import { branchColor } from "@/visualization/branch-lines/style";
import type { PsychologicalBranch } from "@/domain/branches/types";
import { TimelineFilters } from "@/features/life-timeline/TimelineFilters";

const KIND_LABELS: Record<PsychologicalBranch["type"], string> = {
  event: "Event",
  waiting: "Waiting",
  projection: "Fear or projection",
  identity: "Identity",
  relationship: "Relationship",
  body: "Body",
  project: "Idea",
};

function BranchRow({ branch }: { branch: PsychologicalBranch }) {
  const setOperation = useAppStore((s) => s.setOperation);
  const theme = useAppStore((s) => s.theme);
  const openBranch = isOpen(branch);

  return (
    <li className="branch-row">
      <span
        className="branch-swatch"
        style={{ background: branchColor(branch, theme) }}
        aria-hidden="true"
      />
      <div className="branch-row-body">
        <strong>{branch.title}</strong>
        <p className="hint" style={{ margin: 0 }}>
          {KIND_LABELS[branch.type]} · forked {branch.forkLabel ?? branch.forkDate}
          {openBranch ? ` · pull ${branch.pull} of 5` : ""}
          {branch.mergeDate ? ` · merged ${branch.mergeDate}` : ""}
          {branch.recurrenceCount > 0
            ? ` · returned ${branch.recurrenceCount} time${branch.recurrenceCount === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>
      <div className="branch-row-actions">
        <button
          className="btn btn-quiet"
          onClick={() => setOperation({ kind: "inspecting-branch", branchId: branch.id, depth: "deep" })}
        >
          Inspect
        </button>
        {openBranch && !isWaiting(branch) && (
          <button
            className="btn"
            onClick={() => setOperation({ kind: "merging-branch", branchIds: [branch.id] })}
          >
            Merge
          </button>
        )}
      </div>
    </li>
  );
}

function Group({ title, hint, items }: { title: string; hint?: string; items: PsychologicalBranch[] }) {
  if (items.length === 0) return null;
  return (
    <section className="branch-group">
      <h2>
        {title} <span className="hint">({items.length})</span>
      </h2>
      {hint && <p className="hint">{hint}</p>}
      <ul className="branch-rows">
        {items.map((b) => (
          <BranchRow key={b.id} branch={b} />
        ))}
      </ul>
    </section>
  );
}

/** All branches as a searchable, filterable list — the non-spatial view of the timeline. */
export function BranchListPage() {
  const branches = useAppStore((s) => s.branches);
  const typeFilter = useAppStore((s) => s.typeFilter);
  const statusFilter = useAppStore((s) => s.statusFilter);
  const setOperation = useAppStore((s) => s.setOperation);
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () => filterBranches(branches, typeFilter, statusFilter, query),
    [branches, typeFilter, statusFilter, query],
  );

  const active = visible.filter((b) => isOpen(b) && !isWaiting(b) && b.type !== "project");
  const waiting = visible.filter((b) => isWaiting(b) && isOpen(b));
  const projects = visible.filter((b) => b.type === "project" && isOpen(b));
  const merged = visible.filter((b) => isClosed(b) || b.status === "partly-integrated");

  return (
    <div className="panel panel-wide">
      <h1>Branches</h1>
      <div className="list-controls">
        <input
          type="search"
          className="search-input"
          placeholder="Search branches…"
          aria-label="Search branches"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <TimelineFilters />
      </div>

      {branches.length === 0 ? (
        <div className="card">
          <p className="prompt">No branches yet.</p>
          <p className="hint">
            When something begins pulling part of your attention away from the present, add it as a
            branch.
          </p>
          <button className="btn btn-primary" onClick={() => setOperation({ kind: "creating-branch" })}>
            Add your first branch
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="hint">Nothing matches the current search and filters.</p>
      ) : (
        <>
          <Group title="Active" hint="Still pulling attention into the present." items={active} />
          <Group
            title="Waiting"
            hint="Held deliberately until something outside you moves."
            items={waiting}
          />
          <Group title="Ideas" hint="Lines that want to become real work." items={projects} />
          <Group
            title="Merged"
            hint="Already integrated. They stay part of your history."
            items={merged}
          />
        </>
      )}
    </div>
  );
}
