import { cva } from "class-variance-authority";
import { CheckCircle2, CircleDot, Hammer, Search, Sparkles, CircleSlash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComplaintStatus, Severity } from "@/lib/constants";

const statusVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      status: {
        Reported: "border-status-reported/30 bg-status-reported/10 text-status-reported",
        "Under Review": "border-status-review/35 bg-status-review/12 text-status-review",
        "In Progress": "border-status-progress/30 bg-status-progress/10 text-status-progress",
        Resolved: "border-status-resolved/30 bg-status-resolved/12 text-status-resolved",
      },
    },
  },
);

const STATUS_ICON = {
  Reported: CircleDot,
  "Under Review": Search,
  "In Progress": Hammer,
  Resolved: CheckCircle2,
} as const;

export function StatusBadge({ status, className }: { status: ComplaintStatus; className?: string }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={cn(statusVariants({ status }), className)}>
      <Icon className="size-3.5" aria-hidden />
      {status}
    </span>
  );
}

const severityVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      severity: {
        Low: "bg-sev-low/14 text-sev-low",
        Medium: "bg-sev-medium/20 text-foreground",
        High: "bg-sev-high/16 text-sev-high",
        Critical: "bg-sev-critical text-destructive-foreground",
        none: "bg-muted text-muted-foreground",
      },
    },
  },
);

export function SeverityBadge({
  severity,
  ai,
  className,
}: {
  severity: Severity | null;
  ai?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(severityVariants({ severity: severity ?? "none" }), className)}>
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          severity === "Low" && "bg-sev-low",
          severity === "Medium" && "bg-sev-medium",
          severity === "High" && "bg-sev-high",
          severity === "Critical" && "bg-destructive-foreground",
          !severity && "bg-sev-none",
        )}
      />
      {severity ?? "Not assessed"}
      {ai && severity ? <span className="font-normal opacity-75">(AI)</span> : null}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded border border-dashed border-foreground/40 px-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      Demo
    </span>
  );
}

export function AiStatusBadge({ status }: { status: "pending" | "completed" | "unavailable" | "failed" }) {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden /> AI analysed
      </span>
    );
  if (status === "pending")
    return <span className="text-xs text-muted-foreground">AI analysis pending…</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CircleSlash className="size-3.5" aria-hidden /> AI analysis unavailable
    </span>
  );
}

export const SEVERITY_COLOR_VAR: Record<Severity | "none", string> = {
  Low: "var(--sev-low)",
  Medium: "var(--sev-medium)",
  High: "var(--sev-high)",
  Critical: "var(--sev-critical)",
  none: "var(--sev-none)",
};
