import { useMemo } from "react";

interface MetricDataPoint {
  step: number;
  value: number;
  wallTime?: number;
}

interface RunMetricData {
  runId: string;
  runName: string;
  data: MetricDataPoint[];
  color?: string;
}

type ChartPoint = Record<string, number | null> & { step: number };

function smoothData(data: MetricDataPoint[], factor: number): MetricDataPoint[] {
  if (factor === 0 || data.length === 0) return data;

  const smoothed: MetricDataPoint[] = [];
  let last = data[0].value;

  for (const point of data) {
    const smoothedValue = last * factor + point.value * (1 - factor);
    smoothed.push({ ...point, value: smoothedValue });
    last = smoothedValue;
  }

  return smoothed;
}

export function useMetricChartData(
  runs: RunMetricData[],
  smoothing: number,
  visibleRuns: Set<string>
): { chartData: ChartPoint[] } {
  const chartData = useMemo(() => {
    const allSteps = new Set<number>();
    runs.forEach((run) => {
      run.data.forEach((point) => allSteps.add(point.step));
    });
    const sortedSteps = Array.from(allSteps).sort((a, b) => a - b);

    return sortedSteps.map((step) => {
      const point: ChartPoint = { step };
      runs.forEach((run) => {
        if (visibleRuns.has(run.runId)) {
          const smoothedData = smoothData(run.data, smoothing);
          const dataPoint = smoothedData.find((p) => p.step === step);
          point[run.runId] = dataPoint?.value ?? null;
        }
      });
      return point;
    });
  }, [runs, smoothing, visibleRuns]);

  return { chartData };
}

