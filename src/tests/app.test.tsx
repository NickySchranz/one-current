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
    operation: { kind: "idle" },
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

    // Two stages: when it began, then the line is immediately real.
    fireEvent.click(await screen.findByRole("button", { name: "This month" }));
    fireEvent.click(screen.getByRole("button", { name: "Start this line" }));
    await waitFor(() => expect(useAppStore.getState().branches).toHaveLength(1));
    expect(await screen.findByText(/The branch is active/)).toBeTruthy();

    // Everything else is optional enrichment, in place.
    fireEvent.click(screen.getByRole("button", { name: "I am afraid of a future outcome" }));
    // Name what it stirs; the less-available feelings follow automatically.
    fireEvent.click(screen.getByRole("button", { name: "worry" }));
    await waitFor(() => {
      const branch = useAppStore.getState().branches[0];
      expect(branch.title).toBe("Career direction");
      expect(branch.type).toBe("projection");
      expect(branch.anxieties).toEqual(["worry"]);
      expect(branch.occupies).toEqual(["calm", "sleep"]);
    });

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    // Back on the timeline with the tray closed, the branch is visible.
    expect(useAppStore.getState().view).toEqual({ kind: "timeline" });
    expect(useAppStore.getState().operation).toEqual({ kind: "idle" });
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
    useAppStore.getState().setOperation({ kind: "inspecting-branch", branchId: branch.id, depth: "touch" });
    fireEvent.click(await screen.findByRole("button", { name: /out of my hands/i }));
    await waitFor(() => {
      const b = useAppStore.getState().branches[0];
      expect(b.pull).toBe(3);
      expect(b.controllability).toBe("outside-control");
    });
    fireEvent.click(screen.getByRole("button", { name: "Back to the timeline" }));
    expect(useAppStore.getState().view).toEqual({ kind: "timeline" });
    expect(useAppStore.getState().operation).toEqual({ kind: "idle" });
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
    useAppStore.getState().setOperation({ kind: "inspecting-branch", branchId: branch.id, depth: "touch" });
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
    useAppStore.getState().setOperation({ kind: "inspecting-branch", branchId: branch.id, depth: "touch" });
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

  it("keeps the timeline mounted behind every operation", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    const branch = await useAppStore.getState().createBranchNow({
      title: "Move abroad",
      kindChoiceId: "feared-future",
      period: { kind: "this-week" },
    });

    // Creating a branch happens over the timeline, not on a page.
    fireEvent.click(screen.getByRole("button", { name: "New branch" }));
    expect(await screen.findByLabelText("Name the branch")).toBeTruthy();
    expect(document.querySelector(".timeline-svg")).toBeTruthy();
    expect(useAppStore.getState().view).toEqual({ kind: "timeline" });

    // So do touching, deep inspection, merging and waiting.
    for (const operation of [
      { kind: "inspecting-branch", branchId: branch.id, depth: "touch" },
      { kind: "inspecting-branch", branchId: branch.id, depth: "deep" },
      { kind: "merging-branch", branchIds: [branch.id] },
      { kind: "creating-waiting-container", branchId: branch.id },
    ] satisfies import("@/stores/app-store").TimelineOperation[]) {
      useAppStore.getState().setOperation(operation);
      await waitFor(() => expect(document.querySelector(".operation-tray")).toBeTruthy());
      expect(document.querySelector(".timeline-svg")).toBeTruthy();
      expect(useAppStore.getState().view).toEqual({ kind: "timeline" });
    }

    // Escape sets the operation down; the timeline is still there.
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(useAppStore.getState().operation).toEqual({ kind: "idle" }),
    );
    expect(document.querySelector(".timeline-svg")).toBeTruthy();
  });

  it("compares fork with Now and sorts parts into destinations, in place", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    const branch = await useAppStore.getState().createBranchNow({
      title: "Old friendship",
      kindChoiceId: "relationship",
      period: { kind: "this-month" },
      pull: 3,
    });
    useAppStore.getState().setOperation({
      kind: "inspecting-branch",
      branchId: branch.id,
      depth: "deep",
    });

    // The timeline stays mounted behind the deep inspection.
    await waitFor(() => expect(document.querySelector(".operation-tray")).toBeTruthy());
    expect(document.querySelector(".timeline-svg")).toBeTruthy();

    // Fork ↔ Now: two anchored panels side by side.
    fireEvent.click(screen.getByText("Compare the fork with Now (optional)"));
    const nowField = screen.getByLabelText("What feels true today, in your own words?");
    fireEvent.change(nowField, { target: { value: "We simply grew apart." } });
    fireEvent.blur(nowField);
    await waitFor(() =>
      expect(useAppStore.getState().branches[0].currentBelief).toBe("We simply grew apart."),
    );
    fireEvent.click(screen.getByRole("button", { name: "My understanding changed." }));
    await waitFor(() =>
      expect(useAppStore.getState().branches[0].diffSelections).toEqual([
        "understanding-changed",
      ]),
    );

    // Preserve and release: an honest step becomes today's action.
    fireEvent.click(screen.getByText("Where should each part go? (optional)"));
    fireEvent.change(screen.getByLabelText(/Needs a real action/), {
      target: { value: "Write the birthday message" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Make it today's action" }));
    await waitFor(() => expect(useAppStore.getState().actions).toHaveLength(1));
    expect(useAppStore.getState().actions[0].title).toBe("Write the birthday message");
    expect(await screen.findByText(/Placed on today/)).toBeTruthy();
  });

  it("previews a merge as a reversible curve toward Now", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    const branch = await useAppStore.getState().createBranchNow({
      title: "Unsent letter",
      kindChoiceId: "something-happened",
      period: { kind: "this-month" },
      pull: 3,
    });

    // Starting a merge shows the line curving toward Now, over the timeline.
    await useAppStore.getState().startMerge([branch.id]);
    await waitFor(() => expect(document.querySelector(".merge-preview")).toBeTruthy());
    expect(document.querySelector(".timeline-svg")).toBeTruthy();
    expect(document.querySelector(".operation-tray")).toBeTruthy();

    // Setting it aside is fully reversible: the preview lifts, the line stays open.
    fireEvent.click(screen.getByRole("button", { name: "Set aside for now" }));
    await waitFor(() => expect(document.querySelector(".merge-preview")).toBeFalsy());
    expect(useAppStore.getState().branches[0].status).not.toBe("merged");
    expect(useAppStore.getState().operation).toEqual({ kind: "idle" });
  });

  it("continues the main line past Now while today's action is open", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    const branch = await useAppStore.getState().createBranchNow({
      title: "Career direction",
      kindChoiceId: "feared-future",
      period: { kind: "this-month" },
    });
    expect(document.querySelector(".action-continuation")).toBeFalsy();
    await useAppStore.getState().createTodayAction(branch.id, "Update the CV");
    await waitFor(() =>
      expect(document.querySelector(".action-continuation-label")?.textContent).toBe(
        "Update the CV",
      ),
    );
  });

  it("selects several endpoints in Integrate Now mode and shows tensions before merging", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    const work = await useAppStore.getState().createBranchNow({
      title: "Ship the side project",
      kindChoiceId: "project-idea",
      period: { kind: "this-week" },
      pull: 3,
    });
    const body = await useAppStore.getState().createBranchNow({
      title: "Run down and tired",
      kindChoiceId: "body",
      period: { kind: "this-week" },
      pull: 3,
    });

    fireEvent.click(await screen.findByRole("button", { name: "Integrate Now" }));
    expect(useAppStore.getState().operation).toEqual({ kind: "integrating", branchIds: [] });

    // Selecting endpoints puts a quiet ring on each line.
    fireEvent.click(document.querySelector(`g[data-branch-id="${work.id}"] .branch-endpoint`)!);
    await waitFor(() => expect(document.querySelectorAll(".selection-ring")).toHaveLength(1));
    fireEvent.click(document.querySelector(`g[data-branch-id="${body.id}"] .branch-endpoint`)!);
    await waitFor(() => expect(document.querySelectorAll(".selection-ring")).toHaveLength(2));

    // Two opposite pulls: the tension appears as a marker near Now, on the timeline.
    expect(document.querySelector(".conflict-marker")).toBeTruthy();
    // Both selected lines lean toward Now while the choice is still open.
    expect(document.querySelectorAll(".merge-preview")).toHaveLength(2);

    // Selecting again deselects; the choice stays reversible.
    fireEvent.click(document.querySelector(`g[data-branch-id="${body.id}"] .branch-endpoint`)!);
    await waitFor(() => expect(document.querySelectorAll(".selection-ring")).toHaveLength(1));
    fireEvent.click(document.querySelector(`g[data-branch-id="${body.id}"] .branch-endpoint`)!);
    await waitFor(() => expect(document.querySelectorAll(".selection-ring")).toHaveLength(2));

    // Merging hands the selection to the merge tray, timeline still behind it.
    fireEvent.click(screen.getByRole("button", { name: "Merge into Now" }));
    await waitFor(() =>
      expect(useAppStore.getState().operation).toEqual({
        kind: "merging-branch",
        branchIds: [work.id, body.id],
      }),
    );
    expect(document.querySelector(".operation-tray")).toBeTruthy();
    expect(document.querySelector(".timeline-svg")).toBeTruthy();
  });

  it("shows a waiting line's review point on the timeline", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    const branch = await useAppStore.getState().createBranchNow({
      title: "Waiting for the permit",
      kindChoiceId: "waiting",
      period: { kind: "this-week" },
    });
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await useAppStore.getState().placeInWaiting({
      branchId: branch.id,
      awaiting: "The permit decision",
      actionTaken: "Application submitted",
      outsideControl: ["institutional timing"],
      reviewDate: tomorrow,
      reopenConditions: [],
      continueMeanwhile: [],
      reclaimedNow: [],
    });
    useAppStore.getState().setOperation({ kind: "idle" });
    await waitFor(() => expect(document.querySelector(".review-marker")).toBeTruthy());
    expect(document.querySelector(".review-label")?.textContent).toContain("review");
  });

  it("browses recent days in History, not in Now", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    fireEvent.click(screen.getAllByRole("button", { name: "Now" })[0]);
    expect(await screen.findByText(/this is only today/)).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Recent days" })).toBeFalsy();

    fireEvent.click(screen.getAllByRole("button", { name: "History" })[0]);
    expect(await screen.findByRole("group", { name: "Recent days" })).toBeTruthy();
    expect(screen.getByText(/Nothing was recorded on this day/)).toBeTruthy();
  });

  it("drives the timeline operations from the keyboard", async () => {
    render(<App />);
    await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
    await useAppStore.getState().createBranchNow({
      title: "Keyboard line",
      kindChoiceId: "something-happened",
      period: { kind: "this-week" },
    });
    const svg = document.querySelector(".timeline-svg")!;

    // N starts a branch; Escape sets it down again.
    fireEvent.keyDown(svg, { key: "n" });
    expect(useAppStore.getState().operation).toEqual({ kind: "creating-branch" });
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(useAppStore.getState().operation).toEqual({ kind: "idle" }),
    );

    // I enters Integrate Now; arrow + Enter selects a line; M merges it.
    fireEvent.keyDown(svg, { key: "i" });
    expect(useAppStore.getState().operation).toEqual({ kind: "integrating", branchIds: [] });
    fireEvent.keyDown(svg, { key: "ArrowDown" });
    fireEvent.keyDown(svg, { key: "Enter" });
    await waitFor(() =>
      expect(useAppStore.getState().operation.kind === "integrating").toBe(true),
    );
    expect(
      (useAppStore.getState().operation as { branchIds: string[] }).branchIds,
    ).toHaveLength(1);
    fireEvent.keyDown(svg, { key: "m" });
    await waitFor(() =>
      expect(useAppStore.getState().operation.kind).toBe("merging-branch"),
    );
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
