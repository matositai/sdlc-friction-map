const STORAGE_KEY = "custom_repos_v1";

export interface TrackedCustomRepo {
  id: string;
  provider: "github" | "gitlab" | "azure" | "aws";
  displayName: string;
  color: string;
  eaAnalogue?: string;
  github?: { owner: string; repo: string; token?: string };
  gitlab?: { projectPath: string; host?: string; token?: string };
  azure?: { org: string; project: string; token: string };
  aws?: { accessKeyId: string; secretAccessKey: string; region: string };
}

export function getCustomRepos(): TrackedCustomRepo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TrackedCustomRepo[]) : [];
  } catch {
    return [];
  }
}

export function addCustomRepo(repo: TrackedCustomRepo): void {
  const existing = getCustomRepos();
  existing.push(repo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function removeCustomRepo(id: string): void {
  const existing = getCustomRepos().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}
