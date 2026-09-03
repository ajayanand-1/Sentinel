"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ExternalLink,
  QrCode,
  FileBadge,
  AlertOctagon,
  ArrowUpRight,
  TrendingUp,
  Building,
  UserCheck,
  Zap,
} from "lucide-react";
import { TransactionPayload, TransactionStatus } from "@/types/transaction";
import { NewTransactionModal } from "./NewTransactionModal";
import { AuditCertificateModal } from "./AuditCertificateModal";
import { MobileBridgeModal } from "./MobileBridgeModal";

interface StaffDashboardProps {
  transactions: TransactionPayload[];
  onOpenApproverView: (txId: string) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  transactions,
  onOpenApproverView,
}) => {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTxForAudit, setSelectedTxForAudit] =
    useState<TransactionPayload | null>(null);
  const [selectedTxForBridge, setSelectedTxForBridge] =
    useState<TransactionPayload | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [lastInitiatedTx, setLastInitiatedTx] =
    useState<TransactionPayload | null>(null);

  // High-level KPI metrics
  const stats = useMemo(() => {
    let pendingCount = 0;
    let authorizedCount = 0;
    let fraudCount = 0;
    let totalAuthorizedVolume = 0;
    let preventedFraudVolume = 0;

    transactions.forEach((tx) => {
      if (tx.status === "PENDING_AUTHORIZATION") {
        pendingCount++;
      } else if (tx.status === "CRYPTOGRAPHICALLY_AUTHORIZED") {
        authorizedCount++;
        totalAuthorizedVolume += tx.amount;
      } else if (tx.status === "FLAGGED_AS_FRAUD") {
        fraudCount++;
        preventedFraudVolume += tx.amount;
      }
    });

    return {
      totalCount: transactions.length,
      pendingCount,
      authorizedCount,
      fraudCount,
      totalAuthorizedVolume,
      preventedFraudVolume,
    };
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.payeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.targetAccount.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.targetAccount.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || tx.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchQuery, statusFilter]);

  const handleTransactionCreated = (newTx: TransactionPayload) => {
    setLastInitiatedTx(newTx);
    // Optionally open the bridge right away so staff can test
    setSelectedTxForBridge(newTx);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Mission Context */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                <Zap className="h-3 w-3" />
                Staff Initiator Console
              </span>
              <span className="text-xs text-slate-400 font-mono">
                SEC-POLICY: ZERO-TRUST-OOB-01
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Treasury & High-Value Transfer Desk
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Every wire transfer requires cryptographic out-of-band authorization via the executive’s hardware biometric passkey. Conversational channels (video, voice, chat, email) are treated as untrusted.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-300 transition shrink-0"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Initiate New Transaction</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Pending Approvals */}
        <div className="rounded-2xl border border-amber-500/30 bg-slate-900/60 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending Authorization
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-300">
              {stats.pendingCount}
            </span>
            <span className="text-xs text-slate-400">awaiting passkey</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Out-of-band challenge dispatched</span>
          </div>
        </div>

        {/* Metric 2: Cryptographically Authorized */}
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Authorized Transfers
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">
              {stats.authorizedCount}
            </span>
            <span className="text-xs text-slate-400">FIDO2 verified</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Total: <span className="font-mono font-semibold text-slate-200">${stats.totalAuthorizedVolume.toLocaleString()} USD</span>
          </p>
        </div>

        {/* Metric 3: Fraud Interceptions */}
        <div className="rounded-2xl border border-red-500/30 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Fraud Interceptions
            </span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-red-400">
              {stats.fraudCount}
            </span>
            <span className="text-xs text-slate-400">attacks neutralized</span>
          </div>
          <p className="mt-2 text-[11px] text-red-400/90 font-medium">
            Saved: <span className="font-mono font-bold">${stats.preventedFraudVolume.toLocaleString()} USD</span>
          </p>
        </div>

        {/* Metric 4: Zero-Trust Security Health */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Enclave Integrity
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-cyan-300">
              100%
            </span>
            <span className="text-xs text-slate-400">tamper-proof</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            All approvals signed via Secure Enclave
          </p>
        </div>
      </div>

      {/* Main Ledger Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by payee, bank, account # or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                statusFilter === "ALL"
                  ? "bg-slate-800 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setStatusFilter("PENDING_AUTHORIZATION")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                statusFilter === "PENDING_AUTHORIZATION"
                  ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                  : "text-slate-400 hover:text-amber-300"
              }`}
            >
              Pending ({stats.pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("CRYPTOGRAPHICALLY_AUTHORIZED")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                statusFilter === "CRYPTOGRAPHICALLY_AUTHORIZED"
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30"
                  : "text-slate-400 hover:text-emerald-300"
              }`}
            >
              Authorized ({stats.authorizedCount})
            </button>
            <button
              onClick={() => setStatusFilter("FLAGGED_AS_FRAUD")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                statusFilter === "FLAGGED_AS_FRAUD"
                  ? "bg-red-500/20 text-red-300 font-semibold border border-red-500/30"
                  : "text-slate-400 hover:text-red-300"
              }`}
            >
              Fraud ({stats.fraudCount})
            </button>
          </div>
        </div>

        {/* Real-Time Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-medium">
                <th className="py-3 px-4">Transaction Details</th>
                <th className="py-3 px-4">Payee & Receiving Bank</th>
                <th className="py-3 px-4">Transfer Amount</th>
                <th className="py-3 px-4">Reported Origin Channel</th>
                <th className="py-3 px-4">Authorization Status</th>
                <th className="py-3 px-4 text-right">Actions & Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No transactions found matching criteria</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click &quot;Initiate New Transaction&quot; to test the Out-of-Band flow.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isPending = tx.status === "PENDING_AUTHORIZATION";
                  const isAuthorized = tx.status === "CRYPTOGRAPHICALLY_AUTHORIZED";
                  const isFraud = tx.status === "FLAGGED_AS_FRAUD";

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-800/30 transition group"
                    >
                      {/* ID & Timestamp */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-mono font-bold text-slate-200">
                          {tx.id}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5" suppressHydrationWarning>
                          {new Date(tx.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          • {new Date(tx.createdAt).toLocaleDateString()}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              tx.urgency === "CRITICAL"
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : tx.urgency === "HIGH"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {tx.urgency}
                          </span>
                        </div>
                      </td>

                      {/* Payee & Bank Details */}
                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <div className="font-bold text-white text-sm truncate">
                          {tx.payeeName}
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5 truncate">
                          <Building className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{tx.targetAccount.bankName}</span>
                          <span className="text-slate-600">({tx.targetAccount.country})</span>
                        </div>
                        <div className="font-mono text-slate-400 text-[11px] mt-0.5 truncate">
                          Acct: {tx.targetAccount.accountNumber}
                        </div>
                      </td>

                      {/* Amount & Currency */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-mono text-sm font-extrabold text-emerald-400">
                          {tx.currency} {tx.amount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Treasury Wire Transfer
                        </div>
                      </td>

                      {/* Reported Channel */}
                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-950 border border-slate-800 text-slate-300">
                          {tx.reportedChannel === "DEEPFAKE_VIDEO_CALL" && (
                            <span className="text-amber-400">🎥 Deepfake Video</span>
                          )}
                          {tx.reportedChannel === "VOICE_CLONE_PHONE" && (
                            <span className="text-amber-400">📞 Voice Clone Phone</span>
                          )}
                          {tx.reportedChannel === "COMPROMISED_EMAIL" && (
                            <span className="text-cyan-400">📧 Spoofed Email</span>
                          )}
                          {tx.reportedChannel === "URGENT_MESSAGING_SLACK_WHATSAPP" && (
                            <span className="text-purple-400">💬 Urgent DM</span>
                          )}
                          {tx.reportedChannel === "ROUTINE_INVOICE_PROCEDURE" && (
                            <span className="text-slate-400">📋 Standard PO</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 italic">
                          &quot;{tx.justification}&quot;
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        {isPending && (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-300">
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                            <span>Pending Biometrics</span>
                          </div>
                        )}

                        {isAuthorized && (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Authorized (FIDO2)</span>
                          </div>
                        )}

                        {isFraud && (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-xs font-bold text-red-300">
                            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                            <span>Flagged as Fraud</span>
                          </div>
                        )}

                        {/* Sub-status label */}
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          {isAuthorized && tx.authProof && (
                            <span>Signed by {tx.authProof.approverEmail.split("@")[0]}</span>
                          )}
                          {isPending && <span>Awaiting Executive Passkey</span>}
                          {isFraud && <span className="text-red-400">Impersonation Blocked</span>}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Certificate */}
                          <button
                            onClick={() => setSelectedTxForAudit(tx)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Inspect Cryptographic Certificate & WebAuthn Signature"
                          >
                            <FileBadge className="w-4 h-4 text-cyan-400" />
                          </button>

                          {/* Mobile Bridge / QR */}
                          <button
                            onClick={() => setSelectedTxForBridge(tx)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Generate Mobile Approver QR Code & URL"
                          >
                            <QrCode className="w-4 h-4 text-emerald-400" />
                          </button>

                          {/* Quick test jump */}
                          <button
                            onClick={() => onOpenApproverView(tx.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Open in Executive Approver PWA view"
                          >
                            <ArrowUpRight className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <NewTransactionModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={handleTransactionCreated}
      />

      <AuditCertificateModal
        transaction={selectedTxForAudit}
        isOpen={selectedTxForAudit !== null}
        onClose={() => setSelectedTxForAudit(null)}
      />

      <MobileBridgeModal
        transaction={selectedTxForBridge}
        isOpen={selectedTxForBridge !== null}
        onClose={() => setSelectedTxForBridge(null)}
        onOpenApproverView={onOpenApproverView}
      />
    </div>
  );
};
