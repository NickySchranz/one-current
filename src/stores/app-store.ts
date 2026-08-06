import { create } from "zustand";
import type { ForkPeriodChoice, PsychologicalBranch, Pull } from "@/domain/branches/types";
import type { BranchMerge, MergeDraft } from "@/domain/merges/types";
import type { WaitingContainer } from "@/domain/waiting/types";
import type { IntegratedAction } from "@/domain/actions/types";
import type { BranchCommit } from "@/domain/moments/types";
import { createBranch, easePull, type CreateBranchInput } from "@/domain/branches/logic";
import { addMomentToBranch, createMoment, type CreateMomentInput } from "@/domain/moments/logic";
import { detectRecurrence, recordRecurrence } from "@/domain/branches/recurrence";
import { applyMergeToBranch, createMerge, type CreateMergeInput } from "@/domain/merges/logic";
import { applyWaitingToBranch, createWaitingContainer, type CreateWaitingInput } from "@/domain/waiting/logic";
import { completeAction, composeIntegratedAction } from "@/domain/actions/logic";
import { heldFeelings } from "@/domain/feelings/logic";
import { newId } from "@/domain/ids";
import { repo } from "@/db/repository";
import { panWindow, weekWindow, zoomWindow, type TimeWindow } from "@/visualization/zoom/time-scale";
import { isThemeId, type ThemeId } from "@/visualization/theme";

/** The tabs. Everything that concerns a line happens over the timeline, not on a page. */
export type View =
  | { kind: "timeline" }
  | { kind: "now" }
  | { kind: "merge-review"; mergeId: string }
  | { kind: "history" }
  | { kind: "branches" }
  | { kind: "settings" };

/**
 * What is currently happening ON the timeline. The timeline stays mounted and
 * visible; the operation renders in an anchored tray over it.
 */
export type TimelineOperation =
  | { kind: "idle" }
  | { kind: "creating-branch" }
  | { kind: "checking-recurrence"; matchedBranchId: string; pending: CreateBranchInput }
  | { kind: "inspecting-branch"; branchId: string; depth: "touch" | "deep" }
  | { kind: "merging-branch"; branchIds: string[] }
  | { kind: "creating-waiting-container"; branchId: string }
  /** Integrate Now: selecting several open lines at their endpoints, then merging them together. */
  | { kind: "integrating"; branchIds: string[] };

export type StatusFilter = "all" | "active" | "waiting" | "merged" | "recurring";

/** A decision just released these feelings back to the main line (drives the timeline animation). */
export type ReclaimEvent = { key: number; branchId: string; feelings: string[] };

