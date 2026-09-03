"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Smartphone,
  LayoutDashboard,
  Columns,
  Database,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { isFirebaseConfigured, resetDemoStore } from "@/lib/firebase";
import { FirebaseConfigModal } from "./FirebaseConfigModal";

export type ActiveView = "staff" | "approver" | "split";

interface NavbarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  pendingCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onViewChange,
  pendingCount = 0,
}) => {
  const [hasFirebase, setHasFirebase] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  useEffect(() => {
    setHasFirebase(isFirebaseConfigured());
  }, []);

  const handleResetData = () => {
    if (confirm("Reset transaction ledger to original default test fixtures?")) {
      resetDemoStore();
      window.location.reload();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Security Badge */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold tracking-wider text-white">
                  SENTINEL<span className="text-emerald-400">//OOB</span>
                </span>
                <span className="hidden sm:inline-block rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                  FIDO2 / WEBAUTHN
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-400">
                Zero-Trust Out-of-Band Transaction Authorization Portal
              </p>
            </div>
          </div>

          {/* Navigation View Switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
            <button
              onClick={() => onViewChange("staff")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeView === "staff"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Staff Desk</span>
              {pendingCount > 0 && (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    activeView === "staff"
                      ? "bg-slate-950 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onViewChange("approver")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeView === "approver"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Executive PWA</span>
            </button>

            <button
              onClick={() => onViewChange("split")}
              className={`hidden lg:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeView === "split"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
              title="View Staff Desktop and Executive Mobile side-by-side for live testing"
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Dual View</span>
              <Sparkles className="h-3 w-3 text-amber-300" />
            </button>
          </div>

          {/* Right Action Items: Backend Status & Tools */}
          <div className="flex items-center gap-2">
            {/* Firebase / Local Enclave Status Indicator */}
            <button
              onClick={() => setConfigModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700 hover:text-white transition"
              title="Click to view or edit Firebase connection settings"
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    hasFirebase ? "bg-emerald-400" : "bg-cyan-400"
                  }`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    hasFirebase ? "bg-emerald-500" : "bg-cyan-500"
                  }`}
                />
              </span>
              <span className="hidden sm:inline font-mono text-[11px]">
                {hasFirebase ? "Firestore: Live" : "Enclave: Local Sync"}
              </span>
              <Database className="h-3 w-3 text-slate-400" />
            </button>

            {/* Reset Data Button */}
            <button
              onClick={handleResetData}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700 transition"
              title="Reset sample data"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <FirebaseConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
      />
    </>
  );
};
