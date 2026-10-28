import { createFileRoute } from "@tanstack/react-router";
import { InspectorList } from "@/components/InspectorList";

export const Route = createFileRoute("/_authenticated/inspector/complaints/")({
  head: () => ({ meta: [{ title: "All complaints — RoadWatch Inspector" }] }),
  component: () => (
    <InspectorList title="All complaints" description="Search and filter every complaint submitted by citizens." />
  ),
});
