import {
  Pipeline,
  DoraMetrics,
  DoraTrend,
  DevExScoreBreakdown,
  DashboardStats,
  MetricDataPoint,
  AIAdoptionMetrics,
} from "./types";

// ── Pipelines ─────────────────────────────────────────────────────────────────

export const mockPipelines: Pipeline[] = [
  // FC 25 — Azure DevOps
  {
    id: "fc25-frontend",
    name: "FC25_Frontend_Build",
    studio: "EA Sports FC",
    game: "EA Sports FC 25",
    cloudProvider: "azure",
    pipelineTool: "Azure DevOps",
    platforms: ["PS5", "Xbox Series X", "PC"],
    releasePhase: "live",
    lastRunAt: "2026-03-31T18:42:00Z",
    lastRunStatus: "success",
    lastRunDurationMin: 68,
    weeklyRunCount: 312,
    stages: [
      { stage: "commit", avgDurationMin: 1.2, benchmarkMin: 1, failureRate: 0.01, queueWaitMin: 0.5, frictionLevel: "low" },
      { stage: "build", avgDurationMin: 38, benchmarkMin: 20, failureRate: 0.04, queueWaitMin: 4, frictionLevel: "high", topIssue: "Shader compilation running sequentially across PS5/XSX/PC targets" },
      { stage: "unit_test", avgDurationMin: 12, benchmarkMin: 10, failureRate: 0.06, queueWaitMin: 2, frictionLevel: "medium" },
      { stage: "integration_test", avgDurationMin: 28, benchmarkMin: 15, failureRate: 0.12, queueWaitMin: 6, frictionLevel: "critical", topIssue: "Multiplayer matchmaking tests flaky (12% failure rate) — retry logic adds avg 8 min" },
      { stage: "review", avgDurationMin: 240, benchmarkMin: 120, failureRate: 0.0, queueWaitMin: 60, frictionLevel: "high", topIssue: "Large PRs averaging 1,800 lines — review latency 4h vs 2h benchmark" },
      { stage: "staging_deploy", avgDurationMin: 14, benchmarkMin: 10, failureRate: 0.02, queueWaitMin: 3, frictionLevel: "medium" },
      { stage: "prod_deploy", avgDurationMin: 22, benchmarkMin: 20, failureRate: 0.01, queueWaitMin: 2, frictionLevel: "low" },
    ],
  },
  {
    id: "fc25-backend",
    name: "FC25_Backend_Services",
    studio: "EA Sports FC",
    game: "EA Sports FC 25",
    cloudProvider: "azure",
    pipelineTool: "Azure DevOps",
    platforms: ["PC"],
    releasePhase: "live",
    lastRunAt: "2026-03-31T19:10:00Z",
    lastRunStatus: "failure",
    lastRunDurationMin: 55,
    weeklyRunCount: 418,
    stages: [
      { stage: "commit", avgDurationMin: 0.8, benchmarkMin: 1, failureRate: 0.0, queueWaitMin: 0.3, frictionLevel: "low" },
      { stage: "build", avgDurationMin: 14, benchmarkMin: 15, failureRate: 0.03, queueWaitMin: 1, frictionLevel: "low" },
      { stage: "unit_test", avgDurationMin: 18, benchmarkMin: 10, failureRate: 0.08, queueWaitMin: 3, frictionLevel: "high", topIssue: "Match simulation unit tests CPU-bound, not parallelized" },
      { stage: "integration_test", avgDurationMin: 35, benchmarkMin: 20, failureRate: 0.15, queueWaitMin: 8, frictionLevel: "critical", topIssue: "Live services integration tests depend on external FIFA stats API — rate-limited" },
      { stage: "review", avgDurationMin: 180, benchmarkMin: 120, failureRate: 0.0, queueWaitMin: 30, frictionLevel: "medium" },
      { stage: "staging_deploy", avgDurationMin: 8, benchmarkMin: 10, failureRate: 0.01, queueWaitMin: 1, frictionLevel: "low" },
      { stage: "prod_deploy", avgDurationMin: 18, benchmarkMin: 20, failureRate: 0.03, queueWaitMin: 2, frictionLevel: "low" },
    ],
  },

  // Apex Legends — AWS + GitHub
  {
    id: "apex-backend",
    name: "Apex_Backend_Deploy",
    studio: "Respawn Entertainment",
    game: "Apex Legends",
    cloudProvider: "aws",
    pipelineTool: "CodePipeline",
    platforms: ["PC"],
    releasePhase: "live",
    lastRunAt: "2026-03-31T19:22:00Z",
    lastRunStatus: "success",
    lastRunDurationMin: 42,
    weeklyRunCount: 185,
    stages: [
      { stage: "commit", avgDurationMin: 1.0, benchmarkMin: 1, failureRate: 0.0, queueWaitMin: 0.2, frictionLevel: "low" },
      { stage: "build", avgDurationMin: 11, benchmarkMin: 12, failureRate: 0.02, queueWaitMin: 1, frictionLevel: "low" },
      { stage: "unit_test", avgDurationMin: 9, benchmarkMin: 10, failureRate: 0.03, queueWaitMin: 1, frictionLevel: "low" },
      { stage: "integration_test", avgDurationMin: 22, benchmarkMin: 15, failureRate: 0.09, queueWaitMin: 4, frictionLevel: "high", topIssue: "Server-side hit detection tests require real EC2 instances — slow spin-up" },
      { stage: "review", avgDurationMin: 95, benchmarkMin: 120, failureRate: 0.0, queueWaitMin: 15, frictionLevel: "low" },
      { stage: "staging_deploy", avgDurationMin: 12, benchmarkMin: 10, failureRate: 0.01, queueWaitMin: 2, frictionLevel: "medium" },
      { stage: "prod_deploy", avgDurationMin: 16, benchmarkMin: 20, failureRate: 0.01, queueWaitMin: 1, frictionLevel: "low" },
    ],
  },
  {
    id: "apex-client",
    name: "Apex_Client_Build",
    studio: "Respawn Entertainment",
    game: "Apex Legends",
    cloudProvider: "github",
    pipelineTool: "GitHub Actions",
    platforms: ["PS5", "Xbox Series X", "PC"],
    releasePhase: "live",
    lastRunAt: "2026-03-31T18:55:00Z",
    lastRunStatus: "running",
    lastRunDurationMin: 58,
    weeklyRunCount: 220,
    stages: [
      { stage: "commit", avgDurationMin: 1.5, benchmarkMin: 1, failureRate: 0.02, queueWaitMin: 1, frictionLevel: "low" },
      { stage: "build", avgDurationMin: 52, benchmarkMin: 25, failureRate: 0.05, queueWaitMin: 8, frictionLevel: "critical", topIssue: "Platform matrix (PS5+XSX+PC) built sequentially — no parallelism configured" },
      { stage: "unit_test", avgDurationMin: 15, benchmarkMin: 10, failureRate: 0.04, queueWaitMin: 2, frictionLevel: "medium" },
      { stage: "integration_test", avgDurationMin: 18, benchmarkMin: 15, failureRate: 0.07, queueWaitMin: 3, frictionLevel: "medium" },
      { stage: "review", avgDurationMin: 130, benchmarkMin: 120, failureRate: 0.0, queueWaitMin: 20, frictionLevel: "medium" },
      { stage: "staging_deploy", avgDurationMin: 9, benchmarkMin: 10, failureRate: 0.0, queueWaitMin: 1, frictionLevel: "low" },
      { stage: "prod_deploy", avgDurationMin: 20, benchmarkMin: 20, failureRate: 0.02, queueWaitMin: 2, frictionLevel: "low" },
    ],
  },

  // Battlefield — GCP
  {
    id: "battlefield-engine",
    name: "Battlefield_Engine_Build",
    studio: "DICE",
    game: "Battlefield",
    cloudProvider: "gcp",
    pipelineTool: "Cloud Build",
    platforms: ["PS5", "Xbox Series X", "PC"],
    releasePhase: "alpha",
    lastRunAt: "2026-03-31T17:30:00Z",
    lastRunStatus: "success",
    lastRunDurationMin: 94,
    weeklyRunCount: 142,
    stages: [
      { stage: "commit", avgDurationMin: 2.0, benchmarkMin: 1, failureRate: 0.01, queueWaitMin: 1, frictionLevel: "medium" },
      { stage: "build", avgDurationMin: 62, benchmarkMin: 20, failureRate: 0.06, queueWaitMin: 12, frictionLevel: "critical", topIssue: "Destruction physics shaders: 8,400 shader permutations compiled single-threaded" },
      { stage: "unit_test", avgDurationMin: 8, benchmarkMin: 10, failureRate: 0.02, queueWaitMin: 1, frictionLevel: "low" },
      { stage: "integration_test", avgDurationMin: 24, benchmarkMin: 20, failureRate: 0.08, queueWaitMin: 5, frictionLevel: "medium" },
      { stage: "review", avgDurationMin: 210, benchmarkMin: 120, failureRate: 0.0, queueWaitMin: 45, frictionLevel: "high", topIssue: "Engine changes require sign-off from 3 teams — serial review chain" },
      { stage: "staging_deploy", avgDurationMin: 11, benchmarkMin: 10, failureRate: 0.01, queueWaitMin: 2, frictionLevel: "medium" },
      { stage: "prod_deploy", avgDurationMin: 25, benchmarkMin: 20, failureRate: 0.04, queueWaitMin: 3, frictionLevel: "medium" },
    ],
  },

  // Frostbite — GCP
  {
    id: "frostbite-engine",
    name: "Frostbite_Engine_Core",
    studio: "Frostbite",
    game: "Frostbite Engine",
    cloudProvider: "gcp",
    pipelineTool: "Cloud Build",
    platforms: ["PS5", "Xbox Series X", "PC", "Switch"],
    releasePhase: "live",
    lastRunAt: "2026-03-31T16:00:00Z",
    lastRunStatus: "success",
    lastRunDurationMin: 118,
    weeklyRunCount: 95,
    stages: [
      { stage: "commit", avgDurationMin: 1.8, benchmarkMin: 1, failureRate: 0.01, queueWaitMin: 0.5, frictionLevel: "medium" },
      { stage: "build", avgDurationMin: 71, benchmarkMin: 20, failureRate: 0.07, queueWaitMin: 15, frictionLevel: "critical", topIssue: "Full engine rebuild on any core file change — no incremental build cache" },
      { stage: "unit_test", avgDurationMin: 22, benchmarkMin: 15, failureRate: 0.05, queueWaitMin: 4, frictionLevel: "medium" },
      { stage: "integration_test", avgDurationMin: 38, benchmarkMin: 25, failureRate: 0.1, queueWaitMin: 8, frictionLevel: "high", topIssue: "Cross-platform rendering integration tests run for all 4 targets in sequence" },
      { stage: "review", avgDurationMin: 280, benchmarkMin: 120, failureRate: 0.0, queueWaitMin: 60, frictionLevel: "critical", topIssue: "All Frostbite PRs require arch review — single reviewer bottleneck (1 person)" },
      { stage: "staging_deploy", avgDurationMin: 18, benchmarkMin: 10, failureRate: 0.02, queueWaitMin: 4, frictionLevel: "high" },
      { stage: "prod_deploy", avgDurationMin: 30, benchmarkMin: 20, failureRate: 0.05, queueWaitMin: 5, frictionLevel: "high" },
    ],
  },

  // The Sims 5 — GitHub Actions
  {
    id: "sims5-client",
    name: "Sims5_Client_CI",
    studio: "Maxis",
    game: "The Sims 5",
    cloudProvider: "github",
    pipelineTool: "GitHub Actions",
    platforms: ["PC", "Mobile"],
    releasePhase: "beta",
    lastRunAt: "2026-03-31T19:05:00Z",
    lastRunStatus: "success",
    lastRunDurationMin: 35,
    weeklyRunCount: 267,
    stages: [
      { stage: "commit", avgDurationMin: 0.9, benchmarkMin: 1, failureRate: 0.0, queueWaitMin: 0.2, frictionLevel: "low" },
      { stage: "build", avgDurationMin: 16, benchmarkMin: 15, failureRate: 0.02, queueWaitMin: 2, frictionLevel: "low" },
      { stage: "unit_test", avgDurationMin: 11, benchmarkMin: 10, failureRate: 0.03, queueWaitMin: 1, frictionLevel: "medium" },
      { stage: "integration_test", avgDurationMin: 14, benchmarkMin: 15, failureRate: 0.05, queueWaitMin: 2, frictionLevel: "low" },
      { stage: "review", avgDurationMin: 110, benchmarkMin: 120, failureRate: 0.0, queueWaitMin: 10, frictionLevel: "low" },
      { stage: "staging_deploy", avgDurationMin: 8, benchmarkMin: 10, failureRate: 0.0, queueWaitMin: 1, frictionLevel: "low" },
      { stage: "prod_deploy", avgDurationMin: 12, benchmarkMin: 15, failureRate: 0.01, queueWaitMin: 1, frictionLevel: "low" },
    ],
  },

  // Madden 25 — AWS
  {
    id: "madden25-sim",
    name: "Madden25_GameSim_Pipeline",
    studio: "EA Tiburon",
    game: "Madden NFL 25",
    cloudProvider: "aws",
    pipelineTool: "CodePipeline",
    platforms: ["PS5", "Xbox Series X", "PC"],
    releasePhase: "live",
    lastRunAt: "2026-03-31T18:00:00Z",
    lastRunStatus: "success",
    lastRunDurationMin: 51,
    weeklyRunCount: 198,
    stages: [
      { stage: "commit", avgDurationMin: 1.1, benchmarkMin: 1, failureRate: 0.01, queueWaitMin: 0.4, frictionLevel: "low" },
      { stage: "build", avgDurationMin: 24, benchmarkMin: 20, failureRate: 0.03, queueWaitMin: 3, frictionLevel: "medium" },
      { stage: "unit_test", avgDurationMin: 13, benchmarkMin: 10, failureRate: 0.04, queueWaitMin: 2, frictionLevel: "medium" },
      { stage: "integration_test", avgDurationMin: 20, benchmarkMin: 15, failureRate: 0.06, queueWaitMin: 4, frictionLevel: "medium", topIssue: "NFL stats API mock outdated — causes intermittent failures during roster updates" },
      { stage: "review", avgDurationMin: 145, benchmarkMin: 120, failureRate: 0.0, queueWaitMin: 25, frictionLevel: "medium" },
      { stage: "staging_deploy", avgDurationMin: 10, benchmarkMin: 10, failureRate: 0.01, queueWaitMin: 1, frictionLevel: "low" },
      { stage: "prod_deploy", avgDurationMin: 19, benchmarkMin: 20, failureRate: 0.02, queueWaitMin: 2, frictionLevel: "low" },
    ],
  },
];

