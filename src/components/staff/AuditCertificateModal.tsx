"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  KeyRound,
  FileCheck2,
  CheckCircle2,
  AlertOctagon,
  Copy,
  Check,
  Cpu,
  Lock,
} from "lucide-react";
import { TransactionPayload } from "@/types/transaction";
import { verifySignatureIntegrity, computePayloadHash } from "@/lib/crypto";

interface AuditCertificateModalProps {
  transaction: TransactionPayload | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditCertificateModal: React.FC<AuditCertificateModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    tested: boolean;
    valid: boolean;
    message: string;
  } | null>(null);

  if (!isOpen || !transaction) return null;

  const proof = transaction.authProof;
  const isAuthorized = transaction.status === "CRYPTOGRAPHICALLY_AUTHORIZED";

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRunIntegrityCheck = async () => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // 1. Re-calculate SHA-256 hash from transaction payload
      const recomputedHash = await computePayloadHash({
        payeeName: transaction.payeeName,
        targetAccount: transaction.targetAccount,
        amount: transaction.amount,
        currency: transaction.currency,
        justification: transaction.justification,
        urgency: transaction.urgency,
        reportedChannel: transaction.reportedChannel,
        initiator: transaction.initiator,
      });

      // 2. Compare against signed challenge
      const check = verifySignatureIntegrity(transaction);

      if (check.isValid && recomputedHash === transaction.payloadHash) {
        setVerificationResult({
          tested: true,
          valid: true,
          message:
            "Mathematical Verification Passed: The WebAuthn FIDO2 signature strictly signs the recomputed SHA-256 canonical digest. Zero tampering detected.",
        });
      } else {
        setVerificationResult({
          tested: true,
          valid: false,
          message: check.reason || "Payload hash mismatch detected.",
        });
      }
    } catch (e) {
      setVerificationResult({
        tested: true,
        valid: false,
        message: "Verification failed due to calculation exception.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Cryptographic Audit Certificate
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  FIDO2 IMMUTABLE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transaction ID: <span className="font-mono text-slate-200">{transaction.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status Alert Banner */}
          {isAuthorized ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-300">
                  Transaction Cryptographically Authorized by Executive
                </p>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">
                  Signed on {proof ? new Date(proof.approvedAt).toLocaleString() : "N/A"} using hardware-backed private key stored in device Secure Enclave.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
              <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-300">
                  Pending Biometric Passkey Signing
                </p>
                <p className="text-[11px] text-amber-400/80 mt-0.5">
                  No cryptographic signature has been submitted yet. The transaction payload remains in pending state awaiting executive biometric challenge approval.
                </p>
              </div>
            </div>
          )}

          {/* Core Transaction Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
                Payee
              </span>
              <span className="font-bold text-white truncate block mt-0.5">
                {transaction.payeeName}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
                Amount
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm block mt-0.5">
                {transaction.currency} {transaction.amount.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
                Target Bank
              </span>
              <span className="font-medium text-slate-200 truncate block mt-0.5">
                {transaction.targetAccount.bankName}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
                Account / IBAN
              </span>
              <span className="font-mono text-slate-300 truncate block mt-0.5">
                {transaction.targetAccount.accountNumber}
              </span>
            </div>
          </div>

          {/* Cryptographic Proof Details */}
          {proof ? (
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                FIDO2 / WebAuthn Hardware Assertion
              </h3>

              <div className="space-y-2.5 font-mono text-[11px]">
                {/* Canonical SHA-256 Digest */}
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase">Canonical SHA-256 Digest (Challenge)</span>
                    <button
                      onClick={() => handleCopy(proof.challengeSigned, "challenge")}
                      className="hover:text-white flex items-center gap-1 text-[10px]"
                    >
                      {copiedField === "challenge" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedField === "challenge" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-cyan-300 break-all">
                    {proof.challengeSigned}
                  </div>
                </div>

                {/* Raw Signature */}
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase">WebAuthn Hardware Signature (Base64URL)</span>
                    <button
                      onClick={() => handleCopy(proof.rawSignature, "signature")}
                      className="hover:text-white flex items-center gap-1 text-[10px]"
                    >
                      {copiedField === "signature" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedField === "signature" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-emerald-300 break-all text-[10px]">
                    {proof.rawSignature}
                  </div>
                </div>

                {/* Enclave Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Algorithm</span>
                    <span className="text-slate-200 font-semibold">{proof.signatureAlgorithm}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">User Verification</span>
                    <span className="text-emerald-400 font-semibold">
                      {proof.userVerified ? "Verified (Biometric)" : "Present"}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Approver Identity</span>
                    <span className="text-slate-200 font-semibold truncate block">
                      {proof.approverEmail}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs">
              <span className="text-slate-400 block text-[10px] uppercase mb-1">
                Canonical SHA-256 Digest Waiting for Signature:
              </span>
              <div className="p-2 rounded bg-slate-900 text-amber-300 break-all">
                {transaction.payloadHash}
              </div>
            </div>
          )}

          {/* Live Mathematical Verification Checker */}
          {proof && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">
                    Live Cryptographic Verifier
                  </span>
                </div>
                <button
                  onClick={handleRunIntegrityCheck}
                  disabled={isVerifying}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  {isVerifying ? "Verifying Math..." : "Verify Hash & Signature"}
                </button>
              </div>

              {verificationResult && (
                <div
                  className={`p-3 rounded-lg border text-xs font-mono leading-relaxed ${
                    verificationResult.valid
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {verificationResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertOctagon className="w-4 h-4 text-red-400" />
                    )}
                    <span>
                      {verificationResult.valid
                        ? "100% CRYPTOGRAPHIC MATCH CONFIRMED"
                        : "SIGNATURE INTEGRITY CHECK FAILED"}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90">{verificationResult.message}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Immutable Ledger Entry in Cloud Firestore</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Close Certificate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
