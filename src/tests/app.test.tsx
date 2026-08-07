import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import App from "@/App";
import { repo } from "@/db/repository";
import { useAppStore } from "@/stores/app-store";
import { suggestLockedFeelings } from "@/domain/feelings/logic";
import { appNow, setSkewMs } from "@/domain/time/clock";

beforeEach(async () => {
  cleanup();
  await repo.deleteEverything();
  // Fast-forward skew must never leak from one test into the next.
  setSkewMs(0);
  useAppStore.setState({
    ready: false,
    branches: [],
    merges: [],
    actions: [],
    mergeDraft: undefined,
    view: { kind: "now" },
    operation: { kind: "idle" },
    reducedMotion: false,
    nowTick: appNow().getTime(),
    timeSkewMs: 0,
    timeRate: 1,
  });
});

async function renderReady() {
  render(<App />);
  await waitFor(() => expect(useAppStore.getState().ready).toBe(true));
}

describe("app flows", () => {
  it("lands in Now with the timeline and its destinations", async () => {
    await renderReady();
    expect(useAppStore.getState().view).toEqual({ kind: "now" });
    expect(document.querySelector(".timeline-svg")).toBeTruthy();
    for (const name of ["Now", "Actions", "History", "More"]) {
      expect(screen.getAllByRole("button", { name }).length).toBeGreaterThan(0);
    }
    expect(screen.queryByRole("button", { name: "Branches" })).toBeFalsy();
    expect(screen.queryByRole("button", { name: "Settings" })).toBeFalsy();
  });

  it("walks the day thread by thread: undecided prompts, steps, and what settled", async () => {
    await renderReady();
    const store = useAppStore.getState();
    const decided = await store.createBranchNow({
      title: "Visa decision",
      kindChoiceId: "feared-future",
      period: { kind: "today" },
      loudness: 3,
    });
    await useAppStore.getState().createTodayAction(decided.id, "Send the one email");
    const idle = await useAppStore.getState().createBranchNow({
      title: "The unread letter",
      kindChoiceId: "feared-future",
      period: { kind: "today" },
      loudness: 2,
    });

    // The Actions destination opens the panel over the timeline.
    fireEvent.click(screen.getAllByRole("button", { name: "Actions" })[0]);
    expect(useAppStore.getState().operation).toEqual({ kind: "viewing-actions" });
    expect(await screen.findByText("Your threads today")).toBeTruthy();

    // The thread without a decision asks for one; tapping it opens its menu.
    expect(screen.getByText("Still undecided today")).toBeTruthy();
    expect(screen.getByText("The unread letter", { selector: "strong" })).toBeTruthy();
    // The panel row (not the SVG label) carries the planned step.
    expect(screen.getByText("Send the one email", { selector: "strong" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(useAppStore.getState().actions[0].completedAt).toBeTruthy(),
    );
    // The step joins the day's record; its thread stays as decided today.
    expect(screen.getByText(/✓ Send the one email/, { selector: "strong" })).toBeTruthy();
    expect(screen.getByText("You decided what this needs today.")).toBeTruthy();

    // Prompt rows route into the quick menu.
    fireEvent.click(screen.getByText("The unread letter", { selector: "strong" }));
    expect(useAppStore.getState().operation).toEqual({
      kind: "quick-touch",
      branchId: idle.id,
    });
  });

  it("keeps integrated threads out of the actions panel", async () => {
    await renderReady();
    const branch = await useAppStore.getState().createBranchNow({
      title: "Old worry",
      kindChoiceId: "feared-future",
      period: { kind: "today" },
      loudness: 2,
    });
    await useAppStore.getState().updateBranch(branch.id, {
      status: "merged",
      mergeDate: new Date().toISOString().slice(0, 10),
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Actions" })[0]);
    expect(await screen.findByText("Your threads today")).toBeTruthy();
    expect(screen.queryByText("Old worry", { selector: "strong" })).toBeFalsy();
    expect(screen.getByText(/Nothing is open right now/)).toBeTruthy();
  });

  it("creates a thread in one compact screen", async () => {
    await renderReady();
    fireEvent.click(screen.getAllByRole("button", { name: "New thread" })[0]);

    const input = await screen.findByLabelText("Name the thread");
    fireEvent.change(input, { target: { value: "Career direction" } });
    // "Today" is the default; the loudness sits at 3 — nothing else is required.
    fireEvent.click(screen.getByRole("button", { name: "Start the thread" }));

    await waitFor(() => expect(useAppStore.getState().branches).toHaveLength(1));
    const created = useAppStore.getState().branches[0];
    expect(created.title).toBe("Career direction");
    // No detour: the new thread is focused and its regular quick menu opens.
    await waitFor(() =>
      expect(useAppStore.getState().operation).toEqual({
        kind: "quick-touch",
        branchId: created.id,
      }),
    );
    expect(await screen.findByText("What does this thread need from you now?")).toBeTruthy();
    expect(useAppStore.getState().view).toEqual({ kind: "now" });
  });

  it("derives what a thread draws on from the feelings it invokes", async () => {
    await renderReady();
    fireEvent.click(screen.getAllByRole("button", { name: "New thread" })[0]);
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

  it("routes from the post-create quick menu straight into one action", async () => {
    await renderReady();
    fireEvent.click(screen.getAllByRole("button", { name: "New thread" })[0]);
    fireEvent.change(await screen.findByLabelText("Name the thread"), {
      target: { value: "Visa decision" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start the thread" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /What does this thread need from you now\?/ }),
    );
    fireEvent.click(await screen.findByRole("button", { name: /^Act Take one small step/ }));

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
      loudness: 4,
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

  it("offers the three decisions plus a quieter understanding", async () => {
    await renderReady();
    const branch = await useAppStore.getState().createBranchNow({
      title: "Visa decision",
      kindChoiceId: "outside-control",
      period: { kind: "this-week" },
    });
    useAppStore.getState().setOperation({ kind: "quick-touch", branchId: branch.id });

    // The sheet opens as a peek: the slider first, the decisions folded away.
    expect(
      await screen.findByRole("slider", { name: "How loud is this thread right now?" }),
    ).toBeTruthy();
    expect(screen.queryByText("Take one small step.")).toBeFalsy();
    fireEvent.click(
      screen.getByRole("button", { name: /What does this thread need from you now\?/ }),
    );

    expect(await screen.findByText("Take one small step.")).toBeTruthy();
    expect(
      screen.getByText("Fold what it gave you back into your one line."),
    ).toBeTruthy();
    expect(screen.getByText("Add what just happened.")).toBeTruthy();
    // Waiting is not offered here — the menu stays about what moves things.
    expect(screen.queryByRole("button", { name: /^Wait/ })).toBeFalsy();
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

  it("asks what is true about the branch before any merge analysis", async () => {
    await renderReady();
    const branch = await useAppStore.getState().createBranchNow({
      title: "Old flat decision",
      kindChoiceId: "something-happened",
      period: { kind: "this-month" },
      loudness: 3,
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
      loudness: 4,
    });
    useAppStore.getState().setOperation({ kind: "quick-touch", branchId: branch.id });
    fireEvent.click(
      await screen.findByRole("button", { name: /What does this thread need from you now\?/ }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /Can't do anything about it now/ }),
    );
    await waitFor(() => expect(useAppStore.getState().branches[0].loudness).toBeLessThan(4));
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
      loudness: 4,
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
      loudness: 3,
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
      loudness: 3,
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
    fireEvent.keyDown(window, { key: "m" });
    await waitFor(() =>
      expect(useAppStore.getState().operation.kind).toBe("quick-merge"),
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
      loudness: 3,
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
    // Time never zooms: moving around is drag/scroll only, faster along the dates.
    expect(screen.getByText(/drag or scroll sideways = move through time/)).toBeTruthy();
    expect(screen.queryByText(/zoom/)).toBeFalsy();
    // Phone-only: the keyboard cheatsheet is gone from the legend.
    expect(screen.queryByText(/N = add branch/)).toBeFalsy();
  });

  it("reviews the past in History with filter chips", async () => {
    await renderReady();
    fireEvent.click(screen.getAllByRole("button", { name: "History" })[0]);
    expect(await screen.findByRole("group", { name: "Recent days" })).toBeTruthy();
    expect(screen.getByText(/Nothing was recorded on this day/)).toBeTruthy();

    // Chips narrow the review to one kind of record; the day header stays.
    fireEvent.click(screen.getByRole("button", { name: "Integrated" }));
    expect(await screen.findByText("Everything integrated")).toBeTruthy();
    expect(screen.queryByText(/Nothing was recorded on this day/)).toBeFalsy();
    expect(screen.getByRole("group", { name: "Recent days" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Everything" }));
    expect(await screen.findByText(/Nothing was recorded on this day/)).toBeTruthy();
  });
});

const DAY = 24 * 60 * 60 * 1000;

async function createThread(title: string, loudness = 3) {
  return useAppStore.getState().createBranchNow({
    title,
    kindChoiceId: "feared-future",
    period: { kind: "today" },
    loudness: loudness as 1 | 2 | 3 | 4 | 5,
  });
}

describe("living time and loudness", () => {
  it("fast-forward moves the app's clock and recenters the window; reset returns", async () => {
    await renderReady();
    const before = useAppStore.getState();
    useAppStore.getState().fastForward(3 * DAY);
    const after = useAppStore.getState();
    expect(after.timeSkewMs).toBe(3 * DAY);
    expect(after.nowTick - before.nowTick).toBeGreaterThanOrEqual(3 * DAY);
    expect(Date.parse(after.window!.end)).toBeGreaterThan(Date.parse(before.window!.end));

    useAppStore.getState().resetTimeSkew();
    expect(useAppStore.getState().timeSkewMs).toBe(0);
  });

  it("time can run faster than real time, and the camera drifts with it", async () => {
    await renderReady();
    useAppStore.getState().setTimeRate(86400);
    expect(useAppStore.getState().timeRate).toBe(86400);

    // Simulate one refresh after a day of app time has streamed by.
    useAppStore.setState({ nowTick: useAppStore.getState().nowTick - DAY });
    const before = useAppStore.getState().window!;
    useAppStore.getState().refreshNow();
    const after = useAppStore.getState().window!;
    expect(Date.parse(after.end) - Date.parse(before.end)).toBeGreaterThanOrEqual(DAY);
    expect(Date.parse(after.start) - Date.parse(before.start)).toBeGreaterThanOrEqual(DAY);

    useAppStore.getState().resetTimeSkew();
    expect(useAppStore.getState().timeRate).toBe(1);
  });

  it("a loud thread slithers; days without decisions make it louder; a decision stills it", async () => {
    await renderReady();
    const b = await createThread("The unpaid bill", 1);
    // Skip the birth animation — a just-born line never trembles.
    useAppStore.getState().clearBorn();
    await waitFor(() => expect(document.querySelector(".branch-line")).toBeTruthy());
    // Quiet (loudness 1): no tremor group.
    expect(document.querySelector(".branch-tremor")).toBeFalsy();

    await useAppStore.getState().updateBranch(b.id, { loudness: 2 });
    await waitFor(() => expect(document.querySelector(".branch-tremor")).toBeTruthy());
    expect(
      (document.querySelector(".branch-tremor") as SVGGElement).getAttribute("data-loudness"),
    ).toBe("2");

    // Two undecided days later it sounds louder (2 base + 2 drift).
    useAppStore.getState().fastForward(2 * DAY);
    await waitFor(() => {
      const g = document.querySelector(".branch-tremor") as SVGGElement | null;
      expect(g).toBeTruthy();
      expect(g!.getAttribute("data-loudness")).toBe("4");
    });

    // Leaving it for today is a decision: the line rests, perfectly still.
    await useAppStore.getState().easeBranch(b.id, {});
    await waitFor(() => expect(document.querySelector(".branch-tremor")).toBeFalsy());
    // And the decision eased the stored level one step.
    expect(useAppStore.getState().branches[0].loudness).toBe(1);
  });

  it("press a thread and slide up: loudness dials in steps and commits on release", async () => {
    await renderReady();
    const b = await createThread("The clinic call", 1);
    await waitFor(() => expect(document.querySelector(".branch-hit")).toBeTruthy());
    const hit = document.querySelector(".branch-hit")!;
    const svg = document.querySelector(".timeline-svg")!;

    fireEvent.pointerDown(hit, { pointerId: 1, clientX: 200, clientY: 300 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 203, clientY: 224 }); // ~2 steps up
    // The floating chip reads the level live.
    expect(document.querySelector(".loudness-chip")).toBeTruthy();
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 203, clientY: 224 });

    await waitFor(() =>
      expect(useAppStore.getState().branches.find((x) => x.id === b.id)?.loudness).toBe(3),
    );
    // Adjusting is a touch, not a decision: no menu opened, no decision recorded.
    expect(useAppStore.getState().operation).toEqual({ kind: "idle" });
    expect(useAppStore.getState().branches[0].lastDecisionOn).toBeUndefined();
    expect(document.querySelector(".loudness-chip")).toBeFalsy();
  });

  it("a plain tap still opens the quick menu; a horizontal drag still pans", async () => {
    await renderReady();
    const b = await createThread("The move");
    await waitFor(() => expect(document.querySelector(".branch-hit")).toBeTruthy());
    const hit = document.querySelector(".branch-hit")!;
    const svg = document.querySelector(".timeline-svg")!;

    // Horizontal drag from the thread: time pans, nothing committed.
    const startWindow = useAppStore.getState().window;
    fireEvent.pointerDown(hit, { pointerId: 2, clientX: 200, clientY: 300 });
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 260, clientY: 303 });
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 320, clientY: 303 });
    fireEvent.pointerUp(svg, { pointerId: 2, clientX: 320, clientY: 303 });
    expect(Date.parse(useAppStore.getState().window!.start)).toBeLessThan(
      Date.parse(startWindow!.start),
    );
    expect(useAppStore.getState().branches[0].loudness).toBe(3); // untouched

    // A plain tap opens the quick menu as before.
    fireEvent.pointerDown(hit, { pointerId: 3, clientX: 200, clientY: 300 });
    fireEvent.pointerUp(svg, { pointerId: 3, clientX: 200, clientY: 300 });
    fireEvent.click(hit);
    expect(useAppStore.getState().operation).toEqual({ kind: "quick-touch", branchId: b.id });
  });

  it("the quick menu slider sets the loudness for keyboard hands", async () => {
    await renderReady();
    const b = await createThread("The lease");
    useAppStore.getState().setOperation({ kind: "quick-touch", branchId: b.id });
    const slider = await screen.findByRole("slider", {
      name: "How loud is this thread right now?",
    });
    fireEvent.change(slider, { target: { value: "4" } });
    await waitFor(() =>
      expect(useAppStore.getState().branches.find((x) => x.id === b.id)?.loudness).toBe(4),
    );

    // A decision today settles the loudness: the dial steps away until tomorrow.
    await useAppStore.getState().easeBranch(b.id, {});
    useAppStore.getState().setOperation({ kind: "idle" });
    useAppStore.getState().setOperation({ kind: "quick-touch", branchId: b.id });
    await screen.findByText("What does this thread need from you now?");
    expect(
      screen.queryByRole("slider", { name: "How loud is this thread right now?" }),
    ).toBeFalsy();
  });

  it("pulling the dial down genuinely quiets a line that had drifted louder", async () => {
    await renderReady();
    const b = await createThread("The inbox", 2);
    useAppStore.getState().clearBorn();
    useAppStore.getState().fastForward(3 * DAY);
    useAppStore.getState().setOperation({ kind: "quick-touch", branchId: b.id });

    // The dial shows the loudness as felt today, drift included.
    const slider = await screen.findByRole("slider", {
      name: "How loud is this thread right now?",
    });
    expect(Number((slider as HTMLInputElement).value)).toBe(5); // 2 base + 3 days
    await screen.findByText("Undecided days have made it louder.");

    // Pulling it to the bottom re-anchors the drift: the line falls still.
    fireEvent.change(slider, { target: { value: "1" } });
    await waitFor(() =>
      expect(useAppStore.getState().branches.find((x) => x.id === b.id)?.loudness).toBe(1),
    );
    await waitFor(() => expect(document.querySelector(".branch-tremor")).toBeFalsy());
    expect(screen.queryByText("Undecided days have made it louder.")).toBeFalsy();
    // A touch, not a decision.
    expect(useAppStore.getState().branches[0].lastDecisionOn).toBeUndefined();
  });

  it("a tap outside an open panel only closes it — nothing underneath activates", async () => {
    await renderReady();
    const b = await createThread("The visa");
    useAppStore.getState().setOperation({ kind: "quick-touch", branchId: b.id });
    await screen.findByText("What does this thread need from you now?");

    // Tap lands on the Actions nav button: the panel closes, Actions stays shut.
    const actionsBtn = screen.getAllByRole("button", { name: "Actions" })[0];
    fireEvent.pointerDown(actionsBtn, { pointerId: 7, clientX: 40, clientY: 700 });
    fireEvent.pointerUp(actionsBtn, { pointerId: 7, clientX: 40, clientY: 700 });
    fireEvent.click(actionsBtn);
    expect(useAppStore.getState().operation).toEqual({ kind: "idle" });

    // The next tap is free: now Actions opens.
    fireEvent.click(actionsBtn);
    expect(useAppStore.getState().operation).toEqual({ kind: "viewing-actions" });
  });

  it("demonfire turns open threads into dragon heads; other themes keep circles", async () => {
    await renderReady();
    await createThread("The old rivalry");
    await waitFor(() => expect(document.querySelector(".branch-endpoint")).toBeTruthy());
    expect(document.querySelector(".dragon-head")).toBeFalsy();

    useAppStore.getState().setTheme("demonfire");
    await waitFor(() => expect(document.querySelector(".dragon-head")).toBeTruthy());

    useAppStore.getState().setTheme("riverbed");
    await waitFor(() => expect(document.querySelector(".dragon-head")).toBeFalsy());
  });
});
