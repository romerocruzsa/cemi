// CEMI Data Access Layer Interface

import type {
  Run,
  Metric,
  Model,
  MonitoringSnapshot,
  Parameter,
  Artifact,
} from "../types/cemi";

export interface CemiApiClient {
  // Runs
  getRuns(): Promise<Run[]>;
  getRun(id: string): Promise<Run | null>;
  createRun(run: Partial<Run>): Promise<Run>;
  updateRun(id: string, updates: Partial<Run>): Promise<Run>;
  deleteRun(id: string): Promise<void>;

  // Metrics
  getMetrics(runId: string): Promise<Metric[]>;
  logMetric(runId: string, metric: Metric): Promise<void>;
  logMetrics(runId: string, metrics: Metric[]): Promise<void>;

  // Parameters
  getParameters(runId: string): Promise<Parameter[]>;
  logParameter(runId: string, parameter: Parameter): Promise<void>;
  logParameters(runId: string, parameters: Parameter[]): Promise<void>;

  // Artifacts
  getArtifacts(runId: string): Promise<Artifact[]>;
  logArtifact(runId: string, artifact: Artifact): Promise<void>;

  // Models
  getModels(): Promise<Model[]>;
  getModel(id: string): Promise<Model | null>;
  createModel(model: Partial<Model>): Promise<Model>;
  updateModel(id: string, updates: Partial<Model>): Promise<Model>;

  // Monitoring
  getMonitoringSnapshots(startTime?: number, endTime?: number): Promise<MonitoringSnapshot[]>;
  getLatestMonitoringSnapshot(): Promise<MonitoringSnapshot | null>;
}

// Export interface only - implementation will be added when backend is ready
// This allows the UI to be built independently while the backend is developed



