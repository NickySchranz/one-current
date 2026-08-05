import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import App from "@/App";
import { repo } from "@/db/repository";
import { useAppStore } from "@/stores/app-store";

beforeEach(async () => {
  cleanup();
  await repo.deleteEverything();
  useAppStore.setState({
    ready: false,
    branches: [],
    merges: [],
    waiting: [],
    actions: [],
    mergeDraft: undefined,
    view: { kind: "timeline" },
    reducedMotion: false,
  });
});

describe("app flows", () => {
  it("creates a branch through the quick flow", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "New branch" }));
    const input = await screen.findByLabelText("Name the branch");
    fireEvent.change(input, { target: { value: "Career direction" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(await screen.findByRole("button", { name: "This month" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(await screen.findByRole("button", { name: "I am afraid of a future outcome" }));

    // Name what it stirs; the locked feelings follow automatically.
    fireEvent.click(await screen.findByRole("button", { name: "worry" }));
    fireEvent.click(screen.getByRole("button", { name: "Add this line" }));

    await waitFor(() => expect(useAppStore.getState().branches).toHaveLength(1));
    const branch = useAppStore.getState().branches[0];
    expect(branch.title).toBe("Career direction");
    expect(branch.type).toBe("projection");
    expect(branch.anxieties).toEqual(["worry"]);
    expect(branch.occupies).toEqual(["calm", "sleep"]);
    // Back on the timeline, the branch is visible.
    expect(useAppStore.getState().view).toEqual({ kind: "timeline" });
  });

  it("shows the screen-reader timeline summary", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    await useAppStore.getState().createBranchNow({
      title: "Lost fitness",
      kindChoiceId: "body",
      period: { kind: "this-month" },
      pull: 4,
    });
    await waitFor(() => {
      const status = screen.getAllByRole("status")[0];
      expect(status.textContent).toContain("One active branch reaches today.");
      expect(status.textContent).toContain("Lost fitness");
    });
  });

  it("respects reduced motion via the data attribute", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    useAppStore.getState().setReducedMotion(true);
    await waitFor(() =>
      expect(document.documentElement.dataset.reducedMotion).toBe("true"),
    );
  });

  it("eases the pull when a branch is deliberately left on the touch screen", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    const branch = await useAppStore.getState().createBranchNow({
      title: "Visa decision",
      kindChoiceId: "outside-control",
      period: { kind: "this-week" },
      pull: 4,
    });
    useAppStore.getState().setView({ kind: "touch", branchId: branch.id });
    fireEvent.click(await screen.findByRole("button", { name: /out of my hands/i }));
    await waitFor(() => {
      const b = useAppStore.getState().branches[0];
      expect(b.pull).toBe(3);
      expect(b.controllability).toBe("outside-control");
    });
    fireEvent.click(screen.getByRole("button", { name: "Back to the timeline" }));
    expect(useAppStore.getState().view).toEqual({ kind: "timeline" });
  });

  it("turns a small step into today's action and eases the pull", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    const branch = await useAppStore.getState().createBranchNow({
      title: "Career direction",
      kindChoiceId: "feared-future",
      period: { kind: "this-month" },
      pull: 5,
    });
    useAppStore.getState().setView({ kind: "touch", branchId: branch.id });
    fireEvent.click(await screen.findByRole("button", { name: /do something about it today/i }));
    fireEvent.change(screen.getByLabelText("The smallest honest step"), {
      target: { value: "Update one section of the CV" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Make it today's action" }));
    await waitFor(() => {
      expect(useAppStore.getState().actions).toHaveLength(1);
      expect(useAppStore.getState().branches[0].pull).toBe(4);
    });
    expect(useAppStore.getState().actions[0].title).toBe("Update one section of the CV");
  });

  it("folds a line back with a quick merge, freeing feelings and finishing its actions", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    const branch = await useAppStore.getState().createBranchNow({
      title: "Old flat decision",
      kindChoiceId: "something-happened",
      period: { kind: "this-month" },
      pull: 3,
    });
    await useAppStore.getState().updateBranch(branch.id, { occupies: ["calm", "sleep"] });
    await useAppStore.getState().createTodayAction(branch.id, "One step");
    // Pretend the action decision happened yesterday, so the touch view
    // offers its choices again (a decided-today line only shows the decision).
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await useAppStore.getState().updateBranch(branch.id, { lastDecisionOn: yesterday });
    useAppStore.getState().setView({ kind: "touch", branchId: branch.id });
    fireEvent.click(await screen.findByRole("button", { name: /moved past this/i }));
    fireEvent.click(screen.getByRole("button", { name: "Fold it back into my line" }));
    await waitFor(() => {
      const b = useAppStore.getState().branches.find((x) => x.id === branch.id)!;
      expect(b.status).toBe("merged");
      expect(b.mergeIds).toHaveLength(1);
    });
    const state = useAppStore.getState();
    const merge = state.merges[state.merges.length - 1];
    expect(merge.reclaimedQualities).toEqual(["calm", "sleep"]);
    // a merged line is out of your head: nothing left to do on it
    expect(state.actions.every((a) => a.completedAt)).toBe(true);
    expect(state.reclaim?.feelings).toEqual(["calm", "sleep"]);
  });

  it("opens the Now view listing active branches", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    await useAppStore.getState().createBranchNow({
      title: "Waiting for the permit",
      kindChoiceId: "waiting",
      period: { kind: "this-week" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Now" })[0]);
    expect(await screen.findByText("These branches are active today.")).toBeTruthy();
    expect(screen.getByText("Waiting for the permit")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Merge what can be integrated now" }),
    ).toBeTruthy();
  });
});
