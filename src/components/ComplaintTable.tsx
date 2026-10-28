import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Search, X } from "lucide-react";
import type { ComplaintListItem } from "@/lib/complaints";
import {
  DAMAGE_TYPES,
  SEVERITIES,
  STATUSES,
  damageLabel,
  effectiveDamageType,
  effectiveSeverity,
} from "@/lib/constants";
import { AiStatusBadge, DemoBadge, SeverityBadge, StatusBadge } from "@/components/badges";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface Filters {
  q: string;
  status: string;
  severity: string;
  damage: string;
  from: string;
  to: string;
  demo: boolean;
}

export const EMPTY_FILTERS: Filters = { q: "", status: "all", severity: "all", damage: "all", from: "", to: "", demo: true };

export function applyFilters(items: ComplaintListItem[], f: Filters) {
  const q = f.q.trim().toLowerCase();
  return items.filter((c) => {
    if (!f.demo && c.is_demo) return false;
    if (f.status !== "all" && c.status !== f.status) return false;
    const sev = effectiveSeverity(c);
    if (f.severity !== "all" && (f.severity === "none" ? sev !== null : sev !== f.severity)) return false;
    if (f.damage !== "all" && effectiveDamageType(c) !== f.damage) return false;
    const d = c.created_at.slice(0, 10);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    if (q) {
      const hay = `${c.reference} ${c.road_name ?? ""} ${c.address ?? ""} ${c.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function FilterBar({
  filters,
  setFilters,
  hideStatus,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  hideStatus?: boolean;
}) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters({ ...filters, [k]: v });
  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  return (
    <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4 shadow-card md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden />
        <Input
          aria-label="Search by reference, road name or location"
          placeholder="Reference, road or location"
          className="pl-8"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
        />
      </div>
      {!hideStatus ? (
        <Select value={filters.status} onValueChange={(v) => set("status", v)}>
          <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : null}
      <Select value={filters.severity} onValueChange={(v) => set("severity", v)}>
        <SelectTrigger aria-label="Severity"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All severities</SelectItem>
          {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          <SelectItem value="none">Not assessed</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.damage} onValueChange={(v) => set("damage", v)}>
        <SelectTrigger aria-label="Damage type"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All damage types</SelectItem>
          {DAMAGE_TYPES.map((d) => <SelectItem key={d} value={d}>{damageLabel(d)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input type="date" aria-label="Reported from" value={filters.from} onChange={(e) => set("from", e.target.value)} />
      <Input type="date" aria-label="Reported to" value={filters.to} onChange={(e) => set("to", e.target.value)} />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch id="demo" checked={filters.demo} onCheckedChange={(v) => set("demo", v)} />
          <Label htmlFor="demo" className="text-xs whitespace-nowrap">Demo</Label>
        </div>
        {dirty ? (
          <Button variant="ghost" size="icon" aria-label="Clear filters" onClick={() => setFilters(EMPTY_FILTERS)}>
            <X />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ComplaintTable({ items }: { items: ComplaintListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Reference</th>
            <th className="px-4 py-2.5 font-semibold">Location</th>
            <th className="px-4 py-2.5 font-semibold">Damage</th>
            <th className="px-4 py-2.5 font-semibold">Severity</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
            <th className="px-4 py-2.5 font-semibold">Reported</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((c) => (
            <tr key={c.id} className="hover:bg-muted/40">
              <td className="px-4 py-3 align-top">
                <Link
                  to="/inspector/complaints/$reference"
                  params={{ reference: c.reference }}
                  className="font-mono text-xs font-semibold underline decoration-primary decoration-2 underline-offset-4"
                >
                  {c.reference}
                </Link>
                {c.is_demo ? <div className="mt-1"><DemoBadge /></div> : null}
              </td>
              <td className="max-w-64 px-4 py-3 align-top">
                <p className="truncate font-medium">{c.road_name || "Unnamed road"}</p>
                <p className="truncate text-xs text-muted-foreground">{c.address || `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`}</p>
              </td>
              <td className="px-4 py-3 align-top">
                <p>{damageLabel(effectiveDamageType(c))}</p>
                <AiStatusBadge status={c.ai_status} />
              </td>
              <td className="px-4 py-3 align-top">
                <SeverityBadge severity={effectiveSeverity(c)} ai={!c.severity && !!c.ai_severity} />
                {c.ai_confidence != null ? (
                  <p className="mt-1 text-xs text-muted-foreground">AI {Math.round(c.ai_confidence * 100)}%</p>
                ) : null}
              </td>
              <td className="px-4 py-3 align-top"><StatusBadge status={c.status} /></td>
              <td className="px-4 py-3 align-top text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(c.created_at), "d MMM yyyy, HH:mm")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function useFilteredComplaints(items: ComplaintListItem[], initial: Partial<Filters> = {}) {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, ...initial });
  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);
  return { filters, setFilters, filtered };
}
