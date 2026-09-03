"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  ShieldCheck,
  AlertTriangle,
  Building2,
  DollarSign,
  FileText,
  Radio,
  Fingerprint,
  Loader2,
} from "lucide-react";
import {
  TransactionPayload,
  CommunicationChannel,
  UrgencyLevel,
} from "@/types/transaction";
import { computePayloadHash } from "@/lib/crypto";
import { createTransaction } from "@/lib/firebase";

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tx: TransactionPayload) => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [payeeName, setPayeeName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [swiftBic, setSwiftBic] = useState("");
  const [country, setCountry] = useState("United States");
  const [amount, setAmount] = useState<string>("250000");
  const [currency, setCurrency] = useState("USD");
  const [justification, setJustification] = useState("");
  const [urgency, setUrgency] = useState<UrgencyLevel>("HIGH");
  const [reportedChannel, setReportedChannel] =
    useState<CommunicationChannel>("DEEPFAKE_VIDEO_CALL");
  const [computedHash, setComputedHash] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill sample values for swift demonstration
  const handleLoadDemoValues = () => {
    setPayeeName("Aether Dynamics Technologies Pte. Ltd.");
    setBankName("Standard Chartered Bank Singapore");
    setAccountNumber("01-928-44810-92");
    setRoutingNumber("SCBLSGSGXXX");
    setSwiftBic("SCBLSGSG");
    setCountry("Singapore");
    setAmount("340000");
    setCurrency("USD");
    setJustification(
      "Immediate manufacturing advance invoice wire requested during executive Zoom call."
    );
    setUrgency("CRITICAL");
    setReportedChannel("DEEPFAKE_VIDEO_CALL");
  };

  // Re-calculate the canonical SHA-256 payload hash in real-time as user types
  useEffect(() => {
    let isCancelled = false;
    async function updateHash() {
      const parsedAmount = parseFloat(amount) || 0;
      const previewPayload = {
        payeeName: payeeName.trim(),
        targetAccount: {
          accountNumber: accountNumber.trim(),
          routingNumber: routingNumber.trim(),
          bankName: bankName.trim(),
          swiftBic: swiftBic.trim(),
          country: country.trim(),
        },
        amount: parsedAmount,
        currency,
        justification: justification.trim(),
        urgency,
        reportedChannel,
        initiator: {
          name: "Finance Controller",
          email: "finance.ops@enterprise-internal.com",
          department: "Corporate Treasury",
        },
      };

      try {
        const hash = await computePayloadHash(previewPayload);
        if (!isCancelled) {
          setComputedHash(hash);
        }
      } catch (err) {
        console.error("Hash preview error:", err);
      }
    }

    updateHash();
    return () => {
      isCancelled = true;
    };
  }, [
    payeeName,
    bankName,
    accountNumber,
    routingNumber,
    swiftBic,
    country,
    amount,
    currency,
    justification,
    urgency,
    reportedChannel,
  ]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!payeeName.trim() || !accountNumber.trim() || isNaN(numAmount) || numAmount <= 0) {
      alert("Please fill in the Payee Name, Account Details, and a valid Transfer Amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const txId = `tx-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newTx: TransactionPayload = {
        id: txId,
        payeeName: payeeName.trim(),
        targetAccount: {
          accountNumber: accountNumber.trim(),
          routingNumber: routingNumber.trim(),
          bankName: bankName.trim() || "Target Commercial Bank",
          swiftBic: swiftBic.trim() || "COMMUS33",
          country: country.trim(),
        },
        amount: numAmount,
        currency,
        justification:
          justification.trim() || "Corporate Treasury wire transfer authorization.",
        urgency,
        reportedChannel,
        initiator: {
          name: "Finance Controller",
          email: "finance.ops@enterprise-internal.com",
          department: "Corporate Treasury",
        },
        payloadHash: computedHash,
        status: "PENDING_AUTHORIZATION",
        createdAt: now,
        updatedAt: now,
      };

      await createTransaction(newTx);
      onSuccess(newTx);
      onClose();
    } catch (err) {
      console.error("Failed to initiate transaction:", err);
      alert("Error initiating transaction. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Initiate Out-of-Band Transaction
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Zero-Trust Enclave
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Payload will be hashed with SHA-256 and dispatched to the Executive Passkey approver
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

        {/* Demo pre-fill pill */}
        <div className="px-6 pt-4 pb-0 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Live Canonical Pre-Computation Active
          </span>
          <button
            type="button"
            onClick={handleLoadDemoValues}
            className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
          >
            + Auto-Fill Deepfake Threat Scenario
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Section 1: Payee Information */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              Payee & Beneficiary Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Payee Entity Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Quantum Industrial Ltd."
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Bank Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. JPMorgan Chase, DBS Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Account Number / IBAN *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4092-1829-4481-9920"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Routing / SWIFT
                  </label>
                  <input
                    type="text"
                    placeholder="CHASUS33"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Jurisdiction
                  </label>
                  <input
                    type="text"
                    placeholder="United States"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Financial Amount & Priority */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Transfer Amount & Urgency Rating
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 flex gap-2">
                <div className="w-28">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="SGD">SGD (S$)</option>
                    <option value="CHF">CHF (Fr)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Transfer Amount *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-emerald-400 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Urgency Level
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="STANDARD">Standard</option>
                  <option value="HIGH">High Priority</option>
                  <option value="CRITICAL">Critical (Immediate Wire)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Out-of-Band Threat Context */}
          <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Communication Origin & Zero-Trust Verification Context
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reported Ingress Channel (Where did the instruction arrive?)
                </label>
                <select
                  value={reportedChannel}
                  onChange={(e) => setReportedChannel(e.target.value as CommunicationChannel)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-amber-300 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="DEEPFAKE_VIDEO_CALL">🎥 Deepfake Video Meeting (Purported Executive)</option>
                  <option value="VOICE_CLONE_PHONE">📞 Voice Clone Phone Call / Audio Message</option>
                  <option value="COMPROMISED_EMAIL">📧 Compromised Executive Email (BEC)</option>
                  <option value="URGENT_MESSAGING_SLACK_WHATSAPP">💬 Urgent WhatsApp / Slack DM</option>
                  <option value="ROUTINE_INVOICE_PROCEDURE">📋 Standard Approved Purchase Order</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  The executive will see this alert on their mobile PWA before signing.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Justification / Transaction Purpose
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Contractual acquisition escrow funding..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Cryptographic SHA-256 Digest Preview */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <Fingerprint className="w-3.5 h-3.5" />
                Deterministic SHA-256 Digest (WebAuthn Signing Challenge)
              </span>
              <span className="text-[10px] text-slate-400">Canonical JSON</span>
            </div>
            <div className="text-xs text-slate-300 break-all bg-slate-900/80 p-2 rounded border border-slate-800">
              {computedHash || "Computing..."}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Challenge...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Dispatch for Biometric Approval
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
