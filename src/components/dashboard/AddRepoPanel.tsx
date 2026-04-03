"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addCustomRepo, type TrackedCustomRepo } from "@/lib/custom-repos";
import { X, Plus, GitBranch, Check } from "lucide-react";

const PRESET_COLORS = [
  "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#10b981", "#06b6d4", "#ec4899", "#f97316",
];

type Provider = "github" | "gitlab" | "azure" | "aws";

interface AddRepoPanelProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddRepoPanel({ onClose, onAdded }: AddRepoPanelProps) {
  const [provider, setProvider] = useState<Provider>("github");
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [eaAnalogue, setEaAnalogue] = useState("");
  const [saved, setSaved] = useState(false);

  // GitHub fields
  const [ghOwner, setGhOwner] = useState("");
  const [ghRepo, setGhRepo] = useState("");
  const [ghToken, setGhToken] = useState("");

  // GitLab fields
  const [glPath, setGlPath] = useState("");
  const [glHost, setGlHost] = useState("gitlab.com");
  const [glToken, setGlToken] = useState("");

  // Azure fields
  const [azOrg, setAzOrg] = useState("");
  const [azProject, setAzProject] = useState("");
  const [azToken, setAzToken] = useState("");

  // AWS fields
  const [awsKey, setAwsKey] = useState("");
  const [awsSecret, setAwsSecret] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");

  function handleSave() {
    if (!displayName.trim()) return;

    const id = `custom-${Date.now()}`;
    const repo: TrackedCustomRepo = {
      id,
      provider,
      displayName: displayName.trim(),
      color,
      eaAnalogue: eaAnalogue.trim() || undefined,
    };

    if (provider === "github") repo.github = { owner: ghOwner.trim(), repo: ghRepo.trim(), token: ghToken.trim() || undefined };
    if (provider === "gitlab") repo.gitlab = { projectPath: glPath.trim(), host: glHost.trim() || "gitlab.com", token: glToken.trim() || undefined };
    if (provider === "azure") repo.azure = { org: azOrg.trim(), project: azProject.trim(), token: azToken.trim() };
    if (provider === "aws") repo.aws = { accessKeyId: awsKey.trim(), secretAccessKey: awsSecret.trim(), region: awsRegion };

    addCustomRepo(repo);
    setSaved(true);
    setTimeout(() => {
      onAdded();
      onClose();
    }, 800);
  }

  const providerTabs: { id: Provider; label: string; color: string }[] = [
    { id: "github", label: "GitHub", color: "text-purple-400" },
    { id: "gitlab", label: "GitLab", color: "text-orange-400" },
    { id: "azure", label: "Azure DevOps", color: "text-sky-400" },
    { id: "aws", label: "AWS CodePipeline", color: "text-yellow-400" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-zinc-400" />
            <h2 className="text-white font-semibold text-sm">Add Tracked Repo</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Provider selector */}
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-2">Provider</p>
            <div className="grid grid-cols-2 gap-2">
              {providerTabs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={cn(
                    "px-3 py-2 rounded-md border text-xs font-medium transition-all text-left",
                    provider === p.id
                      ? "border-zinc-500 bg-zinc-800 text-white"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <span className={provider === p.id ? p.color : ""}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="text-zinc-500 text-[10px] uppercase tracking-wide block mb-1">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My Engine CI"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-zinc-500 text-[10px] uppercase tracking-wide block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn("w-6 h-6 rounded-full transition-all", color === c ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-900" : "")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* EA Analogue */}
          <div>
            <label className="text-zinc-500 text-[10px] uppercase tracking-wide block mb-1">
              EA Analogue <span className="normal-case text-zinc-600">(optional)</span>
            </label>
            <input
              value={eaAnalogue}
              onChange={(e) => setEaAnalogue(e.target.value)}
              placeholder="Frostbite Engine"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          {/* Provider-specific fields */}
          <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
            <p className="text-zinc-400 text-[10px] uppercase tracking-wide font-medium">Connection Details</p>

            {provider === "github" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-600 text-[10px] block mb-1">Owner / Org</label>
                    <input value={ghOwner} onChange={(e) => setGhOwner(e.target.value)} placeholder="godotengine"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60" />
                  </div>
                  <div>
                    <label className="text-zinc-600 text-[10px] block mb-1">Repo</label>
                    <input value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} placeholder="godot"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60" />
                  </div>
                </div>
                <div>
                  <label className="text-zinc-600 text-[10px] block mb-1">PAT Token (optional for public)</label>
                  <input type="password" value={ghToken} onChange={(e) => setGhToken(e.target.value)} placeholder="ghp_xxxx"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60" />
                </div>
              </>
            )}

            {provider === "gitlab" && (
              <>
                <div>
                  <label className="text-zinc-600 text-[10px] block mb-1">GitLab Host</label>
                  <input value={glHost} onChange={(e) => setGlHost(e.target.value)} placeholder="gitlab.com"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/60" />
                </div>
                <div>
                  <label className="text-zinc-600 text-[10px] block mb-1">Project Path</label>
                  <input value={glPath} onChange={(e) => setGlPath(e.target.value)} placeholder="veloren/veloren"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/60" />
                </div>
                <div>
                  <label className="text-zinc-600 text-[10px] block mb-1">Access Token (optional)</label>
                  <input type="password" value={glToken} onChange={(e) => setGlToken(e.target.value)} placeholder="glpat-xxxx"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/60" />
                </div>
              </>
            )}

            {provider === "azure" && (
              <>
                <div>
                  <label className="text-zinc-600 text-[10px] block mb-1">Organization</label>
                  <input value={azOrg} onChange={(e) => setAzOrg(e.target.value)} placeholder="myorg"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/60" />
                </div>
                <div>
                  <label className="text-zinc-600 text-[10px] block mb-1">Project</label>
                  <input value={azProject} onChange={(e) => setAzProject(e.target.value)} placeholder="my-game"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/60" />
                </div>
                <div>
                  <label className="text-zinc-600 text-[10px] block mb-1">PAT Token</label>
                  <input type="password" value={azToken} onChange={(e) => setAzToken(e.target.value)} placeholder="Azure DevOps PAT"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/60" />
                </div>
              </>
            )}

            {provider === "aws" && (
              <>
                <div>
                  <label className="text-zinc-600 text-[10px] block mb-1">Access Key ID</label>
                  <input value={awsKey} onChange={(e) => setAwsKey(e.target.value)} placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/60" />
                </div>
                <div>
                  <label className="text-zinc-600 text-[10px] block mb-1">Secret Access Key</label>
                  <input type="password" value={awsSecret} onChange={(e) => setAwsSecret(e.target.value)} placeholder="wJalrXUtnFEMI/K7MDENG"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/60" />
                </div>
                <div>
                  <label className="text-zinc-600 text-[10px] block mb-1">Region</label>
                  <select value={awsRegion} onChange={(e) => setAwsRegion(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-yellow-500/60">
                    {["us-east-1","us-west-2","eu-west-1","eu-central-1","ap-southeast-1","ap-northeast-1","ca-central-1"].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={!displayName.trim() || saved}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm h-9 flex-1"
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Saved!
              </>
            ) : (
              <>
                <GitBranch className="w-3.5 h-3.5 mr-1.5" />
                Add Repo
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zinc-700 text-zinc-400 hover:text-white h-9"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