// ── DORA Metrics ──────────────────────────────────────────────────────────────

export const mockDoraMetrics: DoraMetrics[] = [
  {
    studioId: "ea-sports-fc",
    studioName: "EA Sports FC",
    deploymentFrequencyPerDay: 8.4,
    leadTimeHours: 14.2,
    mttrHours: 1.8,
    changeFailureRate: 0.08,
    devExScore: 62,
    trend: "degrading",
  },
  {
    studioId: "respawn",
    studioName: "Respawn",
    deploymentFrequencyPerDay: 5.8,
    leadTimeHours: 10.4,
    mttrHours: 1.2,
    changeFailureRate: 0.05,
    devExScore: 74,
    trend: "stable",
  },
  {
    studioId: "dice",
    studioName: "DICE",
    deploymentFrequencyPerDay: 3.2,
    leadTimeHours: 18.6,
    mttrHours: 3.4,
    changeFailureRate: 0.11,
    devExScore: 51,
    trend: "degrading",
  },
  {
    studioId: "frostbite",
    studioName: "Frostbite",
    deploymentFrequencyPerDay: 2.1,
    leadTimeHours: 28.4,
    mttrHours: 4.2,
    changeFailureRate: 0.14,
    devExScore: 38,
    trend: "degrading",
  },
  {
    studioId: "maxis",
    studioName: "Maxis",
    deploymentFrequencyPerDay: 6.2,
    leadTimeHours: 7.8,
    mttrHours: 0.9,
    changeFailureRate: 0.03,
    devExScore: 88,
    trend: "improving",
  },
  {
    studioId: "ea-tiburon",
    studioName: "EA Tiburon",
    deploymentFrequencyPerDay: 4.6,
    leadTimeHours: 11.2,
    mttrHours: 1.6,
    changeFailureRate: 0.06,
    devExScore: 71,
    trend: "stable",
  },
];

