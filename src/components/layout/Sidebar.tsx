"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Zap,
  BarChart3,
  Settings,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipelines", label: "Studios", icon: GitBranch },
  { href: "/friction", label: "Friction Map", icon: Activity },
  { href: "/metrics", label: "DORA Metrics", icon: BarChart3 },
  { href: "/ai-analysis", label: "AI Analysis", icon: Zap },
  { href: "/settings", label: "Live Mode", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-56 flex flex-col z-30"
      style={{ backgroundColor: "var(--nc-surface-0)" }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--nc-cyan), var(--nc-cyan-dim))", boxShadow: "0 0 12px rgba(105,218,255,0.3)" }}
          >
            <Activity className="w-4 h-4" style={{ color: "var(--nc-void)" }} />
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight font-heading" style={{ color: "var(--foreground)" }}>SDLC Friction</p>
            <p className="text-[10px] leading-tight" style={{ color: "var(--muted-foreground)" }}>EA Developer Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 px-3 py-2 rounded text-sm transition-all")}
              style={active ? {
                backgroundColor: "rgba(105,218,255,0.1)",
                color: "var(--nc-cyan)",
              } : {
                color: "var(--muted-foreground)",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--nc-surface-2)";
                  (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)";
                }
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {label}
              {active && (
                <span
                  className="ml-auto w-1 h-4 rounded-full"
                  style={{ backgroundColor: "var(--nc-cyan)", boxShadow: "0 0 8px var(--nc-cyan)" }}
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid var(--nc-ghost)" }}>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>6 studios · GitHub · GitLab</p>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>AWS · Azure</p>
      </div>
    </aside>
  );
}
