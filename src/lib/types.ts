// Cloud provider types
export type CloudProvider = "aws" | "azure" | "gcp" | "github";
export type PipelineTool =
  | "CodePipeline"
  | "Azure DevOps"
  | "Cloud Build"
  | "GitHub Actions";

// SDLC stage names
export type SDLCStage =
  | "commit"
  | "build"
  | "unit_test"
  | "integration_test"
  | "review"
  | "staging_deploy"
  | "prod_deploy";

// Friction level
export type FrictionLevel = "low" | "medium" | "high" | "critical";

// Release cycle phase
export type ReleasePhase = "pre_alpha" | "alpha" | "beta" | "gold" | "live";

// Platform targets (game-specific)
export type Platform = "PS5" | "Xbox Series X" | "PC" | "Mobile" | "Switch";

// Single pipeline stage metrics
export interface StageMetrics {
  stage: SDLCStage;
  avgDurationMin: number;
  benchmarkMin: number;
  failureRate: number; // 0-1
  queueWaitMin: number;
  frictionLevel: FrictionLevel;
  topIssue?: string;
}

// A single CI/CD pipeline
export interface Pipeline {
  id: string;
  name: string;
  studio: string;
  game: string;
  cloudProvider: CloudProvider;
  pipelineTool: PipelineTool;
  platforms: Platform[];
  releasePhase: ReleasePhase;
  stages: StageMetrics[];
  lastRunAt: string; // ISO date
  lastRunStatus: "success" | "failure" | "running" | "queued";
  lastRunDurationMin: number;
  weeklyRunCount: number;
}

// DORA metrics for a studio or aggregate
export interface DoraMetrics {
  studioId: string;
  studioName: string;
  deploymentFrequencyPerDay: number; // 7-day frequency (accurate via total_count)
  deployFreq14d?: number;             // 14-day frequency (real via total_count)
  deployFreq30d?: number;             // 30-day frequency (real via total_count)
  deployFreq90d?: number;             // 90-day frequency (real via total_count)
  leadTimeHours: number;
  mttrHours: number; // Mean Time to Recovery
  changeFailureRate: number; // 0-1
  devExScore: number; // 0-100 composite
  trend: "improving" | "stable" | "degrading";
}

// Historical data point for charts
export interface MetricDataPoint {
  date: string; // "YYYY-MM-DD"
  value: number;
  studioId: string;
}

// Historical DORA trend
export interface DoraTrend {
  studioId: string;
  studioName: string;
  color: string;
  leadTime: MetricDataPoint[];
  deployFrequency: MetricDataPoint[];
  changeFailureRate: MetricDataPoint[];
  devExScore: MetricDataPoint[];
}

// AI Recommendation
export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: string;
  affectedStudio: string;
  affectedStage: SDLCStage;
  effort: "low" | "medium" | "high";
  weeklyHoursSaved?: number;
}

// AI Analysis result
export interface AIAnalysisResult {
  summary: string;
  topFrictionPoint: string;
  recommendations: AIRecommendation[];
  generatedAt: string;
}

// GitHub live mode config
export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

// DevEx score breakdown
export interface DevExScoreBreakdown {
  studioId: string;
  studioName: string;
  total: number;
  buildSpeed: number;
  reliability: number;
  deploymentConfidence: number;
  reviewCycleTime: number;
  history: MetricDataPoint[];
}

// AI Adoption (hivel.ai inspired)
export type AIAdoptionCohort = "high" | "medium" | "low" | "none";

export interface AIAdoptionMetrics {
  studioId: string;
  studioName: string;
  /** % of lines committed that are AI-assisted (Copilot/Cursor) */
  aiCodeAuthorshipPct: number;
  /** high = elite prompt quality + AI-native workflows; low = using AI occasionally with no governance */
  adoptionCohort: AIAdoptionCohort;
  /** Active AI tool users / total devs */
  activeAiUsersPct: number;
  /** Whether velocity increase reflects genuine capability growth (vs. boilerplate inflation) */
  velocityVsCapabilityRatio: number; // >1 = real capability growth; <1 = inflated velocity
  /** Code review quality score: are reviews focusing on logic/context (high) vs. syntax nits (low) */
  contextGuardianScore: number; // 0-100
  /** Estimation accuracy in an AI-augmented world: how often sprint forecasts are met */
  estimationAccuracyPct: number;
  /** Avg prompt reuse rate: high = prompt governance in place */
  promptReuseRate: number; // 0-1
  trend: "improving" | "stable" | "degrading";
}

// ── GitHub Live Mode — Richer Friction Signals ───────────────────────────────

export interface FlakyWorkflow {
  name: string;
  failureRate: number; // 0-1
  totalRuns: number;
}

export interface BuildWeekTrend {
  week: string; // "YYYY-Wnn"
  avgDurationMin: number;
  runCount: number;
}

export interface FrictionIssue {
  number: number;
  title: string;
  url: string;
  labels: string[];
  createdAt: string; // ISO date
}

export type PrimaryFrictionSource = "Build Time" | "PR Backlog" | "Flaky Tests" | "Healthy";

export interface FrictionSignals {
  flakyWorkflows: FlakyWorkflow[];
  buildTimeTrend: BuildWeekTrend[];
  openPrCount: number;
  avgPrAgeDays: number;
  frictionIssues: FrictionIssue[];
  primaryFrictionSource: PrimaryFrictionSource;
}

export interface CuratedRepo {
  owner: string;
  repo: string;
  displayName: string;
  language: string;
  why: string; // EA-relevance blurb
  disabled?: boolean;
  disabledReason?: string;
}

export interface GitHubLiveResponse {
  source: "github_live";
  repo: string;
  totalRuns: number;
  authenticated: boolean;
  metrics: {
    deploymentFrequencyPerDay: number;
    avgRunDurationMin: number;
    changeFailureRate: number;
    successRate: number;
  };
  recentRuns: Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    createdAt: string;
    durationMin: number;
    commitMessage: string;
  }>;
  frictionSignals: FrictionSignals;
}

// Aggregate dashboard stats
export interface DashboardStats {
  totalStudios: number;
  totalPipelines: number;
  avgDevExScore: number;
  criticalFrictionCount: number;
  weeklyBuilds: number;
  avgLeadTimeHours: number;
}