// ── Historical Trend Data ──────────────────────────────────────────────────────

function generateTrend(
  studioId: string,
  baseValue: number,
  days: number,
  drift: number,
  noise: number
): MetricDataPoint[] {
  const points: MetricDataPoint[] = [];
  const now = new Date("2026-03-31");
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const trend = drift * ((days - i) / days);
    const noiseVal = (Math.random() - 0.5) * noise;
    points.push({
      date: date.toISOString().split("T")[0],
      value: Math.max(0, +(baseValue + trend + noiseVal).toFixed(2)),
      studioId,
    });
  }
  return points;
}

export const mockDoraTrends: DoraTrend[] = [
  {
    studioId: "ea-sports-fc",
    studioName: "EA Sports FC",
    color: "#3b82f6",
    leadTime: generateTrend("ea-sports-fc", 10, 90, 4.2, 1.5),
    deployFrequency: generateTrend("ea-sports-fc", 9, 90, -0.6, 0.8),
    changeFailureRate: generateTrend("ea-sports-fc", 0.05, 90, 0.03, 0.01),
    devExScore: generateTrend("ea-sports-fc", 72, 90, -10, 3),
  },
  {
    studioId: "respawn",
    studioName: "Respawn",
    color: "#8b5cf6",
    leadTime: generateTrend("respawn", 11, 90, -0.6, 1.2),
    deployFrequency: generateTrend("respawn", 5.5, 90, 0.3, 0.5),
    changeFailureRate: generateTrend("respawn", 0.06, 90, -0.01, 0.008),
    devExScore: generateTrend("respawn", 71, 90, 3, 2),
  },
  {
    studioId: "dice",
    studioName: "DICE",
    color: "#f59e0b",
    leadTime: generateTrend("dice", 14, 90, 4.6, 2),
    deployFrequency: generateTrend("dice", 4, 90, -0.8, 0.4),
    changeFailureRate: generateTrend("dice", 0.07, 90, 0.04, 0.012),
    devExScore: generateTrend("dice", 62, 90, -11, 3),
  },
  {
    studioId: "frostbite",
    studioName: "Frostbite",
    color: "#ef4444",
    leadTime: generateTrend("frostbite", 20, 90, 8.4, 2.5),
    deployFrequency: generateTrend("frostbite", 3.2, 90, -1.1, 0.3),
    changeFailureRate: generateTrend("frostbite", 0.09, 90, 0.05, 0.015),
    devExScore: generateTrend("frostbite", 55, 90, -17, 4),
  },
  {
    studioId: "maxis",
    studioName: "Maxis",
    color: "#10b981",
    leadTime: generateTrend("maxis", 9, 90, -1.2, 0.8),
    deployFrequency: generateTrend("maxis", 5.4, 90, 0.8, 0.4),
    changeFailureRate: generateTrend("maxis", 0.05, 90, -0.02, 0.006),
    devExScore: generateTrend("maxis", 79, 90, 9, 2),
  },
  {
    studioId: "ea-tiburon",
    studioName: "EA Tiburon",
    color: "#06b6d4",
    leadTime: generateTrend("ea-tiburon", 12, 90, -0.8, 1.0),
    deployFrequency: generateTrend("ea-tiburon", 4.2, 90, 0.4, 0.5),
    changeFailureRate: generateTrend("ea-tiburon", 0.07, 90, -0.01, 0.01),
    devExScore: generateTrend("ea-tiburon", 68, 90, 3, 2),
  },
];

