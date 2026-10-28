import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ChevronRight, MapPin } from "lucide-react";
import type { ComplaintListItem } from "@/lib/complaints";
import { damageLabel, effectiveDamageType, effectiveSeverity } from "@/lib/constants";
import { DemoBadge, SeverityBadge, StatusBadge } from "@/components/badges";

export function CitizenComplaintList({ items }: { items: ComplaintListItem[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card shadow-card">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            to="/app/complaints/$reference"
            params={{ reference: c.reference }}
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/60"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-muted-foreground">{c.reference}</span>
                {c.is_demo ? <DemoBadge /> : null}
                <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "d MMM yyyy")}</span>
              </div>
              <p className="mt-0.5 truncate font-medium">
                <MapPin className="mr-1 inline size-3.5 text-muted-foreground" aria-hidden />
                {c.road_name || c.address || `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`}
              </p>
              <p className="truncate text-sm text-muted-foreground">{damageLabel(effectiveDamageType(c))} · {c.description}</p>
            </div>
            <div className="hidden flex-col items-end gap-1.5 sm:flex">
              <StatusBadge status={c.status} />
              <SeverityBadge severity={effectiveSeverity(c)} />
            </div>
            <div className="sm:hidden"><StatusBadge status={c.status} /></div>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
