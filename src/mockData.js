/* 
  Mock data for the CEMI UI prototype (no backend wiring).
  This dataset is shaped like the original mocks, but the content reflects:
  - Compression Engine PTQ/QAT benchmarks (MNIST, x86 CPU)
  - Industrial time-series baselines (Bosch CNC + UR3 CobotOps)
*/

import { mockRunsData } from "./mockRunsData.js";

// Projects (Workspace list)
export const mockProjects = [
  {
    "id": "project-ic-mnist",
    "name": "Image Classification",
    "org_id": "org-001",
    "created_at": "2025-12-10T14:10:00Z"
  },
  {
    "id": "project-ts-cnc",
    "name": "Industrial Time-Series (Bosch CNC)",
    "org_id": "org-001",
    "created_at": "2025-12-11T09:00:00Z"
  },
  {
    "id": "project-ts-ur3",
    "name": "Industrial Time-Series (UR3 CobotOps)",
    "org_id": "org-001",
    "created_at": "2025-12-11T09:15:00Z"
  }
];

// Runs (keyed map for O(1) access)
export const mockRuns = mockRunsData.reduce((acc, run) => {
  acc[run.id] = run;
  return acc;
}, {});

// ---------------------------------------------------------------------------
// Metrics helpers
// ---------------------------------------------------------------------------

const now = new Date();

// Generate monotonic-ish metrics series with a little noise.
// NOTE: The UI can treat these as "history" even though they are mocked.
function generateMetrics(runId, name, startValue, endValue, nSteps = 10) {
  const metrics = [];
  const startTime = now.getTime() - (nSteps * 60000); // nSteps minutes ago

  for (let step = 0; step < nSteps; step++) {
    const progress = step / Math.max(1, nSteps - 1);
    const baseValue = startValue + (endValue - startValue) * progress;

    // Small, bounded noise (keeps charts from being perfectly straight lines)
    const noise = (Math.random() - 0.5) * Math.abs(endValue - startValue) * 0.08;

    metrics.push({
      id: `metric-${runId}-${name}-${step}`,
      run_id: runId,
      name,
      value: Number((baseValue + noise).toFixed(6)),
      step,
      timestamp: new Date(startTime + (step * 60000)).toISOString(),
    });
  }

  return metrics;
}

function buildMetricsForRun(run) {
  const getTag = (key) => (run?.tags || []).find((t) => t?.key === key)?.value;
  const domain = getTag("domain");
  const method = run?.method;
  const suite = getTag("benchmark_suite");

  // Baselines: simulate training curves.
  if (method === 'baseline' && domain === 'vision') {
    const steps = suite === 'QAT_001' ? 3 : 25;
    return [
      ...generateMetrics(run.id, 'loss', 2.30, run.summary_metrics.loss, steps),
      ...generateMetrics(run.id, 'accuracy', 0.10, run.summary_metrics.accuracy, steps),
      ...generateMetrics(run.id, 'f1', 0.12, run.summary_metrics.f1, steps),
    ];
  }

  // Compression transforms (PTQ/QAT): show "before vs after" as short series.
  if ((method === 'ptq' || method === 'qat') && domain === 'vision') {
    const baseline = run.baseline_run_id ? mockRuns[run.baseline_run_id] : null;
    const bSize =
      baseline?.summary_metrics?.model_size_mb ?? run.summary_metrics.model_size_mb;
    const bLat =
      baseline?.summary_metrics?.latency_p50_ms ?? run.summary_metrics.latency_p50_ms;

    return [
      ...generateMetrics(run.id, 'model_size_mb', bSize, run.summary_metrics.model_size_mb, 2),
      ...generateMetrics(run.id, 'latency_p50_ms', bLat, run.summary_metrics.latency_p50_ms, 2),
      ...generateMetrics(run.id, 'accuracy', baseline?.summary_metrics?.accuracy ?? run.summary_metrics.accuracy, run.summary_metrics.accuracy, 2),
    ];
  }

  // Time-series baselines: simulate stable training curves.
  if (method === 'baseline' && domain === 'timeseries') {
    const steps = 20;
    return [
      ...generateMetrics(run.id, 'loss', 1.00, run.summary_metrics.loss, steps),
      ...generateMetrics(run.id, 'accuracy', 0.50, run.summary_metrics.accuracy, steps),
      ...generateMetrics(run.id, 'f1', 0.35, run.summary_metrics.f1, steps),
    ];
  }

  // Fallback
  return [
    ...generateMetrics(run.id, 'loss', 1.00, run.summary_metrics.loss ?? 0.2, 10),
  ];
}

