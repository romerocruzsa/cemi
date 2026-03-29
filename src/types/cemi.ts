// CEMI Type Definitions

export enum RunStatus {
  DRAFT = "draft",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum Method {
  PTQ = "PTQ",
  QAT = "QAT",
}

export enum Quantization {
  INT8 = "INT8",
  FP16 = "FP16",
  FP32 = "FP32",
}

export interface TargetProfile {
  id: string;
  name: string;
  description?: string;
  architecture: string; // e.g., "x86", "ARM", "Jetson"
  runtime?: string;
}

export interface Metric {
  name: string;
  value: number;
  timestamp?: number;
  step?: number;
  tags?: Record<string, string>;
}

export interface Parameter {
  key: string;
  value: string | number | boolean;
}

export interface Artifact {
  name: string;
  path: string;
  type: string;
  size?: number;
  created_at: number;
}

export interface Run {
  id: string;
  name?: string;
  method: Method;
  quantization: Quantization;
  dataset_name: string;
  num_models: number;
  target_profile: TargetProfile;
  status: RunStatus;
  timestamp: number;
  created_at: number;
  updated_at: number;
  metrics?: Metric[];
  parameters?: Parameter[];
  artifacts?: Artifact[];
  notes?: string;
}

export interface Model {
  id: string;
  name: string;
  family: string;
  description?: string;
  ptq_ready: boolean;
  qat_ready: boolean;
  runs?: Run[];
  created_at: number;
  updated_at: number;
}

export interface MonitoringSnapshot {
  id: string;
  timestamp: number;
  data_quality: {
    score: number;
    checks: Array<{
      name: string;
      status: "pass" | "fail" | "warning";
      message?: string;
    }>;
  };
  drift: {
    feature_drift: {
      detected: boolean;
      score: number;
      features: Array<{
        name: string;
        drift_score: number;
      }>;
    };
    prediction_drift: {
      detected: boolean;
      score: number;
    };
  };
  performance: {
    latency_p50: number;
    latency_p95: number;
    accuracy: number;
    memory_usage: number;
    cpu_usage: number;
  };
}