// ── DevEx Score Breakdowns ────────────────────────────────────────────────────

export const mockDevExScores: DevExScoreBreakdown[] = mockDoraMetrics.map(
  (d) => {
    const buildSpeed = d.devExScore * 0.95 + (Math.random() - 0.5) * 10;
    const reliability = d.devExScore * 1.05 + (Math.random() - 0.5) * 10;
    const deploymentConfidence = d.devExScore + (Math.random() - 0.5) * 8;
    const reviewCycleTime = d.devExScore * 0.9 + (Math.random() - 0.5) * 12;
    return {
      studioId: d.studioId,
      studioName: d.studioName,
      total: d.devExScore,
      buildSpeed: Math.min(100, Math.max(0, Math.round(buildSpeed))),
      reliability: Math.min(100, Math.max(0, Math.round(reliability))),
      deploymentConfidence: Math.min(100, Math.max(0, Math.round(deploymentConfidence))),
      reviewCycleTime: Math.min(100, Math.max(0, Math.round(reviewCycleTime))),
      history: generateTrend(d.studioId, d.devExScore - 5, 30, 5, 3),
    };
  }
);

// ── Dashboard Aggregate Stats ─────────────────────────────────────────────────

export const mockDashboardStats: DashboardStats = {
  totalStudios: 6,
  totalPipelines: mockPipelines.length,
  avgDevExScore: Math.round(
    mockDoraMetrics.reduce((a, b) => a + b.devExScore, 0) / mockDoraMetrics.length
  ),
  criticalFrictionCount: mockPipelines.reduce(
    (count, p) =>
      count + p.stages.filter((s) => s.frictionLevel === "critical").length,
    0
  ),
  weeklyBuilds: mockPipelines.reduce((a, p) => a + p.weeklyRunCount, 0),
  avgLeadTimeHours: +(
    mockDoraMetrics.reduce((a, b) => a + b.leadTimeHours, 0) /
    mockDoraMetrics.length
  ).toFixed(1),
};

