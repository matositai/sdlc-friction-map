import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { mockPipelines, mockDoraMetrics } from "@/lib/mock-data";
import type { Pipeline, DoraMetrics } from "@/lib/types";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured. Add it to .env.local" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const {
    studioId,
    fingerprint,
    pipelines: bodyPipelines,
    doraMetrics: bodyDora,
    frictionSignals: bodyFrictionSignals,
  } = body as {
    studioId?: string;
    fingerprint?: string;
    pipelines?: Pipeline[];
    doraMetrics?: DoraMetrics[];
    frictionSignals?: Record<string, unknown>[];
  };

  // Use real data if provided, fall back to mock
  const allPipelines: Pipeline[] = bodyPipelines ?? mockPipelines;
  const allDora: DoraMetrics[] = bodyDora ?? mockDoraMetrics;

  const pipelines = studioId
    ? allPipelines.filter(
        (p) => allDora.find((d) => d.studioId === studioId)?.studioName === p.studio
      )
    : allPipelines;

  const doraData = studioId
    ? allDora.filter((d) => d.studioId === studioId)
    : allDora;

  const pipelineSummary = pipelines.map((p) => ({
    name: p.name,
    studio: p.studio,
    cloud: p.cloudProvider,
    platforms: p.platforms,
    weeklyRuns: p.weeklyRunCount,
    stages: p.stages.map((s) => ({
      stage: s.stage,
      avgMin: s.avgDurationMin,
      benchmarkMin: s.benchmarkMin,
      ratio: +(s.avgDurationMin / s.benchmarkMin).toFixed(2),
      failureRate: `${(s.failureRate * 100).toFixed(0)}%`,
      friction: s.frictionLevel,
      topIssue: s.topIssue,
    })),
  }));

  const doraSummary = doraData.map((d) => ({
    studio: d.studioName,
    deployFreq: `${d.deploymentFrequencyPerDay}/day`,
    leadTime: `${d.leadTimeHours}h`,
    mttr: `${d.mttrHours}h`,
    cfr: `${(d.changeFailureRate * 100).toFixed(0)}%`,
    devExScore: d.devExScore,
    trend: d.trend,
  }));

  const isLiveData = !!bodyPipelines;

  const frictionSignalsSummary = bodyFrictionSignals?.map((fs) => ({
    studio: (fs.studioName as string) ?? "",
    primaryFriction: fs.primaryFrictionSource,
    openPRs: fs.openPrCount,
    avgPRAgeDays: fs.avgPrAgeDays,
    flakyWorkflows: (fs.flakyWorkflows as Array<{ name: string; failureRate: number; totalRuns: number }>)
      ?.slice(0, 3)
      .map((w) => ({ name: w.name, failureRate: `${(w.failureRate * 100).toFixed(0)}%`, runs: w.totalRuns })),
    frictionIssues: (fs.frictionIssues as Array<{ title: string; labels: string[] }>)
      ?.slice(0, 5)
      .map((i) => ({ title: i.title, labels: i.labels })),
  }));

  const cacheKey = fingerprint ? `ai-report:${studioId ?? "all"}:${fingerprint}` : null;

  // Check KV cache first
  if (cacheKey) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) {
        return NextResponse.json({ ...cached, cached: true });
      }
    } catch {
      // KV not configured, proceed without cache
    }
  }

  const prompt = `You are an expert technical product manager specializing in developer experience (DevEx) and CI/CD platform optimization for a large game studio environment.

Analyze the following SDLC pipeline data from ${isLiveData ? "real open-source game engine repositories" : "EA game studios"} and provide a structured friction analysis.

## DORA Metrics
${JSON.stringify(doraSummary, null, 2)}

## Pipeline Stage Data
${JSON.stringify(pipelineSummary, null, 2)}
${frictionSignalsSummary?.length ? `
## Friction Signals (flaky workflows, PR backlog, open issues)
${JSON.stringify(frictionSignalsSummary, null, 2)}` : ""}

Please provide:
1. A 2-3 sentence executive summary of the overall SDLC health
2. The single highest-impact friction point you'd tackle first and why
3. Exactly 4 prioritized recommendations, each with:
   - A clear, actionable title (max 10 words)
   - A 2-sentence description explaining the problem and solution
   - Priority: "high", "medium", or "low"
   - Effort: "low", "medium", or "high"
   - Estimated weekly developer hours saved
   - Affected stage (one of: commit, build, unit_test, integration_test, review, staging_deploy, prod_deploy)
   - Affected studio name

Format your response as valid JSON matching this schema exactly:
{
  "summary": "string",
  "topFrictionPoint": "string",
  "recommendations": [
    {
      "id": "rec-1",
      "title": "string",
      "description": "string",
      "priority": "high|medium|low",
      "estimatedImpact": "string (e.g. '42 dev-hours/week')",
      "affectedStudio": "string",
      "affectedStage": "string",
      "effort": "low|medium|high",
      "weeklyHoursSaved": number
    }
  ],
  "generatedAt": "${new Date().toISOString()}"
}`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON in Claude response");

    const parsed = JSON.parse(jsonMatch[0]);

    // Store in KV cache
    if (cacheKey) {
      try {
        await kv.set(cacheKey, parsed);
      } catch {
        // KV not configured, skip caching
      }
    }

    return NextResponse.json({ ...parsed, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
