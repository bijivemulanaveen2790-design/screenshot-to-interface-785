import { createFileRoute } from "@tanstack/react-router";
import { InspectorList } from "@/components/InspectorList";

export const Route = createFileRoute("/_authenticated/inspector/inspections")({
  head: () => ({ meta: [{ title: "Inspection queue — RoadWatch Inspector" }] }),
  component: () => (
    <InspectorList
      title="Inspection details"
      description="Complaints waiting for inspection or currently under review. Open one to review photos, AI result and location."
      statuses={["Reported", "Under Review"]}
    />
  ),
});
