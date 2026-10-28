import type { DamageType, Severity } from "./constants";

/**
 * Severity estimate from detector output (NOT a certified engineering assessment).
 *
 * For every detection with confidence >= MIN_CONFIDENCE:
 *   contribution = weight(label) × confidence × (1 + 4 × areaFraction)
 * where areaFraction = bbox area / image area (0–1).
 * score = sum of contributions.
 *   score < 1.5  → Low
 *   score < 3.5  → Medium
 *   score < 6    → High
 *   otherwise    → Critical
 * The dominant damage type is the label with the largest total contribution.
 */
export const MIN_CONFIDENCE = 0.25;

export const DAMAGE_WEIGHTS: Record<DamageType, number> = {
  pothole: 3,
  alligator_crack: 2.5,
  rutting: 2,
  patch_failure: 1.5,
  longitudinal_crack: 1,
  transverse_crack: 1,
  other: 1,
};

export const SEVERITY_THRESHOLDS = { medium: 1.5, high: 3.5, critical: 6 } as const;

/** Map detector class names (RDD2022 codes or plain names) to our damage types. */
export function normalizeLabel(raw: string): DamageType {
  const v = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const map: Record<string, DamageType> = {
    d00: "longitudinal_crack",
    d10: "transverse_crack",
    d20: "alligator_crack",
    d40: "pothole",
    pothole: "pothole",
    potholes: "pothole",
    alligator_crack: "alligator_crack",
    alligator: "alligator_crack",
    longitudinal_crack: "longitudinal_crack",
    transverse_crack: "transverse_crack",
    lateral_crack: "transverse_crack",
    rutting: "rutting",
    rut: "rutting",
    patch_failure: "patch_failure",
    patch: "patch_failure",
  };
  return map[v] ?? "other";
}

export interface ScoredDetection {
  label: DamageType;
  confidence: number;
  /** [x1, y1, x2, y2] in pixels */
  bbox: [number, number, number, number];
  imageWidth: number;
  imageHeight: number;
}

export interface SeverityResult {
  score: number;
  severity: Severity | null;
  dominantType: DamageType | null;
  confidence: number | null;
  countedDetections: number;
}

export function scoreToSeverity(score: number): Severity {
  if (score < SEVERITY_THRESHOLDS.medium) return "Low";
  if (score < SEVERITY_THRESHOLDS.high) return "Medium";
  if (score < SEVERITY_THRESHOLDS.critical) return "High";
  return "Critical";
}

export function estimateSeverity(detections: ScoredDetection[]): SeverityResult {
  const counted = detections.filter((d) => d.confidence >= MIN_CONFIDENCE);
  if (counted.length === 0) {
    return { score: 0, severity: null, dominantType: null, confidence: null, countedDetections: 0 };
  }
  const byType = new Map<DamageType, number>();
  let score = 0;
  for (const d of counted) {
    const [x1, y1, x2, y2] = d.bbox;
    const imgArea = Math.max(1, d.imageWidth * d.imageHeight);
    const area = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const areaFraction = Math.min(1, Math.max(0, area / imgArea));
    const c = DAMAGE_WEIGHTS[d.label] * d.confidence * (1 + 4 * areaFraction);
    score += c;
    byType.set(d.label, (byType.get(d.label) ?? 0) + c);
  }
  let dominantType: DamageType | null = null;
  let best = -1;
  for (const [t, v] of byType) {
    if (v > best) {
      best = v;
      dominantType = t;
    }
  }
  const confidence = Math.max(...counted.filter((d) => d.label === dominantType).map((d) => d.confidence));
  const rounded = Math.round(score * 100) / 100;
  return {
    score: rounded,
    severity: scoreToSeverity(rounded),
    dominantType,
    confidence,
    countedDetections: counted.length,
  };
}
