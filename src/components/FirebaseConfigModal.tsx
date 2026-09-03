"use client";

import React, { useState, useEffect } from "react";
import { X, Cloud, ShieldCheck, Database, Check, AlertCircle } from "lucide-react";
import { isFirebaseConfigured } from "@/lib/firebase";

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [hasFirebase, setHasFirebase] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [authDomain, setAuthDomain] = useState("");
  const [storageBucket, setStorageBucket] = useState("");
  const [appId, setAppId] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setHasFirebase(isFirebaseConfigured());
    const saved = localStorage.getItem("sentinel_custom_firebase_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setApiKey(parsed.apiKey || "");
        setProjectId(parsed.projectId || "");
        setAuthDomain(parsed.authDomain || "");
        setStorageBucket(parsed.storageBucket || "");
        setAppId(parsed.appId || "");
      } catch (e) {
        console.error(e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !projectId) {
      alert("Please provide at least an API Key and Project ID.");
      return;
    }

    const config = {
      apiKey,
      projectId,
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      storageBucket: storageBucket || `${projectId}.appspot.com`,
      appId: appId || "1:1234567890:web:abcdef",
    };

    localStorage.setItem("sentinel_custom_firebase_config", JSON.stringify(config));
    setSavedSuccess(true);
    setHasFirebase(true);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleClear = () => {
    localStorage.removeItem("sentinel_custom_firebase_config");
    setApiKey("");
    setProjectId("");
    setAuthDomain("");
    setStorageBucket("");
    setAppId("");
    setHasFirebase(false);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Backend & Firebase Configuration</h3>
              <p className="text-xs text-slate-400">Manage Cloud Firestore & Local Reactive Sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner */}
        <div className="mb-5 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
          <div className="flex items-start gap-3">
            {hasFirebase ? (
              <Cloud className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {hasFirebase ? "Cloud Firestore Engine Active" : "Hardware Enclave Local Sync Active"}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                    hasFirebase
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  }`}
                >
                  {hasFirebase ? "Connected" : "Simulated Local OOB"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {hasFirebase
                  ? "Transactions and WebAuthn cryptographic assertions are syncing to your Google Cloud Firestore database in real-time."
                  : "All transaction state transitions and WebAuthn signatures are running locally in real-time across tabs via BroadcastChannel. You can test end-to-end immediately, or connect your Firebase credentials below."}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Firebase API Key (or paste from Firebase Console)
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSyA..."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Project ID</label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="sentinel-oob-prod"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">App ID</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1:123456789:web:..."
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between">
            {hasFirebase && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-red-400 hover:text-red-300 underline"
              >
                Disconnect & Use Local Store
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Saved!
                  </>
                ) : (
                  "Save & Connect"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
