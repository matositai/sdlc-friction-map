import { NextRequest, NextResponse } from "next/server";
import {
  CodePipelineClient,
  ListPipelinesCommand,
  ListPipelineExecutionsCommand,
  PipelineSummary,
  PipelineExecutionSummary,
} from "@aws-sdk/client-codepipeline";

function durationMin(exec: PipelineExecutionSummary): number {
  if (!exec.startTime || !exec.lastUpdateTime) return 0;
  return +((exec.lastUpdateTime.getTime() - exec.startTime.getTime()) / 60000).toFixed(1);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const {
    accessKeyId,
    secretAccessKey,
    region = "us-east-1",
  } = body as { accessKeyId?: string; secretAccessKey?: string; region?: string };

  if (!accessKeyId || !secretAccessKey) {
    return NextResponse.json(
      { error: "accessKeyId and secretAccessKey are required" },
      { status: 400 }
    );
  }

  const client = new CodePipelineClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    // 1. List pipelines
    const listRes = await client.send(new ListPipelinesCommand({ maxResults: 20 }));
    const pipelines: PipelineSummary[] = listRes.pipelines || [];

    // 2. Fetch last 50 executions per pipeline (up to 5 pipelines)
    const pipelineResults = await Promise.all(
      pipelines.slice(0, 5).map(async (p) => {
        if (!p.name) return { pipeline: p, executions: [] as PipelineExecutionSummary[] };
        try {
          const execRes = await client.send(
            new ListPipelineExecutionsCommand({ pipelineName: p.name, maxResults: 50 })
          );
          return { pipeline: p, executions: execRes.pipelineExecutionSummaries || [] };
        } catch {
          return { pipeline: p, executions: [] as PipelineExecutionSummary[] };
        }
      })
    );

    // 3. Compute DORA metrics
    const allExecs = pipelineResults.flatMap((pr) => pr.executions);
    const completed = allExecs.filter((e) =>
      e.status === "Succeeded" || e.status === "Failed"
    );
    const succeeded = allExecs.filter((e) => e.status === "Succeeded");
    const failed = allExecs.filter((e) => e.status === "Failed");

    const oldestExec = allExecs.reduce<Date | null>((oldest, e) => {
      if (!e.startTime) return oldest;
      return !oldest || e.startTime < oldest ? e.startTime : oldest;
    }, null);
    const daySpan = oldestExec
      ? Math.max(1, (Date.now() - oldestExec.getTime()) / 86_400_000)
      : 7;

    const deployFreq = +(allExecs.length / daySpan).toFixed(2);
    const avgDuration =
      succeeded.length > 0
        ? +(succeeded.reduce((sum, e) => sum + durationMin(e), 0) / succeeded.length).toFixed(1)
        : 0;
    const changeFailureRate =
      completed.length > 0 ? +(failed.length / completed.length).toFixed(3) : 0;

    return NextResponse.json({
      source: "aws_codepipeline",
      region,
      totalPipelines: pipelines.length,
      metrics: {
        deploymentFrequencyPerDay: deployFreq,
        avgRunDurationMin: avgDuration,
        changeFailureRate,
        successRate: +(succeeded.length / Math.max(completed.length, 1)).toFixed(3),
        totalExecutions: allExecs.length,
      },
      pipelines: pipelineResults.map((pr) => ({
        name: pr.pipeline.name,
        totalExecutions: pr.executions.length,
        successRate:
          pr.executions.filter((e) => e.status === "Succeeded" || e.status === "Failed").length > 0
            ? +(
                pr.executions.filter((e) => e.status === "Succeeded").length /
                Math.max(pr.executions.filter((e) => e.status === "Succeeded" || e.status === "Failed").length, 1)
              ).toFixed(2)
            : null,
        avgDurationMin:
          pr.executions.filter((e) => e.status === "Succeeded").length > 0
            ? +(
                pr.executions
                  .filter((e) => e.status === "Succeeded")
                  .reduce((s, e) => s + durationMin(e), 0) /
                pr.executions.filter((e) => e.status === "Succeeded").length
              ).toFixed(1)
            : null,
        recentExecutions: pr.executions.slice(0, 5).map((e) => ({
          id: e.pipelineExecutionId,
          status: e.status,
          triggerType: e.trigger?.triggerType,
          startTime: e.startTime?.toISOString(),
          durationMin: durationMin(e),
        })),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
