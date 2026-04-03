"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Server,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface AwsMetrics {
  source: "aws_codepipeline";
  region: string;
  totalPipelines: number;
  metrics: {
    deploymentFrequencyPerDay: number;
    avgRunDurationMin: number;
    changeFailureRate: number;
    successRate: number;
    totalExecutions: number;
  };
  pipelines: Array<{
    name: string;
    totalExecutions: number;
    successRate: number | null;
    avgDurationMin: number | null;
    recentExecutions: Array<{
      id: string | undefined;
      status: string | undefined;
      triggerType: string | undefined;
      startTime: string | undefined;
      durationMin: number;
    }>;
  }>;
}

// ── Curated AWS CodePipeline reference architectures ─────────────────────────

const AWS_EXAMPLES = [
  {
    displayName: "AWS GameLift Sample",
    repo: "aws-samples/aws-gamelift-sample",
    desc: "Game server fleet automation via CloudFormation. Friction: IAM permissions lag, CloudFormation provisioning time, cross-region EKS networking.",
    frictionTags: ["IAM lag", "CloudFormation", "Cross-region"],
  },
  {
    displayName: "AWS Game Backend Framework",
    repo: "aws-samples/aws-game-backend-framework",
    desc: "Modular game backend with CDK. Friction: CDK synth times, Lambda cold starts in integration tests, multi-account deployments.",
    frictionTags: ["CDK synth", "Lambda cold start"],
  },
  {
    displayName: "Generative AI Game NPC (UE5 + SageMaker)",
    repo: "aws-samples/generative-ai-game-npc-dialogue",
    desc: "SageMaker → Lambda → Unreal integration. Friction: model training / API handoff glue code, SageMaker endpoint provisioning lag.",
    frictionTags: ["SageMaker lag", "Glue code"],
  },
];

function AwsCuratedGallery() {
  return (
    <div className="mb-5">
      <p className="text-zinc-500 text-[10px] uppercase tracking-wide font-medium mb-2">
        AWS game dev reference architectures
      </p>
      <div className="grid grid-cols-1 gap-2">
        {AWS_EXAMPLES.map((ex) => (
          <div key={ex.displayName} className="p-3 rounded-lg border border-zinc-700 bg-zinc-900/50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white text-xs font-medium">{ex.displayName}</p>
              <div className="flex gap-1">
                {ex.frictionTags.map((t) => (
                  <span key={t} className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{t}</span>
                ))}
              </div>
            </div>
            <p className="text-zinc-600 text-[10px] mb-1">{ex.desc}</p>
            <p className="text-zinc-700 text-[10px] font-mono">{ex.repo}</p>
          </div>
        ))}
      </div>
      <p className="text-zinc-700 text-[10px] mt-2">
        * Enter AWS credentials below to connect to your own deployment of these architectures.
      </p>
    </div>
  );
}

const AWS_REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-west-2", "eu-central-1",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
];

export function AwsLiveMode() {
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AwsMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (!accessKeyId || !secretAccessKey) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/aws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKeyId, secretAccessKey, region }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "AWS API error"); return; }
      setData(json as AwsMetrics);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      <AwsCuratedGallery />

      {/* Explainer */}
      <div className="bg-orange-950/20 border border-orange-800/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-300 text-sm font-medium mb-1">Live Mode — AWS CodePipeline</p>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Uses the AWS SDK v3 with IAM credentials to call <code className="bg-zinc-800 px-1 rounded">ListPipelines</code> and <code className="bg-zinc-800 px-1 rounded">ListPipelineExecutions</code>. Credentials are used only for this session — never stored. Minimum IAM permission needed: <code className="bg-zinc-800 px-1 rounded">codepipeline:ListPipelines</code> + <code className="bg-zinc-800 px-1 rounded">codepipeline:ListPipelineExecutions</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-zinc-400 text-xs font-medium block mb-1.5">AWS Access Key ID</label>
            <input
              type="text"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 font-mono"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-xs font-medium block mb-1.5">Secret Access Key</label>
            <input
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              placeholder="wJalrXUtnFEMI/K7MDENG/…"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
            />
          </div>
        </div>
        <div>
          <label className="text-zinc-400 text-xs font-medium block mb-1.5">Region</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
          >
            {AWS_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <Button
          onClick={connect}
          disabled={loading || !accessKeyId || !secretAccessKey}
          className="w-full bg-orange-900/40 hover:bg-orange-800/50 text-orange-200 border border-orange-800/50 h-9"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
            : <><Server className="w-4 h-4 mr-2" /> Connect AWS CodePipeline</>}
        </Button>
        <p className="text-zinc-600 text-[10px]">
          Tip: use a read-only IAM user or temporary STS credentials. Never use root account credentials.
        </p>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-900/50 text-orange-400 border-orange-800/50 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5 inline-block animate-pulse" />
              Live Data
            </Badge>
            <span className="text-zinc-400 text-sm font-mono">AWS · {data.region}</span>
            <button onClick={connect} className="ml-auto text-zinc-500 hover:text-zinc-300">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* DORA metrics */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Deploy Frequency", value: `${data.metrics.deploymentFrequencyPerDay}/day`, sub: `${data.metrics.totalExecutions} executions` },
              { label: "Avg Duration", value: `${data.metrics.avgRunDurationMin}m`, sub: "Successful runs" },
              { label: "Change Failure Rate", value: `${(data.metrics.changeFailureRate * 100).toFixed(0)}%`, sub: "Failed / completed", warn: data.metrics.changeFailureRate > 0.1 },
              { label: "Success Rate", value: `${(data.metrics.successRate * 100).toFixed(0)}%`, sub: "Of completed", ok: data.metrics.successRate > 0.9 },
            ].map((m) => (
              <div key={m.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">{m.label}</p>
                <p className={cn("text-xl font-bold", m.warn ? "text-red-400" : m.ok ? "text-green-400" : "text-white")}>{m.value}</p>
                <p className="text-zinc-600 text-[10px]">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Pipeline table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
                Pipelines ({data.totalPipelines} total, showing {data.pipelines.length})
              </p>
              <a
                href={`https://${data.region}.console.aws.amazon.com/codesuite/codepipeline/pipelines`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1 text-[10px]"
              >
                Open in AWS <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {data.pipelines.map((p) => (
                <div key={p.name} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-300 text-xs font-medium truncate">{p.name}</p>
                    <p className="text-zinc-600 text-[10px]">{p.totalExecutions} executions</p>
                  </div>
                  {p.successRate !== null && (
                    <span className={cn("text-[10px] font-semibold", p.successRate > 0.9 ? "text-green-400" : p.successRate > 0.7 ? "text-yellow-400" : "text-red-400")}>
                      {Math.round(p.successRate * 100)}% pass
                    </span>
                  )}
                  {p.avgDurationMin !== null && (
                    <span className="text-zinc-500 text-[10px]">{p.avgDurationMin}m avg</span>
                  )}
                  <div className="flex gap-1">
                    {p.recentExecutions.slice(0, 5).map((e, i) =>
                      e.status === "Succeeded" ? (
                        <CheckCircle2 key={i} className="w-3 h-3 text-green-500" />
                      ) : e.status === "Failed" ? (
                        <XCircle key={i} className="w-3 h-3 text-red-500" />
                      ) : (
                        <Loader2 key={i} className="w-3 h-3 text-blue-400 animate-spin" />
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
