import Dexie, { type EntityTable } from "dexie";
import type { PsychologicalBranch } from "@/domain/branches/types";
import type { BranchMerge, MergeDraft } from "@/domain/merges/types";
import type { WaitingContainer } from "@/domain/waiting/types";
import type { IntegratedAction } from "@/domain/actions/types";

export class OneCurrentDB extends Dexie {
  branches!: EntityTable<PsychologicalBranch, "id">;
  merges!: EntityTable<BranchMerge, "id">;
  waiting!: EntityTable<WaitingContainer, "id">;
  actions!: EntityTable<IntegratedAction, "id">;
  drafts!: EntityTable<MergeDraft, "id">;

  constructor() {
    super("one-current");
    this.version(1).stores({
      branches: "id, status, type, forkDate, lastActivatedAt",
      merges: "id, createdAt, *branchIds",
      waiting: "id, branchId, reviewDate",
      actions: "id, mergeId, createdAt",
      projects: "id, branchId, reviewDate",
      drafts: "id, startedAt",
    });
    // Projects are no longer managed here — real work lives with your tasks.
    this.version(2).stores({ projects: null });
    // One metric: what was stored as "pull" (and briefly "anxietyLevel")
    // is the thread's loudness.
    this.version(3).upgrade((tx) =>
      tx.table("branches").toCollection().modify((b: Record<string, unknown>) => {
        if (b.loudness === undefined) b.loudness = b.pull ?? 3;
        delete b.pull;
        delete b.anxietyLevel;
      }),
    );
  }
}

export const db = new OneCurrentDB();