// Build metrics map for getMetrics(runId).
export const mockMetrics = Object.values(mockRuns).reduce((acc, run) => {
  acc[run.id] = buildMetricsForRun(run);
  return acc;
}, {});

// Build params map for getParams(runId).
export const mockParams = Object.values(mockRuns).reduce((acc, run) => {
  const params = (run.params || []).map(p => ({
    key: p.key,
    value: p.value,
    value_type: p.value_type,
  }));
  acc[run.id] = params;
  return acc;
}, {});

// ---------------------------------------------------------------------------
// Mock API client (matches the same interface your UI already consumes)
// ---------------------------------------------------------------------------

export const mockApiClient = {
  // Projects
  getProjects: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockProjects;
  },

  getProject: async (projectId) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const project = mockProjects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    return project;
  },

  createProject: async (projectData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newProject = {
      id: `project-${Date.now()}`,
      ...projectData,
      created_at: new Date().toISOString(),
    };
    mockProjects.push(newProject);
    return newProject;
  },

  // Runs
  getRuns: async (projectId, filters = {}) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    let runs = Object.values(mockRuns).filter(run => run.project_id === projectId);

    // Optional filters (keeps parity with the original mock client signature)
    if (filters?.status && filters.status !== "all") {
      runs = runs.filter((r) => r.status === filters.status);
    }

    if (filters?.search) {
      const q = String(filters.search).toLowerCase();
      runs = runs.filter((r) => {
        const name = (r.name || "").toLowerCase();
        const notes = (r.notes || "").toLowerCase();
        const tags = Array.isArray(r.tags)
          ? r.tags.some((t) => String(t.value || "").toLowerCase().includes(q))
          : false;
        return name.includes(q) || notes.includes(q) || tags;
      });
    }

    if (filters?.tag) {
      const [key, value] = String(filters.tag).includes("=")
        ? String(filters.tag).split("=")
        : [String(filters.tag), ""];
      runs = runs.filter((r) => {
        if (!Array.isArray(r.tags)) return false;
        const match = r.tags.find((t) => t.key === key);
        if (!match) return false;
        if (value === "") return true;
        return match.value === value;
      });
    }

    return runs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  getRun: async (runId) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const run = mockRuns[runId];
    if (!run) throw new Error('Run not found');
    return run;
  },

  updateRun: async (runId, updateData) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const run = mockRuns[runId];
    if (!run) throw new Error('Run not found');
    mockRuns[runId] = { ...run, ...updateData };
    return mockRuns[runId];
  },

  createRun: async (projectId, runData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newRun = {
      id: `run-${Date.now()}`,
      project_id: projectId,
      created_at: new Date().toISOString(),
      status: 'running',
      ...runData,
    };
    mockRuns[newRun.id] = newRun;

    // Default params/metrics so new runs don't appear empty
    mockParams[newRun.id] = runData.params || [];
    mockMetrics[newRun.id] = buildMetricsForRun(newRun);

    return newRun;
  },

  deleteRun: async (runId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    delete mockRuns[runId];
    delete mockParams[runId];
    delete mockMetrics[runId];
    return { success: true };
  },

  // Run data logging
  getParams: async (runId) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockParams[runId] || [];
  },

  logParams: async (runId, params) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (!mockParams[runId]) mockParams[runId] = [];
    mockParams[runId].push(...params);
    return { success: true };
  },

  logMetrics: async (runId, metrics) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (!mockMetrics[runId]) mockMetrics[runId] = [];
    mockMetrics[runId].push(...metrics);
    return { success: true };
  },

  getMetrics: async (runId, metricName = null) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const metrics = mockMetrics[runId] || [];
    if (!metricName) return metrics;
    return metrics.filter(m => m.name === metricName);
  },
};

export default mockApiClient;
