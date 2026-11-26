import { describe, expect, it } from "vitest";
import {
  evaluateStars,
  type StarConfig,
} from "../packages/core/src/evaluation";
const config: StarConfig = {
  maxStars: 3,
  ruleVersion: 1,
  starRules: [
    { type: "completion", stars: 1 },
    { type: "duration", operator: "lte", value: 120, stars: 1 },
    { type: "errorCount", operator: "lte", value: 2, stars: 1 },
  ],
};
const metrics = { completed: true, durationSeconds: 120, errorCount: 2 };
describe("versioned star evaluation", () => {
  it("awards three stars at both thresholds", () =>
    expect(evaluateStars(config, metrics).stars).toBe(3));
  it("awards two stars when one extra condition passes", () =>
    expect(evaluateStars(config, { ...metrics, errorCount: 3 }).stars).toBe(2));
  it("awards one star for completion beyond both thresholds", () =>
    expect(
      evaluateStars(config, { ...metrics, durationSeconds: 121, errorCount: 3 })
        .stars,
    ).toBe(1));
  it("awards zero before completion", () =>
    expect(evaluateStars(config, { ...metrics, completed: false }).stars).toBe(
      0,
    ));
  it("rejects unknown versions and invalid rules", () => {
    expect(() =>
      evaluateStars({ ...config, ruleVersion: 2 }, metrics),
    ).toThrow();
    expect(() =>
      evaluateStars(
        { ...config, starRules: [{ type: "completion", stars: 1 }] },
        metrics,
      ),
    ).toThrow();
  });
});
