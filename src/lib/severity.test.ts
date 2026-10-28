import { describe, expect, it } from "vitest";
import { estimateSeverity, normalizeLabel, scoreToSeverity, type ScoredDetection } from "./severity";

const img = { imageWidth: 1000, imageHeight: 1000 };
function det(label: ScoredDetection["label"], confidence: number, areaFraction: number): ScoredDetection {
  const side = Math.sqrt(areaFraction) * 1000;
  return { label, confidence, bbox: [0, 0, side, side], ...img };
}

describe("severity scoring", () => {
  it("returns no severity when nothing is detected", () => {
    expect(estimateSeverity([]).severity).toBeNull();
  });

  it("ignores detections below 25% confidence", () => {
    expect(estimateSeverity([det("pothole", 0.2, 0.5)]).severity).toBeNull();
  });

  it("rates a small, faint crack as Low", () => {
    expect(estimateSeverity([det("longitudinal_crack", 0.5, 0.02)]).severity).toBe("Low");
  });

  it("rates a single small pothole as Medium", () => {
    // 3 × 0.9 × (1 + 4×0.05) = 3.24
    const r = estimateSeverity([det("pothole", 0.9, 0.05)]);
    expect(r.score).toBe(3.24);
    expect(r.severity).toBe("Medium");
  });

  it("rates a large pothole as High", () => {
    // 3 × 0.9 × (1 + 4×0.3) = 5.94
    expect(estimateSeverity([det("pothole", 0.9, 0.3)]).severity).toBe("High");
  });

  it("rates several large potholes as Critical", () => {
    const r = estimateSeverity([det("pothole", 0.9, 0.3), det("pothole", 0.8, 0.2)]);
    expect(r.severity).toBe("Critical");
    expect(r.dominantType).toBe("pothole");
  });

  it("uses the documented thresholds", () => {
    expect(scoreToSeverity(1.49)).toBe("Low");
    expect(scoreToSeverity(1.5)).toBe("Medium");
    expect(scoreToSeverity(3.5)).toBe("High");
    expect(scoreToSeverity(6)).toBe("Critical");
  });

  it("maps RDD2022 class codes", () => {
    expect(normalizeLabel("D40")).toBe("pothole");
    expect(normalizeLabel("D20")).toBe("alligator_crack");
    expect(normalizeLabel("something new")).toBe("other");
  });
});
