import { NextRequest, NextResponse } from "next/server";

// Azure DevOps pipeline run shape (subset we care about)
interface AzureRun {
  id: number;
  name: string;
  state: "unknown" | "inProgress" | "canceling" | "completed";
  result: "unknown" | "succeeded" | "failed" | "canceled" | null;
  createdDate: string;
  finishedDate: string | null;
  pipeline: { id: number; name: string; folder: string };
}

interface AzurePipeline {
  id: number;
  name: string;
  folder: string;
}

function basicAuth(token: string) {
  // Azure DevOps PAT: base64(:<token>)
  return "Basic " + Buffer.from(`:${token}`).toString("base64");
}

function durationMin(run: AzureRun): number {
  if (!run.finishedDate || !run.createdDate) return 0;
  return +((new Date(run.finishedDate).getTime() - new Date(run.createdDate).getTime()) / 60000).toFixed(1);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { token, org, project } = body as { token?: string; org?: string; project?: string };

  if (!token || !org || !project) {
    return NextResponse.json(
      { error: "token, org, and project are required" },
      { status: 400 }
    );
  }

  const headers = {
    Authorization: basicAuth(token),
    "Content-Type": "application/json",
  };
  const base = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_apis`;

  try {
    // 1. List pipelines
    const pipelinesRes = await fetch(`${base}/pipelines?api-version=7.1`, { headers });
    if (!pipelinesRes.ok) {
      const err = await pipelinesRes.json().catch(() => ({})) as { message?: string };
      return NextResponse.json(
        { error: err.message || `Azure API error ${pipelinesRes.status}` },
        { status: pipelinesRes.status }
      );
    }
    const pipelinesData = await pipelinesRes.json() as { value: AzurePipeline[] };
    const pipelines = pipelinesData.value || [];

    // 2. For each pipeline (up to 5 to stay within rate limits), fetch recent runs
    const pipelineResults = await Promise.all(
      pipelines.slice(0, 5).map(async (p) => {
        const runsRes = await fetch(`${base}/pipelines/${p.id}/runs?api-version=7.1`, { headers });
        if (!runsRes.ok) return { pipeline: p, runs: [] as AzureRun[] };
        const runsData = await runsRes.json() as { value: AzureRun[] };
        return { pipeline: p, runs: (runsData.value || []).slice(0, 50) };
      })
    );

    // 3. Compute DORA metrics across all pipelines
    const allRuns = pipelineResults.flatMap((pr) => pr.runs);
    const completed = allRuns.filter((r) => r.state === "completed");
    const succeeded = completed.filter((r) => r.result === "succeeded");
    const failed = completed.filter((r) => r.result === "failed");

    const oldestRun = allRuns.reduce<Date | null>((oldest, r) => {
      const d = new Date(r.createdDate);
      return !oldest || d < oldest ? d : oldest;
    }, null);
    const daySpan = oldestRun
      ? Math.max(1, (Date.now() - oldestRun.getTime()) / 86_400_000)
      : 7;

    const deployFreq = +(allRuns.length / daySpan).toFixed(2);
    const avgDuration =
      succeeded.length > 0
        ? +(succeeded.reduce((sum, r) => sum + durationMin(r), 0) / succeeded.length).toFixed(1)
        : 0;
    const changeFailureRate = completed.length > 0 ? +(failed.length / completed.length).toFixed(3) : 0;

    return NextResponse.json({
      source: "azure_devops",
      org,
      project,
      totalPipelines: pipelines.length,
      metrics: {
        deploymentFrequencyPerDay: deployFreq,
        avgRunDurationMin: avgDuration,
        changeFailureRate,
        successRate: +(succeeded.length / Math.max(completed.length, 1)).toFixed(3),
        totalRuns: allRuns.length,
      },
      pipelines: pipelineResults.map((pr) => ({
        id: pr.pipeline.id,
        name: pr.pipeline.name,
        folder: pr.pipeline.folder,
        totalRuns: pr.runs.length,
        successRate: pr.runs.length
          ? +(pr.runs.filter((r) => r.result === "succeeded").length / Math.max(pr.runs.filter((r) => r.state === "completed").length, 1)).toFixed(2)
          : null,
        avgDurationMin:
          pr.runs.filter((r) => r.result === "succeeded").length
            ? +(pr.runs.filter((r) => r.result === "succeeded").reduce((s, r) => s + durationMin(r), 0) / pr.runs.filter((r) => r.result === "succeeded").length).toFixed(1)
            : null,
        recentRuns: pr.runs.slice(0, 5).map((r) => ({
          id: r.id,
          name: r.name,
          result: r.result,
          state: r.state,
          createdDate: r.createdDate,
          durationMin: durationMin(r),
        })),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
