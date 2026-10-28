import { createFileRoute } from "@tanstack/react-router";
import { InspectorList } from "@/components/InspectorList";

export const Route = createFileRoute("/_authenticated/inspector/resolved")({
  head: () => ({ meta: [{ title: "Resolved complaints — RoadWatch Inspector" }] }),
  component: () => (
    <InspectorList
      title="Resolved complaints"
      description="Repairs confirmed by an inspector with an after-repair photo and resolution note."
      statuses={["Resolved"]}
    />
  ),
});
