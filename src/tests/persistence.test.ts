import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/database";
import { repo } from "@/db/repository";
import { useAppStore } from "@/stores/app-store";
import { createBranch } from "@/domain/branches/logic";
import { newId } from "@/domain/ids";
import type { MergeDraft } from "@/domain/merges/types";

beforeEach(async () => {
  await repo.deleteEverything();
  useAppStore.setState({
    ready: false,
    branches: [],
    merges: [],
    waiting: [],
    actions: [],
    mergeDraft: undefined,
    view: { kind: "timeline" },
    operation: { kind: "idle" },
  });
});

describe("IndexedDB persistence", () => {
  it("persists branches across store reloads", async () => {
    const store = useAppStore.getState();
    await store.init();
    const branch = await useAppStore
      .getState()
      .createBranchNow({ title: "Persistent worry", kindChoiceId: "waiting", period: { kind: "this-week" } });

    // Simulate a fresh session.
    useAppStore.setState({ ready: false, branches: [] });
    await useAppStore.getState().init();
    const loaded = useAppStore.getState().branches;
    expect(loaded.map((b) => b.id)).toContain(branch.id);
    expect(loaded[0].title).toBe("Persistent worry");
  });

  it("persists moments inside the branch record", async () => {
    await useAppStore.getState().init();
    const branch = await useAppStore
      .getState()
      .createBranchNow({ title: "With moments", kindChoiceId: "something-happened", period: { kind: "today" } });
    await useAppStore.getState().addMoment({
      branchId: branch.id,
      date: "2026-08-01",
      title: "A conversation",
      type: "event",
    });
    const stored = await db.branches.get(branch.id);
    expect(stored?.commits).toHaveLength(1);
    expect(stored?.commits[0].title).toBe("A conversation");
  });

  it("restores an interrupted merge on init", async () => {
    const branch = createBranch(
      { title: "Interrupted", kindChoiceId: "something-happened", period: { kind: "today" } },
    );
    await repo.saveBranch(branch);
    const draft: MergeDraft = {
      id: newId("dr"),
      branchIds: [branch.id],
      startedAt: new Date().toISOString(),
      stage: "categorise",
      partial: { stillValid: ["it matters"] },
    };
    await repo.saveDraft(draft);

    await useAppStore.getState().init();
    const state = useAppStore.getState();
    expect(state.mergeDraft?.id).toBe(draft.id);
    // The merge reopens over the timeline, not on a separate page.
    expect(state.view).toEqual({ kind: "timeline" });
    expect(state.operation).toEqual({ kind: "merging-branch", branchIds: [branch.id] });
    expect(state.mergeDraft?.partial.stillValid).toEqual(["it matters"]);
  });

  it("completing a merge clears the draft and closes the branch", async () => {
    await useAppStore.getState().init();
    const branch = await useAppStore
      .getState()
      .createBranchNow({ title: "To merge", kindChoiceId: "something-happened", period: { kind: "this-month" } });
    await useAppStore.getState().startMerge([branch.id]);
    expect(useAppStore.getState().mergeDraft).toBeTruthy();

    await useAppStore.getState().completeMerge({
      branches: [useAppStore.getState().branches.find((b) => b.id === branch.id)!],
      preserveRelease: { stillValid: [], outdated: [], outsideControl: [], reclaimable: ["rest"] },
      conflicts: [],
      resolution: "settled",
      released: ["checking"],
      resultStatus: "merged",
    });

    const state = useAppStore.getState();
    expect(state.mergeDraft).toBeUndefined();
    expect(state.branches.find((b) => b.id === branch.id)?.status).toBe("merged");
    expect(state.merges).toHaveLength(1);
    expect(await db.drafts.count()).toBe(0);
    expect(await db.merges.count()).toBe(1);
  });

  it("export and import round-trip", async () => {
    await useAppStore.getState().init();
    await useAppStore
      .getState()
      .createBranchNow({ title: "Exported", kindChoiceId: "body", period: { kind: "today" } });
    const json = await useAppStore.getState().exportData();
    await useAppStore.getState().deleteEverything();
    expect(useAppStore.getState().branches).toHaveLength(0);
    await useAppStore.getState().importData(json);
    expect(useAppStore.getState().branches.map((b) => b.title)).toContain("Exported");
  });

  it("rejects imports that are not One Current exports", async () => {
    await useAppStore.getState().init();
    await expect(useAppStore.getState().importData('{"foo": 1}')).rejects.toThrow(/not a One Current export/);
  });
});
