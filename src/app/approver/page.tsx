"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TransactionPayload } from "@/types/transaction";
import { subscribeToTransactions } from "@/lib/firebase";
import { INITIAL_TRANSACTIONS } from "@/lib/demo-data";
import { ApproverPWA } from "@/components/approver/ApproverPWA";
import { ArrowLeft, Smartphone, ShieldCheck } from "lucide-react";

function ApproverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txId = searchParams.get("tx");
  const [transactions, setTransactions] = useState<TransactionPayload[]>(INITIAL_TRANSACTIONS);

  useEffect(() => {
    const unsubscribe = subscribeToTransactions(setTransactions);
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-2 sm:p-4 md:p-6 font-sans">
      {/* Mobile Top Navigation */}
      <div className="w-full max-w-md flex items-center justify-between mb-3 px-2">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Staff Desk</span>
        </button>

        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>ZERO-TRUST ENCLAVE</span>
        </div>
      </div>

      {/* Main Mobile Screen */}
      <ApproverPWA
        transactions={transactions}
        initialTransactionId={txId}
        isStandaloneMobile={true}
      />
    </div>
  );
}

export default function ApproverPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-xs">
          Loading Executive Passkey Enclave...
        </div>
      }
    >
      <ApproverContent />
    </Suspense>
  );
}
