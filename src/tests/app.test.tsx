import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import App from "@/App";
import { repo } from "@/db/repository";
import { useAppStore } from "@/stores/app-store";
import { suggestLockedFeelings } from "@/domain/feelings/logic";

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
    view: { kind: "now" },
    operation: { kind: "idle" },
    reducedMotion: false,
  });
});

async function renderReady() {
  render(<App />);
  await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
}

describe("app flows", () => {
  it("lands in Now with the timeline and exactly three destinations", async () => {
    await renderReady();
    expect(useAppStore.getState().view).toEqual({ kind: "now" });
    expect(document.querySelector(".timeline-svg")).toBeTruthy();
    for (const name of ["Now", "History", "More"]) {
      expect(screen.getAllByRole("button", { name }).length).toBeGreaterThan(0);
    }
    expect(screen.queryByRole("button", { name: "Branches" })).toBeFalsy();
    expect(screen.queryByRole("button", { name: "Settings" })).toBeFalsy();
  });

  it("creates a thread in one compact screen", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "New thread" }));

    const input = await screen.findByLabelText("Name the thread");
    fireEvent.change(input, { target: { value: "Career direction" } });
    // "Today" is the default; the pull sits at 3 — nothing else is required.
    fireEvent.click(screen.getByRole("button", { name: "Start the thread" }));

    await waitFor(() => expect(useAppStore.getState().branches).toHaveLength(1));
    expect(useAppStore.getState().branches[0].title).toBe("Career direction");
    expect(await screen.findByText(/Thread started/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Return to timeline" }));
    expect(useAppStore.getState().operation).toEqual({ kind: "idle" });
    expect(useAppStore.getState().view).toEqual({ kind: "now" });
  });

  it("derives what a thread draws on from the feelings it invokes", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "New thread" }));
    fireEvent.change(await screen.findByLabelText("Name the thread"), {
      target: { value: "The unread letter" },
    });
    // Tap what it makes you feel — not what it holds.
    fireEvent.click(screen.getByRole("button", { name: "worry" }));
    expect(screen.getByText(/While it stays open, it may draw on/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start the thread" }));

    await waitFor(() => expect(useAppStore.getState().branches).toHaveLength(1));
    const created = useAppStore.getState().branches[0];
    expect(created.anxieties).toEqual(["worry"]);
    expect(created.occupies).toEqual(suggestLockedFeelings(["worry"]));
    expect(created.occupies!.length).toBeGreaterThan(0);
  });

  it("routes from the post-create panel straight into one action", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "New thread" }));
    fireEvent.change(await screen.findByLabelText("Name the thread"), {
      target: { value: "Visa decision" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start the thread" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add one action" }));

    fireEvent.change(await screen.findByLabelText("The smallest honest step"), {
      target: { value: "Send the one email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Place it on today" }));
    await waitFor(() => expect(useAppStore.getState().actions).toHaveLength(1));
    expect(useAppStore.getState().actions[0].title).toBe("Send the one email");
    expect(await screen.findByText("Action added to your main line.")).toBeTruthy();
  });

  it("shows the screen-reader timeline summary", async () => {
    await renderReady();
    await useAppStore.getState().createBranchNow({
      title: "Lost fitness",
      kindChoiceId: "body",
      period: { kind: "this-month" },
      pull: 4,
    });
    await waitFor(() => {
      const status = screen.getAllByRole("status")[0];
      expect(status.textContent).toContain("One active thread reaches today.");
      expect(status.textContent).toContain("Lost fitness");
    });
  });

  it("respects reduced motion via the data attribute", async () => {
    await renderReady();
    useAppStore.getState().setReducedMotion(true);
    await waitFor(() =>
      expect(document.documentElement.dataset.reducedMotion).toBe("true"),
    );
  });

  it("opens a non-modal quick menu at the endpoint and switches context on the next tap", async () => {
    await renderReady();
    const first = await useAppStore.getState().createBranchNow({
      title: "Move abroad",
      kindChoiceId: "feared-future",
      period: { kind: "this-week" },
    });
    const second = await useAppStore.getState().createBranchNow({
      title: "Old friendship",
      kindChoiceId: "relationship",
      period: { kind: "this-month" },
    });

    fireEvent.click(document.querySelector(`g[data-branch-id="${first.id}"] .branch-endpoint`)!);
    await waitFor(() =>
      expect(useAppStore.getState().operation).toEqual({ kind: "quick-touch", branchId: first.id }),
    );

    // A light tray, not a dialog: no backdrop, the timeline stays interactive.
    expect(document.querySelector(".quick-tray")).toBeTruthy();
    expect(document.querySelector(".sheet-backdrop")).toBeFalsy();
    expect(document.querySelector("[aria-modal='true']")).toBeFalsy();
    expect(document.querySelector(".timeline-svg")).toBeTruthy();
    expect(screen.getByText("What does this thread need from you now?")).toBeTruthy();

    // Tapping another endpoint switches the tray to that branch.
    fireEvent.click(document.querySelector(`g[data-branch-id="${second.id}"] .branch-endpoint`)!);
    await waitFor(() =>
      expect(useAppStore.getState().operation).toEqual({
        kind: "quick-touch",
        branchId: second.id,
      }),
    );
  });

  it("offers the four decisions plus a quieter understanding", async () => {
    await renderReady();
    const branch = await useAppStore.getState().createBranchNow({
      title: "Visa decision",
      kindChoiceId: "outside-control",
      period: { kind: "this-week" },
    });
    useAppStore.getState().setOperation({ kind: "quick-touch", branchId: branch.id });

    expect(await screen.findByText("Take one small step.")).toBeTruthy();
    expect(screen.getByText("Stop carrying what cannot move yet.")).toBeTruthy();
    expect(
      screen.getByText("Bring back what still matters."),
    ).toBeTruthy();
    expect(screen.getByText("Add what just happened.")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Can't do anything about it now/ }),
    ).toBeTruthy();

    // Understanding is the deep view — the only place that becomes a dialog.
    fireEvent.click(screen.getByRole("button", { name: "Understand this thread" }));
    await waitFor(() =>
      expect(useAppStore.getState().operation).toEqual({
        kind: "understanding",
        branchId: branch.id,
      }),
    );
    expect(document.querySelector("[aria-modal='true']")).toBeTruthy();
    expect(document.querySelector(".sheet-backdrop")).toBeTruthy();
  });

  it("places a branch in waiting with exactly three inputs", async () => {
    await renderReady();
    const branch = await useAppStore.getState().createBranchNow({
      title: "Waiting for the permit",
      kindChoiceId: "waiting",
      period: { kind: "this-week" },
    });
    useAppStore.getState().setOperation({ kind: "quick-wait", branchId: branch.id });

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    fireEvent.change(await screen.findByLabelText("What are you waiting for?"), {
      target: { value: "The permit decision" },
    });
    fireEvent.change(screen.getByLabelText("What have you already done?"), {
      target: { value: "Application submitted" },
    });
    fireEvent.change(screen.getByLabelText("When will you check again?"), {
      target: { value: tomorrow },
    });
    fireEvent.click(screen.getByRole("button", { name: "Begin waiting" }));

    await waitFor(() => expect(useAppStore.getState().waiting).toHaveLength(1));
    expect(useAppStore.getState().waiting[0].awaiting).toBe("The permit decision");
    expect(
      await screen.findByText("Nothing further is required from you until the review point."),
    ).toBeTruthy();
  });

  it("shows a waiting line's review point on the timeline", async () => {
    await renderReady();
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

  it("asks what is true about the branch before any merge analysis", async () => {
    await renderReady();
    const branch = await useAppStore.getState().createBranchNow({
      title: "Old flat decision",
      kindChoiceId: "something-happened",
      period: { kind: "this-month" },
      pull: 3,
    });
    useAppStore.getState().setOperation({ kind: "quick-merge", branchId: branch.id });

    expect(await screen.findByText("What is true about this thread now?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /It is resolved/ }));
    await waitFor(() =>
      expect(useAppStore.getState().operation).toEqual({
        kind: "confirming-merge",
        branchIds: [branch.id],
      }),
    );
    expect(useAppStore.getState().mergeDraft).toBeTruthy();
  });

  it("eases a line you can do nothing about, without entering merge", async () => {
    await renderReady();
    const branch = await useAppStore.getState().createBranchNow({
      title: "Visa decision",
      kindChoiceId: "outside-control",
      period: { kind: "this-week" },
      pull: 4,
    });
    useAppStore.getState().setOperation({ kind: "quick-touch", branchId: branch.id });
    fireEvent.click(
      await screen.findByRole("button", { name: /Can't do anything about it now/ }),
    );
    await waitFor(() => expect(useAppStore.getState().branches[0].pull).toBeLessThan(4));
    expect(await screen.findByText(/Nothing can be done about it right now/)).toBeTruthy();
    // The line is still open — nothing was merged.
    expect(useAppStore.getState().merges).toHaveLength(0);
  });

  it("merge only offers endings: resolved, its own task, or moved past", async () => {
    await renderReady();
    const branch = await useAppStore.getState().createBranchNow({
      title: "Old argument",
      kindChoiceId: "something-happened",
      period: { kind: "this-month" },
      pull: 4,
    });
    useAppStore.getState().setOperation({ kind: "quick-merge", branchId: branch.id });

    expect(await screen.findByText("What is true about this thread now?")).toBeTruthy();
    const outcomes = document.querySelectorAll(".quick-menu-item");
    expect(outcomes).toHaveLength(3);
    expect(screen.queryByText(/It cannot move yet/)).toBeFalsy();
    expect(screen.queryByText(/not sure yet/)).toBeFalsy();

    fireEvent.click(screen.getByRole("button", { name: /I have moved past it/ }));
    await waitFor(() => expect(useAppStore.getState().merges).toHaveLength(1));
    const state = useAppStore.getState();
    expect(state.branches[0].status).toBe("merged");
    expect(state.merges[0].resolution).toBe("Moved past it");
    expect(state.operation).toEqual({ kind: "idle" });
  });

  it("previews a merge as a reversible curve toward Now", async () => {
    await renderReady();
    const branch = await useAppStore.getState().createBranchNow({
      title: "Unsent letter",
      kindChoiceId: "something-happened",
      period: { kind: "this-month" },
      pull: 3,
    });

    await useAppStore.getState().startMerge([branch.id]);
    await waitFor(() => expect(document.querySelector(".merge-preview")).toBeTruthy());
    expect(document.querySelector(".timeline-svg")).toBeTruthy();
    expect(document.querySelector(".operation-tray")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Set aside for now" }));
    await waitFor(() => expect(document.querySelector(".merge-preview")).toBeFalsy());
    expect(useAppStore.getState().branches[0].status).not.toBe("merged");
    expect(useAppStore.getState().operation).toEqual({ kind: "idle" });
  });

  it("compares fork with Now and sorts parts into destinations, in place", async () => {
    await renderReady();
    const branch = await useAppStore.getState().createBranchNow({
      title: "Old friendship",
      kindChoiceId: "relationship",
      period: { kind: "this-month" },
      pull: 3,
    });
    useAppStore.getState().setOperation({ kind: "understanding", branchId: branch.id });

    // The timeline stays mounted behind the focused view.
    await waitFor(() => expect(document.querySelector(".operation-tray")).toBeTruthy());
    expect(document.querySelector(".timeline-svg")).toBeTruthy();

    fireEvent.click(screen.getByText("Compare where it began with Now (optional)"));
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

    fireEvent.click(screen.getByText("Where should each part go? (optional)"));
    fireEvent.change(screen.getByLabelText(/Needs a real action/), {
      target: { value: "Write the birthday message" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Make it today's action" }));
    await waitFor(() => expect(useAppStore.getState().actions).toHaveLength(1));
    expect(useAppStore.getState().actions[0].title).toBe("Write the birthday message");
    expect(await screen.findByText(/Placed on today/)).toBeTruthy();
  });

  it("continues the main line past Now while today's action is open", async () => {
    await renderReady();
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

  it("keeps an action and 'nothing can be done' mutually exclusive", async () => {
    await renderReady();
    const today = new Date().toISOString().slice(0, 10);
    const branch = await useAppStore.getState().createBranchNow({
      title: "Old apartment worry",
      kindChoiceId: "something-happened",
      period: { kind: "this-week" },
    });

    // The wholeness chip scores the split; a decision moves it to the better side.
    const wordBefore = document.querySelector(".frag-word")?.textContent;

    // A planned action, then "nothing can be done": the action is withdrawn.
    await useAppStore.getState().createTodayAction(branch.id, "Call the landlord");
    expect(useAppStore.getState().actions).toHaveLength(1);
    await waitFor(() =>
      expect(document.querySelector(".frag-word")?.textContent).not.toBe(wordBefore),
    );
    expect(document.querySelector(".frag-word")?.textContent).toBe("whole");
    await useAppStore.getState().easeBranch(branch.id, { leftOn: today });
    expect(useAppStore.getState().actions).toHaveLength(0);
    expect(useAppStore.getState().branches[0].leftOn).toBe(today);
    // The resting line carries no label on the timeline.
    const labels = [...document.querySelectorAll(".branch-label")].map((n) => n.textContent);
    expect(labels.some((t) => t?.includes("Old apartment worry"))).toBe(false);

    // Deciding an action afterwards lifts the resting state again.
    await useAppStore.getState().createTodayAction(branch.id, "Call the landlord");
    expect(useAppStore.getState().actions).toHaveLength(1);
    expect(useAppStore.getState().branches[0].leftOn).toBeUndefined();
  });

  it("drives the timeline from the keyboard", async () => {
    await renderReady();
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

    // Arrow + Enter opens the quick menu; a letter chooses the decision.
    fireEvent.keyDown(svg, { key: "ArrowDown" });
    fireEvent.keyDown(svg, { key: "Enter" });
    await waitFor(() =>
      expect(useAppStore.getState().operation.kind).toBe("quick-touch"),
    );
    fireEvent.keyDown(window, { key: "w" });
    await waitFor(() =>
      expect(useAppStore.getState().operation.kind).toBe("quick-wait"),
    );
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(useAppStore.getState().operation).toEqual({ kind: "idle" }),
    );
  });

  it("never fires shortcut letters while typing", async () => {
    await renderReady();
    const branch = await useAppStore.getState().createBranchNow({
      title: "Visa decision",
      kindChoiceId: "outside-control",
      period: { kind: "this-week" },
    });
    useAppStore.getState().setOperation({ kind: "quick-touch", branchId: branch.id });
    await screen.findByRole("complementary");

    // A letter outside any field chooses Act.
    fireEvent.keyDown(window, { key: "a" });
    await waitFor(() =>
      expect(useAppStore.getState().operation).toEqual({
        kind: "quick-act",
        branchId: branch.id,
      }),
    );

    // The same letters typed into the step field stay letters.
    const step = await screen.findByLabelText("The smallest honest step");
    fireEvent.keyDown(step, { key: "w" });
    expect(useAppStore.getState().operation.kind).toBe("quick-act");
  });

  it("names feelings without counting them anywhere in Now", async () => {
    await renderReady();
    const branch = await useAppStore.getState().createBranchNow({
      title: "Old flat decision",
      kindChoiceId: "something-happened",
      period: { kind: "this-month" },
      pull: 3,
    });
    await useAppStore.getState().updateBranch(branch.id, { occupies: ["calm", "sleep"] });
    useAppStore.getState().setOperation({ kind: "idle" });

    // Timeline: no totals, no percentages, no permanent legend.
    expect(screen.queryByText(/of \d+ feelings/)).toBeFalsy();
    expect(document.body.textContent).not.toContain("%");
    expect(screen.queryByText(/solid = active/)).toBeFalsy();
  });

  it("keeps the legend folded behind Help, without a keyboard map", async () => {
    await renderReady();
    await useAppStore.getState().createBranchNow({
      title: "Lost fitness",
      kindChoiceId: "body",
      period: { kind: "this-month" },
    });
    useAppStore.getState().setOperation({ kind: "idle" });

    expect(screen.queryByText(/solid = active/)).toBeFalsy();
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(await screen.findByText(/solid = active/)).toBeTruthy();
    expect(screen.getByText(/pinch sideways = zoom time/)).toBeTruthy();
    // Phone-only: the keyboard cheatsheet is gone from the legend.
    expect(screen.queryByText(/N = add branch/)).toBeFalsy();
  });

  it("reviews the past in History with filter chips", async () => {
    await renderReady();
    fireEvent.click(screen.getAllByRole("button", { name: "History" })[0]);
    expect(await screen.findByRole("group", { name: "Recent days" })).toBeTruthy();
    expect(screen.getByText(/Nothing was recorded on this day/)).toBeTruthy();

    // Chips narrow the review to one kind of record; the day header stays.
    fireEvent.click(screen.getByRole("button", { name: "Brought back" }));
    expect(await screen.findByText("Everything brought back")).toBeTruthy();
    expect(screen.queryByText(/Nothing was recorded on this day/)).toBeFalsy();
    expect(screen.getByRole("group", { name: "Recent days" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Everything" }));
    expect(await screen.findByText(/Nothing was recorded on this day/)).toBeTruthy();
  });
});
