import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  Firestore,
  query,
  orderBy,
  Unsubscribe,
} from "firebase/firestore";
import { TransactionPayload, WebAuthnProof, FraudReport } from "@/types/transaction";
import { INITIAL_TRANSACTIONS } from "./demo-data";

const LOCAL_STORAGE_KEY = "sentinel_oob_transactions_v1";
const BROADCAST_CHANNEL_NAME = "sentinel_oob_sync";

// Firebase configuration from environment or localStorage
function getFirebaseConfig() {
  if (typeof window !== "undefined") {
    const savedCustomConfig = localStorage.getItem("sentinel_custom_firebase_config");
    if (savedCustomConfig) {
      try {
        return JSON.parse(savedCustomConfig);
      } catch (e) {
        console.error("Failed to parse custom firebase config:", e);
      }
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:abcdef",
    };
  }

  return null;
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

export function initFirebase(): { app: FirebaseApp | null; db: Firestore | null } {
  if (firestoreDb) return { app: firebaseApp, db: firestoreDb };

  const config = getFirebaseConfig();
  if (!config) return { app: null, db: null };

  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
    firestoreDb = getFirestore(firebaseApp);
    return { app: firebaseApp, db: firestoreDb };
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return { app: null, db: null };
  }
}

/* =========================================================================
   Local Fallback Store (Synchronized across tabs via BroadcastChannel & LocalStorage)
   ========================================================================= */

function getLocalTransactions(): TransactionPayload[] {
  if (typeof window === "undefined") return INITIAL_TRANSACTIONS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read local transactions:", e);
    return INITIAL_TRANSACTIONS;
  }
}

function saveLocalTransactions(txs: TransactionPayload[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(txs));
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: "UPDATE", transactions: txs });
      channel.close();
    }
  } catch (e) {
    console.error("Failed to save local transactions:", e);
  }
}

/* =========================================================================
   Unified Reactive Data Service
   ========================================================================= */

/**
 * Subscribes to the real-time stream of transactions.
 * Seamlessly routes to Firestore onSnapshot if configured, or local BroadcastChannel.
 */
export function subscribeToTransactions(
  callback: (transactions: TransactionPayload[]) => void
): () => void {
  const { db } = initFirebase();

  if (db) {
    try {
      const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
      const unsubscribe: Unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: TransactionPayload[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<TransactionPayload, "id">) });
          });
          callback(list.length > 0 ? list : getLocalTransactions());
        },
        (error) => {
          console.warn("Firestore listener error, falling back to local sync:", error);
          callback(getLocalTransactions());
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn("Error establishing Firestore listener:", err);
    }
  }

  // Local Reactive Mode
  callback(getLocalTransactions());

  let channel: BroadcastChannel | null = null;
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === LOCAL_STORAGE_KEY) {
      callback(getLocalTransactions());
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);

    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === "UPDATE" && Array.isArray(event.data.transactions)) {
          callback(event.data.transactions);
        }
      };
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageEvent);
    }
    if (channel) {
      channel.close();
    }
  };
}

/**
 * Creates and persists a new transaction.
 */
export async function createTransaction(
  payload: TransactionPayload
): Promise<{ success: boolean; id: string }> {
  const { db } = initFirebase();

  if (db) {
    try {
      const docRef = doc(db, "transactions", payload.id);
      await setDoc(docRef, payload);
    } catch (err) {
      console.error("Firestore write failed, persisting to local store:", err);
    }
  }

  // Always update local store to ensure instant zero-latency UI reactivity
  const current = getLocalTransactions();
  const updated = [payload, ...current.filter((t) => t.id !== payload.id)];
  saveLocalTransactions(updated);

  return { success: true, id: payload.id };
}

/**
 * Updates a transaction status to CRYPTOGRAPHICALLY_AUTHORIZED with the WebAuthn proof.
 */
export async function approveTransactionWithProof(
  transactionId: string,
  authProof: WebAuthnProof
): Promise<{ success: boolean }> {
  const { db } = initFirebase();

  const now = new Date().toISOString();

  if (db) {
    try {
      const docRef = doc(db, "transactions", transactionId);
      await updateDoc(docRef, {
        status: "CRYPTOGRAPHICALLY_AUTHORIZED",
        authProof,
        updatedAt: now,
      });
    } catch (err) {
      console.error("Firestore approval update failed:", err);
    }
  }

  // Update local store
  const current = getLocalTransactions();
  const updated = current.map((t) => {
    if (t.id === transactionId) {
      return {
        ...t,
        status: "CRYPTOGRAPHICALLY_AUTHORIZED" as const,
        authProof,
        updatedAt: now,
      };
    }
    return t;
  });
  saveLocalTransactions(updated);

  return { success: true };
}

/**
 * Flags a transaction as fraud upon executive rejection.
 */
export async function flagTransactionAsFraud(
  transactionId: string,
  fraudReport: FraudReport
): Promise<{ success: boolean }> {
  const { db } = initFirebase();

  const now = new Date().toISOString();

  if (db) {
    try {
      const docRef = doc(db, "transactions", transactionId);
      await updateDoc(docRef, {
        status: "FLAGGED_AS_FRAUD",
        fraudReport,
        updatedAt: now,
      });
    } catch (err) {
      console.error("Firestore fraud flag failed:", err);
    }
  }

  // Update local store
  const current = getLocalTransactions();
  const updated = current.map((t) => {
    if (t.id === transactionId) {
      return {
        ...t,
        status: "FLAGGED_AS_FRAUD" as const,
        fraudReport,
        updatedAt: now,
      };
    }
    return t;
  });
  saveLocalTransactions(updated);

  return { success: true };
}

/**
 * Resets storage back to initial demo state.
 */
export function resetDemoStore(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage({ type: "UPDATE", transactions: INITIAL_TRANSACTIONS });
    channel.close();
  }
}
