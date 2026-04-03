import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StudioDetail } from "@/components/dashboard/StudioDetail";
import { FrictionAnalysis } from "@/components/ai/FrictionAnalysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLiveRepoData } from "@/lib/live-data";
import { CANONICAL_REPOS } from "@/lib/repo-config";

interface Props {
  params: Promise<{ studioId: string }>;
}

export default async function StudioPage({ params }: Props) {
  const { studioId } = await params;

  const config = CANONICAL_REPOS.find((r) => r.studioId === studioId);
  if (!config) notFound();

  const result = await getLiveRepoData().catch(() => ({ data: [], errors: [], totalAttempted: 0, successCount: 0, isLive: false }));
  const repoData = result.data;
  const studio = repoData.find((r) => r.dora.studioId === studioId);

  if (!studio) {
    // Show an informative "no live data" view with config info
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <Header title={config.displayName} subtitle={`${config.language} · ${config.eaAnalogue} analogue`} />
        <main className="p-6 max-w-[1200px] w-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
            <p className="text-zinc-400 text-sm">No live data available for this repo.</p>
            <p className="text-zinc-600 text-xs mt-2">
              Add <code className="bg-zinc-800 px-1 rounded">GITHUB_TOKEN</code> to .env.local to enable live data.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const { pipeline, dora, devEx, frictionSignals } = studio;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Header
        title={config.displayName}
        subtitle={`${config.language} · ${config.eaAnalogue} analogue · ${config.owner}/${config.repo}`}
        isLive
      />

      <main className="p-6 space-y-6 max-w-[1200px] w-full">
        <StudioDetail
          displayName={config.displayName}
          language={config.language}
          eaAnalogue={config.eaAnalogue}
          pipeline={pipeline}
          dora={dora}
          devEx={devEx}
          frictionSignals={frictionSignals}
          repoUrl={`https://github.com/${config.owner}/${config.repo}`}
        />

        {/* AI Analysis */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              AI Friction Analysis — {config.displayName}
              <span className="text-[10px] bg-purple-950/50 text-purple-400 border border-purple-800/40 px-2 py-0.5 rounded-full">
                Powered by Claude
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FrictionAnalysis repoData={[studio]} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export async function generateStaticParams() {
  return CANONICAL_REPOS.map((r) => ({ studioId: r.studioId }));
}
