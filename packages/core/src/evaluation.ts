export type CompletionRule = Readonly<{ type: "completion"; stars: 1 }>;
export type ThresholdRule = Readonly<{
  type: "duration" | "errorCount";
  operator: "lte";
  value: number;
  stars: 1;
}>;
export type StarRule = CompletionRule | ThresholdRule;
export type StarConfig = Readonly<{
  maxStars: 3;
  ruleVersion: number;
  starRules: readonly StarRule[];
}>;
export type Metrics = Readonly<{
  completed: boolean;
  durationSeconds: number;
  errorCount: number;
}>;
export type RuleResult = Readonly<{
  type: StarRule["type"];
  achieved: boolean;
  stars: 0 | 1;
}>;
export type StarResult = Readonly<{
  stars: 0 | 1 | 2 | 3;
  rules: readonly RuleResult[];
}>;

type Handler = (rule: StarRule, metrics: Metrics) => boolean;
const handlers: Record<1, Record<StarRule["type"], Handler>> = {
  1: {
    completion: (_, m) => m.completed,
    duration: (r, m) => r.type === "duration" && m.durationSeconds <= r.value,
    errorCount: (r, m) => r.type === "errorCount" && m.errorCount <= r.value,
  },
};
export function evaluateStars(
  config: StarConfig,
  metrics: Metrics,
): StarResult {
  if (
    config.maxStars !== 3 ||
    !Number.isInteger(config.ruleVersion) ||
    !(config.ruleVersion in handlers)
  )
    throw new Error("unsupported rule version");
  if (
    config.starRules.length !== 3 ||
    new Set(config.starRules.map((r) => r.type)).size !== 3
  )
    throw new Error("invalid star rules");
  if (
    !Number.isFinite(metrics.durationSeconds) ||
    metrics.durationSeconds < 0 ||
    !Number.isInteger(metrics.errorCount) ||
    metrics.errorCount < 0
  )
    throw new Error("invalid metrics");
  const rules: RuleResult[] = config.starRules.map((rule) => {
    if (
      rule.stars !== 1 ||
      !(rule.type in handlers[1]) ||
      (rule.type !== "completion" &&
        (rule.operator !== "lte" ||
          !Number.isFinite(rule.value) ||
          rule.value < 0))
    )
      throw new Error("invalid star rule");
    const achieved = metrics.completed && handlers[1][rule.type](rule, metrics);
    return { type: rule.type, achieved, stars: achieved ? 1 : 0 };
  });
  return {
    stars: rules.reduce<number>(
      (sum, rule) => sum + rule.stars,
      0,
    ) as StarResult["stars"],
    rules,
  };
}
