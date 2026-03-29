import type { RunRecord } from "../types/domain";

export interface ExperimentOption {
  id: string;
  label: string;
  runCount: number;
}

export function getExperimentName(run: RunRecord): string {
  const experimentTag = run.tags.find((tag) => tag.key === "experiment");
  if (experimentTag?.value?.trim()) return experimentTag.value.trim();

  const nameParts = run.name?.split("/");
  if (nameParts && nameParts.length > 1 && nameParts[0]?.trim()) {
    return nameParts[0].trim();
  }

  return "Default";
}

export function getExperimentOptions(runs: RunRecord[]): ExperimentOption[] {
  const counts = new Map<string, number>();

  for (const run of runs) {
    const experiment = getExperimentName(run);
    counts.set(experiment, (counts.get(experiment) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([id, runCount]) => ({
      id,
      label: id,
      runCount,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
