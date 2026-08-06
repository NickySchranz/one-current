import { LifeTimeline } from "@/features/life-timeline/LifeTimeline";
import { OperationTray } from "./OperationTray";

/**
 * The timeline is the app's persistent surface. Every operation on a line —
 * creating, touching, inspecting, merging, waiting — happens in a tray anchored
 * over it, so the whole becomes clearer while you work on a part.
 */
export function PersistentTimelineShell() {
  return (
    <>
      <LifeTimeline />
      <OperationTray />
    </>
  );
}
