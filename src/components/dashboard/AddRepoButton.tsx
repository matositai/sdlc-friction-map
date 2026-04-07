"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddRepoPanel } from "./AddRepoPanel";

interface AddRepoButtonProps {
  onAdded?: () => void;
}

export function AddRepoButton({ onAdded }: AddRepoButtonProps = {}) {
  const [open, setOpen] = useState(false);

  function handleAdded() {
    // Call parent callback if provided, otherwise reload (fallback for backward compat)
    if (onAdded) {
      onAdded();
    } else {
      window.location.reload();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center rounded-lg transition-all gap-2 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#69daff]"
        style={{ minHeight: "120px", border: "1px dashed var(--nc-ghost)", backgroundColor: "transparent" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(105,218,255,0.3)";
          (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(105,218,255,0.04)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--nc-ghost)";
          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
        }}
      >
        <Plus className="w-4 h-4 transition-colors" style={{ color: "rgba(255,255,255,0.2)" }} aria-hidden="true" />
        <p className="text-xs font-medium transition-colors" style={{ color: "rgba(255,255,255,0.25)" }}>Add Repo</p>
      </button>

      {open && (
        <AddRepoPanel
          onClose={() => setOpen(false)}
          onAdded={handleAdded}
        />
      )}
    </>
  );
}