// ── AI Adoption Metrics (hivel.ai framework) ─────────────────────────────────
// Tracks how well each studio has embraced AI-augmented SDLC practices:
// cohort adoption, prompt governance, Context Guardian review quality,
// and whether velocity gains represent real capability vs. boilerplate inflation.

export const mockAIAdoption: AIAdoptionMetrics[] = [
  {
    studioId: "maxis",
    studioName: "Maxis",
    aiCodeAuthorshipPct: 62,
    adoptionCohort: "high",
    activeAiUsersPct: 0.88,
    velocityVsCapabilityRatio: 1.31,
    contextGuardianScore: 84,
    estimationAccuracyPct: 91,
    promptReuseRate: 0.74,
    trend: "improving",
  },
  {
    studioId: "respawn",
    studioName: "Respawn",
    aiCodeAuthorshipPct: 48,
    adoptionCohort: "high",
    activeAiUsersPct: 0.71,
    velocityVsCapabilityRatio: 1.18,
    contextGuardianScore: 76,
    estimationAccuracyPct: 85,
    promptReuseRate: 0.58,
    trend: "improving",
  },
  {
    studioId: "ea-tiburon",
    studioName: "EA Tiburon",
    aiCodeAuthorshipPct: 34,
    adoptionCohort: "medium",
    activeAiUsersPct: 0.54,
    velocityVsCapabilityRatio: 1.04,
    contextGuardianScore: 62,
    estimationAccuracyPct: 78,
    promptReuseRate: 0.41,
    trend: "stable",
  },
  {
    studioId: "ea-sports-fc",
    studioName: "EA Sports FC",
    aiCodeAuthorshipPct: 29,
    adoptionCohort: "medium",
    activeAiUsersPct: 0.46,
    velocityVsCapabilityRatio: 0.92,  // inflated velocity — PRs are bigger but reviews are slower
    contextGuardianScore: 48,
    estimationAccuracyPct: 66,
    promptReuseRate: 0.28,
    trend: "degrading",
  },
  {
    studioId: "dice",
    studioName: "DICE",
    aiCodeAuthorshipPct: 18,
    adoptionCohort: "low",
    activeAiUsersPct: 0.32,
    velocityVsCapabilityRatio: 0.88,
    contextGuardianScore: 41,
    estimationAccuracyPct: 59,
    promptReuseRate: 0.14,
    trend: "degrading",
  },
  {
    studioId: "frostbite",
    studioName: "Frostbite",
    aiCodeAuthorshipPct: 9,
    adoptionCohort: "none",
    activeAiUsersPct: 0.12,
    velocityVsCapabilityRatio: 0.74,
    contextGuardianScore: 28,
    estimationAccuracyPct: 44,
    promptReuseRate: 0.06,
    trend: "degrading",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getPipelineById(id: string): Pipeline | undefined {
  return mockPipelines.find((p) => p.id === id);
}

export function getPipelinesByStudio(studioId: string): Pipeline[] {
  const studioMap: Record<string, string> = {
    "ea-sports-fc": "EA Sports FC",
    respawn: "Respawn Entertainment",
    dice: "DICE",
    frostbite: "Frostbite",
    maxis: "Maxis",
    "ea-tiburon": "EA Tiburon",
  };
  return mockPipelines.filter(
    (p) => p.studio === studioMap[studioId]
  );
}

export function getDoraMetricsById(studioId: string): DoraMetrics | undefined {
  return mockDoraMetrics.find((d) => d.studioId === studioId);
}

export const CLOUD_PROVIDER_COLORS: Record<string, string> = {
  aws: "#f97316",
  azure: "#0ea5e9",
  gcp: "#22c55e",
  github: "#a855f7",
};

export const CLOUD_PROVIDER_LABELS: Record<string, string> = {
  aws: "AWS",
  azure: "Azure",
  gcp: "GCP",
  github: "GitHub",
};

export const FRICTION_COLORS: Record<string, string> = {
  low: "rgba(105,218,255,0.5)",
  medium: "#69daff",
  high: "#ffc965",
  critical: "#ff716c",
};

export const STAGE_LABELS: Record<string, string> = {
  commit: "Commit",
  build: "Build",
  unit_test: "Unit Test",
  integration_test: "Integration Test",
  review: "Code Review",
  staging_deploy: "Staging Deploy",
  prod_deploy: "Prod Deploy",
};
