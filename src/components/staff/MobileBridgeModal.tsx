"use client";

import React, { useState, useEffect } from "react";
import { X, Smartphone, QrCode, ExternalLink, Copy, Check, ArrowRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { TransactionPayload } from "@/types/transaction";

interface MobileBridgeModalProps {
  transaction: TransactionPayload | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenApproverView: (txId: string) => void;
}

export const MobileBridgeModal: React.FC<MobileBridgeModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onOpenApproverView,
}) => {
  const [approverUrl, setApproverUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (transaction && typeof window !== "undefined") {
      const url = `${window.location.origin}/approver?tx=${transaction.id}`;
      setApproverUrl(url);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(approverUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl text-slate-100 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Out-of-Band Mobile Bridge</h3>
              <p className="text-xs text-slate-400">Open on Executive Smartphone PWA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Scan this QR code with your mobile camera or copy the link to test hardware passkey biometric signing (FaceID / TouchID) on a real device.
        </p>

        {/* QR Code Card */}
        <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-white text-slate-950 shadow-inner mb-4">
          {approverUrl && (
            <QRCodeSVG
              value={approverUrl}
              size={180}
              level="M"
              includeMargin={false}
            />
          )}
          <span className="text-[11px] font-mono font-bold text-slate-800 mt-2">
            SCAN WITH PHONE CAMERA
          </span>
        </div>

        {/* Direct Link Input */}
        <div className="space-y-2 mb-4">
          <label className="block text-[11px] font-semibold uppercase text-slate-400">
            Direct Mobile PWA Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={approverUrl}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-300 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shrink-0"
              title="Copy URL"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => {
              onClose();
              onOpenApproverView(transaction.id);
            }}
            className="w-full py-2.5 px-4 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <span>Launch Approver PWA on this Screen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.open(approverUrl, "_blank")}
            className="w-full py-2 px-4 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in New Browser Window</span>
          </button>
        </div>
      </div>
    </div>
  );
};
