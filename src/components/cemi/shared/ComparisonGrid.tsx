import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Run } from "../../../types/cemi";

interface ComparisonGridProps {
  runs: Run[];
  showChart?: boolean;
  className?: string;
}

export function ComparisonGrid({ runs, showChart = false, className }: ComparisonGridProps) {
  if (runs.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#0F3455]/70">Select runs to compare</p>
        </CardContent>
      </Card>
    );
  }

  // Extract comparison metrics
  const comparisonData = runs.map((run) => {
    const accuracyMetric = run.metrics?.find((m) => m.name === "accuracy");
    const latencyMetric = run.metrics?.find((m) => m.name === "latency");
    const memoryMetric = run.metrics?.find((m) => m.name === "memory");

    return {
      runId: run.id,
      runName: run.name || run.id.slice(0, 8),
      method: run.method,
      accuracy: accuracyMetric?.value ?? 0,
      latency: latencyMetric?.value ?? 0,
      memory: memoryMetric?.value ?? 0,
    };
  });

  // Calculate deltas relative to first run
  const baseline = comparisonData[0];
  const deltas = comparisonData.slice(1).map((run) => ({
    ...run,
    accuracyDelta: run.accuracy - baseline.accuracy,
    latencyDelta: run.latency - baseline.latency,
    memoryDelta: run.memory - baseline.memory,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Run Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Accuracy</TableHead>
              <TableHead>Latency (ms)</TableHead>
              <TableHead>Memory (MB)</TableHead>
              {deltas.length > 0 && (
                <>
                  <TableHead>Δ Accuracy</TableHead>
                  <TableHead>Δ Latency</TableHead>
                  <TableHead>Δ Memory</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">{baseline.runName}</TableCell>
              <TableCell>{baseline.method}</TableCell>
              <TableCell>{baseline.accuracy.toFixed(4)}</TableCell>
              <TableCell>{baseline.latency.toFixed(2)}</TableCell>
              <TableCell>{baseline.memory.toFixed(2)}</TableCell>
              {deltas.length > 0 && (
                <>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                </>
              )}
            </TableRow>
            {deltas.map((run) => (
              <TableRow key={run.runId}>
                <TableCell className="font-medium">{run.runName}</TableCell>
                <TableCell>{run.method}</TableCell>
                <TableCell>{run.accuracy.toFixed(4)}</TableCell>
                <TableCell>{run.latency.toFixed(2)}</TableCell>
                <TableCell>{run.memory.toFixed(2)}</TableCell>
                <TableCell
                  className={
                    run.accuracyDelta >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {run.accuracyDelta >= 0 ? "+" : ""}
                  {run.accuracyDelta.toFixed(4)}
                </TableCell>
                <TableCell
                  className={
                    run.latencyDelta <= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {run.latencyDelta >= 0 ? "+" : ""}
                  {run.latencyDelta.toFixed(2)}
                </TableCell>
                <TableCell
                  className={
                    run.memoryDelta <= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {run.memoryDelta >= 0 ? "+" : ""}
                  {run.memoryDelta.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}





