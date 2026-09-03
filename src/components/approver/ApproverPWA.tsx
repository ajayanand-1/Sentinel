"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  Building,
  DollarSign,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Smartphone,
  Copy,
  Check,
  Sparkles,
  KeyRound,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { TransactionPayload } from "@/types/transaction";
import {
  signTransactionWithWebAuthn,
  registerExecutivePasskey,
  isWebAuthnAvailable,
} from "@/lib/crypto";
import { approveTransactionWithProof, flagTransactionAsFraud } from "@/lib/firebase";

interface ApproverPWAProps {
  transactions: TransactionPayload[];
  initialTransactionId?: string | null;
  isStandaloneMobile?: boolean;
}

export const ApproverPWA: React.FC<ApproverPWAProps> = ({
  transactions,
  initialTransactionId,
  isStandaloneMobile = false,
}) => {
  const [selectedTxId, setSelectedTxId] = useState<string>("");
  const [isBiometricPrompting, setIsBiometricPrompting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("Never Authorized / Synthetic Impersonation Attempt");
  const [showRejectSheet, setShowRejectSheet] = useState(false);
  const [showPasskeyRegister, setShowPasskeyRegister] = useState(false);
  const [executiveEmail, setExecutiveEmail] = useState("ceo@enterprise-corp.com");
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [hasWebAuthnSupport, setHasWebAuthnSupport] = useState(true);

  // Pick transaction: from prop, or first pending, or first in list
  useEffect(() => {
    if (initialTransactionId && transactions.some((t) => t.id === initialTransactionId)) {
      setSelectedTxId(initialTransactionId);
      return;
    }

    const pending = transactions.find((t) => t.status === "PENDING_AUTHORIZATION");
    if (pending) {
      setSelectedTxId(pending.id);
    } else if (transactions.length > 0 && !selectedTxId) {
      setSelectedTxId(transactions[0].id);
    }
  }, [initialTransactionId, transactions, selectedTxId]);

  useEffect(() => {
    isWebAuthnAvailable().then(setHasWebAuthnSupport);
  }, []);

  const currentTx = transactions.find((t) => t.id === selectedTxId) || transactions[0];

  // Handle Biometric Approval via WebAuthn
  const handleApproveWithWebAuthn = async () => {
    if (!currentTx || currentTx.status !== "PENDING_AUTHORIZATION") return;

    setIsBiometricPrompting(true);
    try {
      // 1. Invoke WebAuthn cryptographic passkey assertion over the SHA-256 payload digest
      const proof = await signTransactionWithWebAuthn(
        currentTx.payloadHash,
        executiveEmail
      );

      // 2. Commit cryptographic assertion to Firestore
      await approveTransactionWithProof(currentTx.id, proof);
    } catch (error) {
      console.error("WebAuthn biometric signing failed:", error);
      alert("Biometric authorization failed or was cancelled.");
    } finally {
      setIsBiometricPrompting(false);
    }
  };

  // Handle Fraud Rejection
  const handleConfirmFraudRejection = async () => {
    if (!currentTx || currentTx.status !== "PENDING_AUTHORIZATION") return;

    setIsRejecting(true);
    try {
      const now = new Date().toISOString();
      await flagTransactionAsFraud(currentTx.id, {
        flaggedAt: now,
        flaggedBy: executiveEmail,
        reason: rejectReason,
        details: "Executive explicitly rejected the transfer request via Out-of-Band Mobile PWA.",
        suspectedChannel: currentTx.reportedChannel,
      });
      setShowRejectSheet(false);
    } catch (error) {
      console.error("Fraud flag failed:", error);
    } finally {
      setIsRejecting(false);
    }
  };

  // Handle Device Passkey Registration
  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    try {
      const res = await registerExecutivePasskey(executiveEmail, "Executive Approver");
      setPasskeyNotice(res.message);
      setTimeout(() => {
        setShowPasskeyRegister(false);
        setPasskeyNotice(null);
      }, 2000);
    } catch (err) {
      console.error("Passkey registration failed:", err);
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleCopyHash = () => {
    if (!currentTx) return;
    navigator.clipboard.writeText(currentTx.payloadHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  if (!currentTx) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 min-h-[400px]">
        <Smartphone className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm font-semibold text-white">No transactions in queue</p>
        <p className="text-xs text-slate-500 mt-1">
          Initiate a new transaction from the Staff Dashboard to review on this mobile PWA.
        </p>
      </div>
    );
  }

  const isPending = currentTx.status === "PENDING_AUTHORIZATION";
  const isAuthorized = currentTx.status === "CRYPTOGRAPHICALLY_AUTHORIZED";
  const isFraud = currentTx.status === "FLAGGED_AS_FRAUD";

  return (
    <div className="mx-auto w-full max-w-md bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[700px] relative">
      {/* Mobile Top App Bar / Dynamic Notch Simulation */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>SENTINEL MOBILE</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                PWA
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Executive Passkey Portal</p>
          </div>
        </div>

        {/* Executive Identity Pill */}
        <button
          onClick={() => setShowPasskeyRegister(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 transition"
          title="Manage Hardware Passkeys"
        >
          <KeyRound className="w-3 h-3 text-cyan-400" />
          <span className="font-medium truncate max-w-[100px]">Passkey Active</span>
        </button>
      </div>

      {/* Transaction Selector Dropdown (for switching between pending requests on mobile) */}
      <div className="bg-slate-900/40 border-b border-slate-800/60 px-4 py-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">Reviewing:</span>
        <div className="relative">
          <select
            value={selectedTxId}
            onChange={(e) => setSelectedTxId(e.target.value)}
            className="bg-slate-900 text-xs font-mono font-bold text-white pl-2 pr-6 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
          >
            {transactions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} ({t.status === "PENDING_AUTHORIZATION" ? "⏳ Pending" : t.status === "CRYPTOGRAPHICALLY_AUTHORIZED" ? "✅ Signed" : "🚫 Fraud"})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
        </div>
      </div>

      {/* Scrollable Mobile Body */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Status Callout Banner */}
        {isPending && (
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-amber-600/5 p-3.5 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-amber-300">
                Action Required: Biometric Passkey Signature
              </p>
              <p className="text-[11px] text-amber-400/80 mt-0.5 leading-snug">
                Review beneficiary details. Your device&apos;s Secure Enclave will sign the payload hash upon authorization.
              </p>
            </div>
          </div>
        )}

        {isAuthorized && (
          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-emerald-300">
              Cryptographically Authorized
            </h3>
            <p className="text-[11px] text-slate-300">
              Signed by <span className="font-semibold text-emerald-400">{currentTx.authProof?.approverEmail}</span> via Secure Enclave ({currentTx.authProof?.signatureAlgorithm}).
            </p>
            <div className="pt-1 text-[10px] text-slate-400 font-mono">
              Timestamp: {currentTx.authProof ? new Date(currentTx.authProof.approvedAt).toLocaleTimeString() : ""}
            </div>
          </div>
        )}

        {isFraud && (
          <div className="rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-500/15 to-red-600/10 p-4 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-red-300">
              Intercepted: Flagged as Fraud
            </h3>
            <p className="text-[11px] text-red-300/90 font-medium">
              Reason: &quot;{currentTx.fraudReport?.reason}&quot;
            </p>
            <p className="text-[10px] text-slate-400">
              Finance Treasury desk has been locked for this transfer.
            </p>
          </div>
        )}

        {/* Transfer Amount Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-center shadow-lg">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
            Requested Transfer Volume
          </span>
          <div className="mt-1 font-mono text-3xl font-extrabold text-emerald-400 flex items-center justify-center gap-1">
            <span className="text-lg font-bold text-slate-400">{currentTx.currency}</span>
            <span>{currentTx.amount.toLocaleString()}</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-800 text-slate-300">
            <span>Treasury Wire Authorization</span>
          </div>
        </div>

        {/* Payee & Destination Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Beneficiary Entity
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {currentTx.targetAccount.country}
            </span>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white leading-tight">
              {currentTx.payeeName}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
              <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{currentTx.targetAccount.bankName}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[9px] uppercase text-slate-500 block">Account Number</span>
              <span className="font-bold text-slate-200 text-[11px] truncate block mt-0.5">
                {currentTx.targetAccount.accountNumber}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-[9px] uppercase text-slate-500 block">Routing / SWIFT</span>
              <span className="font-bold text-slate-200 text-[11px] truncate block mt-0.5">
                {currentTx.targetAccount.routingNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Security Warning Box: Ingress Threat Channel */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Out-of-Band Verification Advisory</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Staff logged that this transfer instruction was reported via:
          </p>
          <div className="p-2 rounded-lg bg-slate-950/80 border border-amber-500/20 text-xs font-semibold text-amber-300 flex items-center gap-2">
            {currentTx.reportedChannel === "DEEPFAKE_VIDEO_CALL" && "🎥 Deepfake Video Meeting"}
            {currentTx.reportedChannel === "VOICE_CLONE_PHONE" && "📞 Voice Clone / Audio Call"}
            {currentTx.reportedChannel === "COMPROMISED_EMAIL" && "📧 Spoofed Executive Email"}
            {currentTx.reportedChannel === "URGENT_MESSAGING_SLACK_WHATSAPP" && "💬 Urgent Messaging DM"}
            {currentTx.reportedChannel === "ROUTINE_INVOICE_PROCEDURE" && "📋 Standard Purchase Order"}
          </div>
          <p className="text-[10px] text-slate-400 italic">
            &quot;{currentTx.justification}&quot;
          </p>
        </div>

        {/* Cryptographic Digest Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span className="flex items-center gap-1 text-cyan-400 font-semibold">
              <Fingerprint className="w-3.5 h-3.5" />
              Payload SHA-256 Digest
            </span>
            <button
              onClick={handleCopyHash}
              className="hover:text-white flex items-center gap-1 text-[10px]"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedHash ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="text-[11px] text-slate-300 break-all bg-slate-900/80 p-2 rounded border border-slate-800">
            {currentTx.payloadHash}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer Action Bar */}
      {isPending && (
        <div className="bg-slate-900/95 border-t border-slate-800/80 p-4 space-y-2">
          {/* Main Action: Passkey Biometric Sign & Approve */}
          <button
            onClick={handleApproveWithWebAuthn}
            disabled={isBiometricPrompting}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition active:scale-[0.98] disabled:opacity-50"
          >
            {isBiometricPrompting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Authenticating Passkey...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5 stroke-[2.5]" />
                <span>Biometric Passkey Sign & Authorize</span>
              </>
            )}
          </button>

          {/* Secondary Action: Flag as Fraud */}
          <button
            onClick={() => setShowRejectSheet(true)}
            disabled={isBiometricPrompting}
            className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <XCircle className="w-4 h-4" />
            <span>Reject & Flag as Fraud</span>
          </button>
        </div>
      )}

      {/* Reject & Flag Fraud Bottom Sheet Modal */}
      {showRejectSheet && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col justify-end p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Escalate & Flag Fraud</h3>
                <p className="text-xs text-slate-400">Lock transfer & notify Treasury IT</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If you did NOT instruct this transfer or suspect executive impersonation (deepfake voice/video), selecting a reason will immediately revoke this transaction in Firestore.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Primary Threat Classification:
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="Never Authorized / Synthetic Impersonation Attempt">
                  🚨 Never Authorized / Synthetic Voice or Video Impersonation
                </option>
                <option value="Compromised Executive Account / Spoofed Email">
                  📧 Compromised Executive Account or Email Spoof
                </option>
                <option value="Incorrect Bank Details or Suspicious Destination">
                  🏦 Incorrect Bank Details / Suspicious Destination
                </option>
                <option value="Duplicate or Erroneous Transaction">
                  🔄 Duplicate or Erroneous Transaction
                </option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectSheet(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFraudRejection}
                disabled={isRejecting}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                <span>Confirm & Flag Fraud</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passkey Registration / Hardware Enclave Sheet */}
      {showPasskeyRegister && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col justify-end p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Hardware Passkey Security</h3>
              </div>
              <button
                onClick={() => setShowPasskeyRegister(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Done
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This executive device uses FIDO2 / WebAuthn. Private cryptographic keys are locked in your hardware Secure Enclave and can never leave the device.
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <span className="text-slate-400 text-[10px] uppercase">Signer Email</span>
              <input
                type="email"
                value={executiveEmail}
                onChange={(e) => setExecutiveEmail(e.target.value)}
                className="w-full bg-transparent font-medium text-slate-200 focus:outline-none border-b border-slate-700 pb-1"
              />
            </div>

            {passkeyNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{passkeyNotice}</span>
              </div>
            )}

            <button
              onClick={handleRegisterPasskey}
              disabled={isRegisteringPasskey}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
            >
              {isRegisteringPasskey ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Fingerprint className="w-4 h-4" />
              )}
              <span>Register / Test Hardware Passkey</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
