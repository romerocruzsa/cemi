export type DecisionPolicy = "Balanced" | "Quality" | "Latency" | "Memory" | "Energy";

export type MetricDimension = "quality" | "latency" | "memory" | "energy" | "custom";
export type MetricDirection = "higher_is_better" | "lower_is_better" | "none";

export interface CompareMetricSpec {
  key: string;
  label: string;
  candidates: string[];
  dimension: MetricDimension;
  direction: MetricDirection;
}

export interface ParetoViewSpec {
  id: string;
  title: string;
  xMetric: CompareMetricSpec;
  yMetric: CompareMetricSpec;
}

export interface ResolvedComparePolicySpec {
  paretoView: ParetoViewSpec;
  ranking: {
    strategy: "balanced" | "objective_first";
    primaryMetric: CompareMetricSpec;
    secondaryMetric: CompareMetricSpec;
  };
}

export interface LoggedPolicyMetadata {
  name?: DecisionPolicy | null;
  objectiveMetric?: string | null;
  objectiveDirection?: MetricDirection | null;
}

function formatMetricLabel(key: string): string {
  const withoutUnits = key
    .replace(/(?:^|[_\s-])(mb|gb|kb|b|mw|w|kw|ms|us|ns|sec|secs|seconds|uj|mj|j)$/i, "")
    .trim();

  return withoutUnits
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const normalized = part.toLowerCase();
      if (/^[a-z]\d+$/i.test(part)) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(" ");
}

const QUALITY_METRIC_SPEC: CompareMetricSpec = {
  key: "quality",
  label: "Accuracy",
  candidates: [
    "accuracy",
    "val_accuracy",
    "validation_accuracy",
    "f1",
    "val_f1",
    "sensitivity",
    "specificity",
  ],
  dimension: "quality",
  direction: "higher_is_better",
};

const LATENCY_METRIC_SPEC: CompareMetricSpec = {
  key: "latency",
  label: "Latency",
  candidates: [
    "latency",
    "latency_ms",
    "latency_p95_ms",
    "latency_p90_ms",
    "latency_p50_ms",
    "latency/single_stream_ms",
  ],
  dimension: "latency",
  direction: "lower_is_better",
};

const MEMORY_METRIC_SPEC: CompareMetricSpec = {
  key: "memory",
  label: "Memory",
  candidates: [
    "model_size_mb",
    "model_size_bytes",
    "memory_mb",
    "memory",
    "ram_kb",
    "ram_bytes",
    "flash_kb",
    "flash_bytes",
    "peak_memory_bytes",
    "arena_bytes",
  ],
  dimension: "memory",
  direction: "lower_is_better",
};

const ENERGY_METRIC_SPEC: CompareMetricSpec = {
  key: "energy",
  label: "Energy",
  candidates: [
    "energy_mj",
    "energy_j",
    "energy_per_inference_uj",
    "energy",
    "avg_power_mw",
    "power_mw",
    "power",
  ],
  dimension: "energy",
  direction: "lower_is_better",
};

export function normalizeDecisionPolicy(value: unknown): DecisionPolicy | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "balanced") return "Balanced";
  if (normalized === "quality") return "Quality";
  if (normalized === "latency") return "Latency";
  if (normalized === "memory") return "Memory";
  if (normalized === "energy") return "Energy";
  return null;
}

export function getMetricSpecByDimension(dimension: Exclude<MetricDimension, "custom">): CompareMetricSpec {
  if (dimension === "quality") return QUALITY_METRIC_SPEC;
  if (dimension === "latency") return LATENCY_METRIC_SPEC;
  if (dimension === "memory") return MEMORY_METRIC_SPEC;
  return ENERGY_METRIC_SPEC;
}

function detectMetricDimension(metricName: string): MetricDimension {
  const normalized = metricName.trim().toLowerCase();
  if (!normalized) return "custom";
  if (
    normalized.includes("acc") ||
    normalized.includes("accuracy") ||
    normalized.includes("f1") ||
    normalized.includes("sensitivity") ||
    normalized.includes("specificity")
  ) {
    return "quality";
  }
  if (normalized.includes("latency")) return "latency";
  if (
    normalized.includes("memory") ||
    normalized.includes("ram") ||
    normalized.includes("flash") ||
    normalized.includes("arena") ||
    normalized.includes("model_size")
  ) {
    return "memory";
  }
  if (normalized.includes("energy") || normalized.includes("power")) return "energy";
  return "custom";
}

function buildObjectiveMetricSpec(metricName: string, direction?: MetricDirection | null): CompareMetricSpec {
  const dimension = detectMetricDimension(metricName);
  if (dimension !== "custom") {
    const base = getMetricSpecByDimension(dimension);
    return {
      ...base,
      key: metricName,
      label: formatMetricLabel(metricName) || base.label,
      candidates: [metricName, ...base.candidates.filter((candidate) => candidate !== metricName)],
      direction: direction || base.direction,
    };
  }

  return {
    key: metricName,
    label: formatMetricLabel(metricName) || metricName,
    candidates: [metricName],
    dimension: "custom",
    direction: direction || "none",
  };
}

export function getParetoViewSpec(
  policy: DecisionPolicy,
  loggedPolicy?: LoggedPolicyMetadata | null
): ParetoViewSpec {
  return getResolvedComparePolicySpec(policy, loggedPolicy).paretoView;
}

export function getResolvedComparePolicySpec(
  policy: DecisionPolicy,
  loggedPolicy?: LoggedPolicyMetadata | null
): ResolvedComparePolicySpec {
  let xMetric =
    policy === "Memory"
      ? getMetricSpecByDimension("memory")
      : policy === "Energy"
        ? getMetricSpecByDimension("energy")
        : getMetricSpecByDimension("latency");
  let yMetric = getMetricSpecByDimension("quality");

  const canApplyLoggedOverride =
    Boolean(loggedPolicy?.objectiveMetric) &&
    (!loggedPolicy?.name || loggedPolicy.name === policy);

  if (canApplyLoggedOverride && loggedPolicy?.objectiveMetric) {
    const overrideMetric = buildObjectiveMetricSpec(
      loggedPolicy.objectiveMetric,
      loggedPolicy.objectiveDirection || undefined
    );
    if (overrideMetric.dimension === "quality") {
      yMetric = overrideMetric;
    } else {
      xMetric = overrideMetric;
    }
  }

  const paretoView = {
    id: `compare-${yMetric.key.replace(/\W+/g, "-")}-vs-${xMetric.key.replace(/\W+/g, "-")}`,
    title: `${yMetric.label} vs ${xMetric.label}`,
    xMetric,
    yMetric,
  };

  const ranking =
    canApplyLoggedOverride && loggedPolicy?.objectiveMetric
      ? {
          strategy: "objective_first" as const,
          primaryMetric: xMetric.key === loggedPolicy.objectiveMetric ? xMetric : yMetric,
          secondaryMetric: xMetric.key === loggedPolicy.objectiveMetric ? yMetric : xMetric,
        }
      : policy === "Quality"
        ? {
            strategy: "objective_first" as const,
            primaryMetric: yMetric,
            secondaryMetric: xMetric,
          }
        : policy === "Balanced"
          ? {
              strategy: "balanced" as const,
              primaryMetric: yMetric,
              secondaryMetric: xMetric,
            }
          : {
              strategy: "objective_first" as const,
              primaryMetric: xMetric,
              secondaryMetric: yMetric,
            };

  return {
    paretoView,
    ranking,
  };
}