type AppState = {
  ready: boolean;
  branches: PsychologicalBranch[];
  merges: BranchMerge[];
  waiting: WaitingContainer[];
  actions: IntegratedAction[];
  mergeDraft?: MergeDraft;
  view: View;
  operation: TimelineOperation;
  window?: TimeWindow;
  typeFilter: Set<PsychologicalBranch["type"]>;
  statusFilter: StatusFilter;
  reducedMotion: boolean;
  theme: ThemeId;
  reclaim?: ReclaimEvent;
  /** A branch was just created: its line draws itself onto the timeline. */
  born?: { key: number; branchId: string };

  init(): Promise<void>;
  setView(view: View): void;
  /** Begin (or end, with idle) an operation over the timeline. Jumps to the timeline shell. */
  setOperation(operation: TimelineOperation): void;
  returnToNow(): void;

  requestBranch(
    input: CreateBranchInput,
  ): Promise<{ recurrenceOf?: string; branch?: PsychologicalBranch }>;
  createBranchNow(input: CreateBranchInput): Promise<PsychologicalBranch>;
  updateBranch(id: string, patch: Partial<PsychologicalBranch>): Promise<void>;
  deleteBranch(id: string): Promise<void>;
  addMoment(input: CreateMomentInput): Promise<BranchCommit>;
  /** Any decision about a branch loosens its pull; optionally applies a patch alongside. */
  easeBranch(id: string, patch?: Partial<PsychologicalBranch>): Promise<void>;
  /** One small step today for a single branch; eases its pull. */
  createTodayAction(branchId: string, step: string): Promise<void>;
  /** Fold a line back into the main line, naming only what it frees up. No wizard. */
  quickMerge(branchId: string, freedFeelings: string[]): Promise<void>;
  /** A folded line came back to mind: it continues as an open line again. */
  reopenBranch(branchId: string): Promise<void>;
  clearReclaim(): void;
  clearBorn(): void;
  updateMoment(branchId: string, moment: BranchCommit): Promise<void>;

  startMerge(branchIds: string[]): Promise<void>;
  saveMergeDraft(draft: MergeDraft): Promise<void>;
  cancelMerge(): Promise<void>;
  completeMerge(input: CreateMergeInput): Promise<BranchMerge>;

  placeInWaiting(input: CreateWaitingInput): Promise<WaitingContainer>;
  /** This line is real work now: it leaves your head and lives where your tasks live. */
  handOffBranch(branchId: string): Promise<void>;
  recordRecurrenceOn(branchId: string): Promise<void>;

  setWindow(window: TimeWindow): void;
  zoomBy(factor: number, focal?: number): void;
  panBy(fraction: number): void;
  setTypeFilter(types: Set<PsychologicalBranch["type"]>): void;
  setStatusFilter(f: StatusFilter): void;
  setReducedMotion(v: boolean): void;
  setTheme(t: ThemeId): void;

  exportData(): Promise<string>;
  importData(json: string): Promise<void>;
  deleteEverything(): Promise<void>;
  /** Fills the timeline with believable example branches to explore the app. */
  loadExampleData(): Promise<void>;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function initialTheme(): ThemeId {
  try {
    const saved = localStorage.getItem("one-current-theme");
    if (saved && isThemeId(saved)) return saved;
  } catch {
    // storage unavailable; fall through to the system preference
  }
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches
    ? "duskwood"
    : "riverbed";
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  branches: [],
  merges: [],
  waiting: [],
  actions: [],
  view: { kind: "timeline" },
  operation: { kind: "idle" },
  typeFilter: new Set(),
  statusFilter: "all",
  reducedMotion:
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  theme: initialTheme(),

  async init() {
    const data = await repo.loadAll();
    const draft = data.drafts[0];
    set({
      ready: true,
      branches: data.branches,
      merges: data.merges,
      waiting: data.waiting,
      actions: data.actions,
      mergeDraft: draft,
      window: weekWindow(),
      view: { kind: "timeline" },
      // An interrupted merge is restored where it stopped — over the timeline.
      operation: draft
        ? { kind: "merging-branch", branchIds: draft.branchIds }
        : { kind: "idle" },
    });
  },

  // Leaving the timeline sets any open operation down.
  setView: (view) => set({ view, operation: { kind: "idle" } }),
  // Operations live over the timeline, so starting one returns to it.
  setOperation: (operation) =>
    set((s) => ({
      operation,
      view: operation.kind === "idle" ? s.view : { kind: "timeline" },
    })),
  returnToNow: () => {
    set({ view: { kind: "timeline" }, window: weekWindow() });
  },

  async requestBranch(input) {
    const match = detectRecurrence(input.title, get().branches);
    if (match) {
      set({
        operation: { kind: "checking-recurrence", matchedBranchId: match.id, pending: input },
        view: { kind: "timeline" },
      });
      return { recurrenceOf: match.id };
    }
    const branch = await get().createBranchNow(input);
    return { branch };
  },

  async createBranchNow(input) {
    const branch = createBranch(input);
    await repo.saveBranch(branch);
    // The new line draws itself in immediately; whatever tray is open stays open.
    set((s) => ({
      branches: [...s.branches, branch],
      window: weekWindow(),
      view: { kind: "timeline" },
      born: { key: Date.now(), branchId: branch.id },
    }));
    return branch;
  },

  async updateBranch(id, patch) {
    // Apply to the freshest state synchronously so quick successive edits
    // (e.g. tapping kind then feelings) don't overwrite each other.
    let next: PsychologicalBranch | undefined;
    set((s) => ({
      branches: s.branches.map((b) => {
        if (b.id !== id) return b;
        next = { ...b, ...patch };
        return next;
      }),
    }));
    if (next) await repo.saveBranch(next);
  },

  async deleteBranch(id) {
    await repo.deleteBranch(id);
    set((s) => ({
      branches: s.branches.filter((b) => b.id !== id),
      view: { kind: "timeline" },
      operation: { kind: "idle" },
    }));
  },

  async addMoment(input) {
    const branch = get().branches.find((b) => b.id === input.branchId);
    if (!branch) throw new Error("Branch not found");
    const moment = createMoment(input);
    const next = addMomentToBranch(branch, moment);
    await repo.saveBranch(next);
    set((s) => ({ branches: s.branches.map((b) => (b.id === next.id ? next : b)) }));
    return moment;
  },

  async easeBranch(id, patch) {
    const branch = get().branches.find((b) => b.id === id);
    if (!branch) return;
    // What the line was holding until this decision — it returns for today.
    const freed = heldFeelings(branch);
    const next: PsychologicalBranch = {
      ...branch,
      ...patch,
      pull: easePull(branch.pull),
      lastDecisionOn: todayIso(),
      lastActivatedAt: new Date().toISOString(),
    };
    await repo.saveBranch(next);
    set((s) => ({
      branches: s.branches.map((b) => (b.id === id ? next : b)),
      reclaim: freed.length > 0 ? { key: Date.now(), branchId: id, feelings: freed } : s.reclaim,
    }));
  },

  async quickMerge(branchId, freedFeelings) {
    const branch = get().branches.find((b) => b.id === branchId);
    if (!branch) return;
    const merge = createMerge({
      branches: [branch],
      preserveRelease: {
        stillValid: [],
        outdated: [],
        outsideControl: [],
        reclaimable: freedFeelings,
      },
      conflicts: [],
      resolution: "Folded back into the main line.",
      released: [],
      resultStatus: "merged",
    });
    const next = applyMergeToBranch(
      { ...branch, occupies: freedFeelings.length > 0 ? freedFeelings : branch.occupies },
      merge,
    );
    // A merged line is out of your head: nothing left to do on it.
    const openActions = get()
      .actions.filter(
        (a) => !a.completedAt && a.branchesIntegrated.some((x) => x.branchId === branchId),
      )
      .map((a) => completeAction(a));
    await repo.saveMerge(merge);
    await repo.saveBranch(next);
    for (const a of openActions) await repo.saveAction(a);
    set((s) => ({
      merges: [...s.merges, merge],
      branches: s.branches.map((b) => (b.id === branchId ? next : b)),
      actions: s.actions.map((a) => openActions.find((c) => c.id === a.id) ?? a),
      reclaim:
        freedFeelings.length > 0
          ? { key: Date.now(), branchId, feelings: freedFeelings }
          : s.reclaim,
    }));
  },

  async reopenBranch(branchId) {
    const branch = get().branches.find((b) => b.id === branchId);
    if (!branch) return;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const next: PsychologicalBranch = {
      ...recordRecurrence(branch),
      status: "active",
      mergeDate: undefined,
      pull: Math.max(2, branch.pull) as Pull,
      // Reopening is a reactivation, not a decision: dated yesterday so the
      // line holds its feelings again today without instantly drifting.
      lastDecisionOn: yesterday,
      leftOn: undefined,
    };
    await repo.saveBranch(next);
    set((s) => ({ branches: s.branches.map((b) => (b.id === branchId ? next : b)) }));
  },

  clearReclaim: () => set({ reclaim: undefined }),
  clearBorn: () => set({ born: undefined }),

  async createTodayAction(branchId, step) {
    const branch = get().branches.find((b) => b.id === branchId);
    if (!branch) return;
    const action = composeIntegratedAction({
      branches: [branch],
      title: step,
      instruction: step,
      durationMinutes: 10,
      minimumVersion: "A few honest minutes of it",
      qualitiesCarried: branch.storedQualities,
      completionDefinition: "When it has been done once today",
    });
    await repo.saveAction(action);
    set((s) => ({ actions: [...s.actions, action] }));
    await get().easeBranch(branchId);
  },

  async updateMoment(branchId, moment) {
    const branch = get().branches.find((b) => b.id === branchId);
    if (!branch) return;
    const next = {
      ...branch,
      commits: branch.commits.map((m) => (m.id === moment.id ? moment : m)),
    };
    await repo.saveBranch(next);
    set((s) => ({ branches: s.branches.map((b) => (b.id === next.id ? next : b)) }));
  },

  async startMerge(branchIds) {
    const draft: MergeDraft = {
      id: newId("dr"),
      branchIds,
      startedAt: new Date().toISOString(),
      stage: "carrying",
      partial: {},
    };
    await repo.saveDraft(draft);
    set({
      mergeDraft: draft,
      operation: { kind: "merging-branch", branchIds },
      view: { kind: "timeline" },
    });
  },

  async saveMergeDraft(draft) {
    await repo.saveDraft(draft);
    set({ mergeDraft: draft });
  },

  async cancelMerge() {
    const draft = get().mergeDraft;
    if (draft) await repo.deleteDraft(draft.id);
    set({ mergeDraft: undefined, view: { kind: "timeline" }, operation: { kind: "idle" } });
  },

  async completeMerge(input) {
    const merge = createMerge(input);
    const updated = input.branches.map((b) => applyMergeToBranch(b, merge));
    await repo.saveMerge(merge);
    await repo.saveBranches(updated);
    if (merge.action) await repo.saveAction(merge.action);
    const draft = get().mergeDraft;
    if (draft) await repo.deleteDraft(draft.id);
    set((s) => ({
      merges: [...s.merges, merge],
      actions: merge.action ? [...s.actions, merge.action] : s.actions,
      branches: s.branches.map((b) => updated.find((u) => u.id === b.id) ?? b),
      mergeDraft: undefined,
      view: { kind: "timeline" },
      operation: { kind: "idle" },
    }));
    return merge;
  },

  async placeInWaiting(input) {
    const container = createWaitingContainer(input);
    const branch = get().branches.find((b) => b.id === input.branchId);
    if (!branch) throw new Error("Branch not found");
    const next = applyWaitingToBranch(branch, container);
    await repo.saveWaiting(container);
    await repo.saveBranch(next);
    // The tray stays open so the calm confirmation can be read over the timeline.
    set((s) => ({
      waiting: [...s.waiting, container],
      branches: s.branches.map((b) => (b.id === next.id ? next : b)),
    }));
    return container;
  },

  async handOffBranch(branchId) {
    const branch = get().branches.find((b) => b.id === branchId);
    if (!branch) return;
    const today = todayIso();
    const freed = heldFeelings(branch);
    const next: PsychologicalBranch = {
      ...branch,
      status: "converted-to-project",
      mergeDate: today,
      pull: 1,
      lastDecisionOn: today,
      leftOn: undefined,
    };
    // The work lives where your tasks live now: nothing left to do on it here.
    const openActions = get()
      .actions.filter(
        (a) => !a.completedAt && a.branchesIntegrated.some((x) => x.branchId === branchId),
      )
      .map((a) => completeAction(a));
    await repo.saveBranch(next);
    for (const a of openActions) await repo.saveAction(a);
    set((s) => ({
      branches: s.branches.map((b) => (b.id === branchId ? next : b)),
      actions: s.actions.map((a) => openActions.find((c) => c.id === a.id) ?? a),
      reclaim: freed.length > 0 ? { key: Date.now(), branchId, feelings: freed } : s.reclaim,
      view: { kind: "timeline" },
      operation: { kind: "idle" },
    }));
  },

  async recordRecurrenceOn(branchId) {
    const branch = get().branches.find((b) => b.id === branchId);
    if (!branch) return;
    const next = recordRecurrence(branch);
    await repo.saveBranch(next);
    set((s) => ({ branches: s.branches.map((b) => (b.id === branchId ? next : b)) }));
  },

  setWindow: (window) => set({ window }),
  zoomBy(factor, focal = 0.75) {
    const w = get().window;
    if (!w) return;
    set({ window: zoomWindow(w, factor, focal, todayIso()) });
  },
  panBy(fraction) {
    const w = get().window;
    if (!w) return;
    set({ window: panWindow(w, fraction, todayIso()) });
  },
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setTheme: (theme) => {
    try {
      localStorage.setItem("one-current-theme", theme);
    } catch {
      // storage may be unavailable (private mode); the choice still applies now
    }
    set({ theme });
  },

  exportData: () => repo.exportAll(),
  async importData(json) {
    await repo.importAll(json);
    const data = await repo.loadAll();
    set({
      branches: data.branches,
      merges: data.merges,
      waiting: data.waiting,
      actions: data.actions,
      window: weekWindow(),
    });
  },
  async loadExampleData() {
    const { buildExampleData } = await import("@/db/example-data");
    const data = buildExampleData();
    await repo.saveBranches(data.branches);
    for (const m of data.merges) await repo.saveMerge(m);
    for (const a of data.actions) await repo.saveAction(a);
    set((s) => ({
      branches: [...s.branches, ...data.branches],
      merges: [...s.merges, ...data.merges],
      actions: [...s.actions, ...data.actions],
      view: { kind: "timeline" },
      operation: { kind: "idle" },
      window: weekWindow(),
    }));
  },
  async deleteEverything() {
    await repo.deleteEverything();
    set({
      branches: [],
      merges: [],
      waiting: [],
      actions: [],
      mergeDraft: undefined,
      view: { kind: "timeline" },
      operation: { kind: "idle" },
      window: weekWindow(),
    });
  },
}));

export function matchesStatusFilter(
  b: PsychologicalBranch,
  statusFilter: StatusFilter,
): boolean {
  switch (statusFilter) {
    case "all":
      return true;
    case "active":
      return !["merged", "archived", "waiting-with-boundaries"].includes(b.status);
    case "waiting":
      return b.status === "waiting-with-boundaries";
    case "merged":
      return ["merged", "partly-integrated", "archived"].includes(b.status);
    case "recurring":
      return b.recurrenceCount > 0;
  }
}

/** Branches visible under the current filters and optional title search. */
export function filterBranches(
  branches: PsychologicalBranch[],
  typeFilter: Set<PsychologicalBranch["type"]>,
  statusFilter: StatusFilter,
  query = "",
): PsychologicalBranch[] {
  const q = query.trim().toLowerCase();
  return branches.filter((b) => {
    if (typeFilter.size > 0 && !typeFilter.has(b.type)) return false;
    if (q && !`${b.title} ${b.description ?? ""}`.toLowerCase().includes(q)) return false;
    return matchesStatusFilter(b, statusFilter);
  });
}

export type { CreateBranchInput, Pull, ForkPeriodChoice };
