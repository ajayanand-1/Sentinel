"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TransactionPayload } from "@/types/transaction";
import { subscribeToTransactions } from "@/lib/firebase";
import { INITIAL_TRANSACTIONS } from "@/lib/demo-data";
import { Navbar } from "@/components/Navbar";
import { StaffDashboard } from "@/components/staff/StaffDashboard";

export default function StaffPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionPayload[]>(INITIAL_TRANSACTIONS);

  useEffect(() => {
    const unsubscribe = subscribeToTransactions(setTransactions);
    return () => unsubscribe();
  }, []);

  const handleOpenApproverView = (txId: string) => {
    router.push(`/approver?tx=${txId}`);
  };

  const pendingCount = transactions.filter(
    (t) => t.status === "PENDING_AUTHORIZATION"
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeView="staff"
        onViewChange={(view) => {
          if (view === "approver") router.push("/approver");
          else router.push("/");
        }}
        pendingCount={pendingCount}
      />
      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <StaffDashboard
          transactions={transactions}
          onOpenApproverView={handleOpenApproverView}
        />
      </main>
    </div>
  );
}
