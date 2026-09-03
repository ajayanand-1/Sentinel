"use client";

import React, { useState, useEffect } from "react";
import { TransactionPayload } from "@/types/transaction";
import { subscribeToTransactions } from "@/lib/firebase";
import { Navbar, ActiveView } from "@/components/Navbar";
import { StaffDashboard } from "@/components/staff/StaffDashboard";
import { ApproverPWA } from "@/components/approver/ApproverPWA";
import { ShieldCheck, ShieldAlert, Sparkles, Smartphone, Monitor } from "lucide-react";

export default function HomePage() {
  const [transactions, setTransactions] = useState<TransactionPayload[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("split");
  const [activeTxForApprover, setActiveTxForApprover] = useState<string | null>(null);
  const [bannerAlert, setBannerAlert] = useState<{
    type: "success" | "danger" | "info";
    title: string;
    message: string;
  } | null>(null);

  const transactionsRef = React.useRef<TransactionPayload[]>([]);

  // Update ref whenever transactions change
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // Subscribe to real-time transactions stream (Firestore or Local Sync) once on mount
  useEffect(() => {
    let initialLoad = true;
    const unsubscribe = subscribeToTransactions((latest) => {
      const prev = transactionsRef.current;
      // If not initial load, detect changes for audio/banner alert
      if (!initialLoad && latest.length > 0 && prev.length > 0) {
        // Check if any transaction changed status
        for (const tx of latest) {
          const old = prev.find((t) => t.id === tx.id);
          if (old && old.status !== tx.status) {
            if (tx.status === "CRYPTOGRAPHICALLY_AUTHORIZED") {
              setBannerAlert({
                type: "success",
                title: "Cryptographic Authorization Confirmed",
                message: `Transaction ${tx.id} for $${tx.amount.toLocaleString()} was approved via Executive Passkey.`,
              });
            } else if (tx.status === "FLAGGED_AS_FRAUD") {
              setBannerAlert({
                type: "danger",
                title: "SECURITY ALERT: Fraud Flagged by Executive",
                message: `Transaction ${tx.id} was REJECTED by Executive. Reason: "${tx.fraudReport?.reason}". Transfer halted.`,
              });
            }
            break;
          }
        }
      }

      setTransactions(latest);
      initialLoad = false;
    });

    return () => unsubscribe();
  }, []);

  // Auto-dismiss banner alert
  useEffect(() => {
    if (bannerAlert) {
      const timer = setTimeout(() => setBannerAlert(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [bannerAlert]);

  const handleOpenApproverView = (txId: string) => {
    setActiveTxForApprover(txId);
    setActiveView("approver");
  };

  const pendingCount = transactions.filter(
    (t) => t.status === "PENDING_AUTHORIZATION"
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        activeView={activeView}
        onViewChange={setActiveView}
        pendingCount={pendingCount}
      />

      {/* Real-time Dynamic Alert Banner */}
      {bannerAlert && (
        <div
          className={`w-full py-3 px-4 border-b flex items-center justify-between transition-all animate-in slide-in-from-top duration-300 ${
            bannerAlert.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-200"
              : bannerAlert.type === "danger"
              ? "bg-red-950/80 border-red-500/40 text-red-200"
              : "bg-slate-900 border-slate-700 text-slate-200"
          }`}
        >
          <div className="mx-auto max-w-7xl flex items-center gap-3 w-full">
            {bannerAlert.type === "success" ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />
            )}
            <div className="text-xs">
              <span className="font-bold mr-1.5">{bannerAlert.title}:</span>
              <span>{bannerAlert.message}</span>
            </div>
            <button
              onClick={() => setBannerAlert(null)}
              className="ml-auto text-xs opacity-70 hover:opacity-100 text-slate-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* VIEW 1: Staff Desk Only */}
        {activeView === "staff" && (
          <StaffDashboard
            transactions={transactions}
            onOpenApproverView={handleOpenApproverView}
          />
        )}

        {/* VIEW 2: Approver PWA Only */}
        {activeView === "approver" && (
          <div className="py-4">
            <div className="mb-4 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                Mobile PWA Viewport Simulation
              </span>
            </div>
            <ApproverPWA
              transactions={transactions}
              initialTransactionId={activeTxForApprover}
            />
          </div>
        )}

        {/* VIEW 3: Split Dual View (Staff Desk on Left, Executive Mobile PWA on Right) */}
        {activeView === "split" && (
          <div className="space-y-4">
            {/* Split view explanation header */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">
                  Zero-Trust Out-of-Band Simulation Console
                </span>
                <span className="hidden md:inline">— Test both sides of the out-of-band architecture live on one screen.</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="flex items-center gap-1 text-slate-300">
                  <Monitor className="w-3.5 h-3.5 text-slate-400" /> Left: Staff Initiator
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <Smartphone className="w-3.5 h-3.5" /> Right: Executive PWA
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left Column: Staff Dashboard (8 cols on XL) */}
              <div className="xl:col-span-8">
                <StaffDashboard
                  transactions={transactions}
                  onOpenApproverView={(txId) => setActiveTxForApprover(txId)}
                />
              </div>

              {/* Right Column: Executive Mobile PWA (4 cols on XL) */}
              <div className="xl:col-span-4 xl:sticky xl:top-24">
                <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 p-2 shadow-2xl">
                  <ApproverPWA
                    transactions={transactions}
                    initialTransactionId={activeTxForApprover}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SENTINEL-OOB // Zero-Trust Biometric Transaction Authorization</span>
          <span>FIDO2 / WebAuthn Client API • Cloud Firestore</span>
        </div>
      </footer>
    </div>
  );
}
