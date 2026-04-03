import { Header } from "@/components/layout/Header";
import { TokenStatus } from "@/components/errors/TokenStatus";
import { RateLimitWidget } from "@/components/dashboard/RateLimitWidget";
import { GitHubLiveMode } from "@/components/dashboard/GitHubLiveMode";
import { AzureLiveMode } from "@/components/dashboard/AzureLiveMode";
import { AwsLiveMode } from "@/components/dashboard/AwsLiveMode";
import { GitLabLiveMode } from "@/components/dashboard/GitLabLiveMode";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const tokenPresent = !!process.env.GITHUB_TOKEN;
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--nc-void)" }}>
      <Header title="Live Mode" subtitle="Connect to real pipeline data — GitHub Actions, GitLab CI, Azure DevOps, or AWS CodePipeline" />
      <main className="p-6 max-w-[920px] w-full space-y-5">
        {/* Token status banner */}
        <TokenStatus tokenPresent={tokenPresent} />

        {/* Live rate limit widget */}
        <RateLimitWidget />

        {/* Cloud connector tabs */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
            <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Cloud Connectors</span>
          </div>
          <div className="p-6">
            <Tabs defaultValue="github">
              <TabsList className="mb-5" style={{ backgroundColor: "var(--nc-surface-2)", border: "1px solid var(--nc-ghost)" }}>
                <TabsTrigger value="github" className="text-xs data-[state=active]:text-[#69daff]" style={{ color: "var(--muted-foreground)" }}>
                  GitHub Actions
                </TabsTrigger>
                <TabsTrigger value="gitlab" className="text-xs data-[state=active]:text-[#69daff]" style={{ color: "var(--muted-foreground)" }}>
                  GitLab CI
                </TabsTrigger>
                <TabsTrigger value="azure" className="text-xs data-[state=active]:text-[#69daff]" style={{ color: "var(--muted-foreground)" }}>
                  Azure DevOps
                </TabsTrigger>
                <TabsTrigger value="aws" className="text-xs data-[state=active]:text-[#69daff]" style={{ color: "var(--muted-foreground)" }}>
                  AWS CodePipeline
                </TabsTrigger>
              </TabsList>
              <TabsContent value="github">
                <GitHubLiveMode />
              </TabsContent>
              <TabsContent value="gitlab">
                <GitLabLiveMode />
              </TabsContent>
              <TabsContent value="azure">
                <AzureLiveMode />
              </TabsContent>
              <TabsContent value="aws">
                <AwsLiveMode />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Architecture note */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
            <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>How the integrations work</span>
          </div>
          <div className="p-6 space-y-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <div className="flex items-start gap-3 pb-3" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
              <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: "#69daff" }} />
              <div>
                <p className="font-medium" style={{ color: "var(--foreground)" }}>GitHub Actions → <code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>/api/github</code></p>
                <p>Token optional for public repos. 7 parallel fetches: workflow runs, open PRs, issues labeled CI / build / Technical Debt / Infrastructure / Refactor. Computes DORA metrics + friction signals (flaky workflows, PR backlog, build time trend, open friction issues).</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-3" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
              <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: "#ffc965" }} />
              <div>
                <p className="font-medium" style={{ color: "var(--foreground)" }}>GitLab CI → <code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>/api/gitlab</code></p>
                <p>Uses GitLab REST API v4. Token optional for public projects. Fetches pipelines, jobs (for flaky analysis), merge requests (PR backlog), and labeled issues. Returns the same <code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>GitHubLiveResponse</code> shape — provider-agnostic.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-3" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
              <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: "#00ffa3" }} />
              <div>
                <p className="font-medium" style={{ color: "var(--foreground)" }}>Azure DevOps → <code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>/api/azure</code></p>
                <p>Calls <code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>_apis/pipelines</code> then <code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>_apis/pipelines/:id/runs</code> (v7.1). PAT auth via Basic header. Requires your own org/project — no public Azure DevOps projects expose external access. See curated examples for reference architectures.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: "#ff716c" }} />
              <div>
                <p className="font-medium" style={{ color: "var(--foreground)" }}>AWS CodePipeline → <code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>/api/aws</code></p>
                <p>Uses <code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>@aws-sdk/client-codepipeline</code> v3 — <code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>ListPipelines</code> + <code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>ListPipelineExecutions</code>. Requires IAM credentials. No public CodePipeline projects exist; use your own AWS account or demo credentials.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
