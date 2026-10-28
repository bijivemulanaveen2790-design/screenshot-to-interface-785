import { createFileRoute } from "@tanstack/react-router";
import { InspectorList } from "@/components/InspectorList";

export const Route = createFileRoute("/_authenticated/inspector/repairs")({
  head: () => ({ meta: [{ title: "Repair updates — RoadWatch Inspector" }] }),
  component: () => (
    <InspectorList
      title="Repair updates"
      description="Repairs in progress. Open a complaint to post updates, upload after-repair photos and resolve it."
      statuses={["In Progress"]}
    />
  ),
});
