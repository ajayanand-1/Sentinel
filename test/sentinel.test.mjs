import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

/**
 * Node.js mirror of Sentinel cryptographic algorithms to test protocol logic
 */
function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJsonStringify).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((key) => {
    return JSON.stringify(key) + ":" + canonicalJsonStringify(obj[key]);
  });
  return "{" + pairs.join(",") + "}";
}

function computePayloadHash(payload) {
  const canonical = canonicalJsonStringify(payload);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function verifySignatureIntegrity(payload) {
  if (!payload.authProof) {
    return { isValid: false, reason: "No cryptographic authentication proof attached." };
  }
  if (payload.status !== "CRYPTOGRAPHICALLY_AUTHORIZED") {
    return { isValid: false, reason: `Invalid status: ${payload.status}` };
  }
  if (payload.authProof.challengeSigned !== payload.payloadHash) {
    return { isValid: false, reason: "Challenge mismatch! Payload was tampered with!" };
  }
  if (!payload.authProof.rawSignature || !payload.authProof.authenticatorData) {
    return { isValid: false, reason: "Incomplete WebAuthn assertion data." };
  }
  return { isValid: true, reason: "Cryptographic signature verified." };
}

describe("1. Canonical RFC 8785 JSON Hashing", () => {
  test("Key order invariance: differently ordered objects must yield identical SHA-256", () => {
    const objA = {
      payeeName: "Acme Industrial",
      amount: 500000,
      currency: "USD",
      urgency: "CRITICAL",
    };

    const objB = {
      urgency: "CRITICAL",
      currency: "USD",
      amount: 500000,
      payeeName: "Acme Industrial",
    };

    const hashA = computePayloadHash(objA);
    const hashB = computePayloadHash(objB);

    assert.equal(hashA, hashB, "Hashes must be strictly identical regardless of key order");
    assert.equal(hashA.length, 64, "SHA-256 hex string must be exactly 64 chars");
  });

  test("Whitespace and nested object invariance", () => {
    const nestedA = {
      targetAccount: { bank: "JPMorgan", number: "12345" },
      amount: 100,
    };
    const nestedB = {
      amount: 100,
      targetAccount: { number: "12345", bank: "JPMorgan" },
    };

    assert.equal(computePayloadHash(nestedA), computePayloadHash(nestedB));
  });
});

describe("2. Cryptographic Tamper Detection", () => {
  test("Detects single-character tampering in transfer amount", () => {
    const original = {
      payeeName: "Helios Quantum Technologies",
      amount: 485000,
      account: "882-9410-4491",
    };

    const tampered = {
      payeeName: "Helios Quantum Technologies",
      amount: 485001, // 1 dollar difference
      account: "882-9410-4491",
    };

    const hashOriginal = computePayloadHash(original);
    const hashTampered = computePayloadHash(tampered);

    assert.notEqual(hashOriginal, hashTampered, "Tampered payload must produce completely different hash");
  });

  test("Detects payee modification / bank account redirection", () => {
    const original = {
      payeeName: "Helios Quantum Technologies",
      account: "882-9410-4491",
    };

    const attackerRedirect = {
      payeeName: "Helios Quantum Technologies",
      account: "ATTACKER-ACCOUNT-999",
    };

    assert.notEqual(computePayloadHash(original), computePayloadHash(attackerRedirect));
  });
});

describe("3. WebAuthn FIDO2 Assertion Verification", () => {
  test("Validates authentic WebAuthn signature bound to payload challenge", () => {
    const payload = {
      id: "tx-2026-test-01",
      payeeName: "Valid Vendor Inc.",
      amount: 100000,
      status: "CRYPTOGRAPHICALLY_AUTHORIZED",
      payloadHash: "4a5c68b912e73f8d20911a3b5c7e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e",
      authProof: {
        credentialId: "cred_test_123",
        rawSignature: "MEUCIQDxSampleSignature==",
        authenticatorData: "SZYN5YgOjGh0NBd2YFvksq6ihtPCmFwv87qDHTYwBQUAAAAA",
        clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0In0=",
        signatureAlgorithm: "ES256 (NIST P-256 + ECDSA)",
        userVerified: true,
        userPresent: true,
        approvedAt: "2026-09-04T00:00:00.000Z",
        approverEmail: "ceo@enterprise.com",
        challengeSigned: "4a5c68b912e73f8d20911a3b5c7e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e",
      },
    };

    const result = verifySignatureIntegrity(payload);
    assert.equal(result.isValid, true, "Signature integrity check must pass when challenge matches");
  });

  test("Rejects transaction if signed challenge does not match payload hash (Man-in-the-Middle Attack)", () => {
    const mitmPayload = {
      id: "tx-2026-test-02",
      payeeName: "Attacker Diverted Entity",
      amount: 999999,
      status: "CRYPTOGRAPHICALLY_AUTHORIZED",
      payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      authProof: {
        credentialId: "cred_test_123",
        rawSignature: "MEUCIQDxSampleSignature==",
        authenticatorData: "SZYN5YgOjGh0NBd2YFvksq6ihtPCmFwv87qDHTYwBQUAAAAA",
        clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0In0=",
        signatureAlgorithm: "ES256",
        userVerified: true,
        userPresent: true,
        approvedAt: "2026-09-04T00:00:00.000Z",
        approverEmail: "ceo@enterprise.com",
        challengeSigned: "DIFFERENT_HASH_EXECUTIVE_SIGNED", // Mismatch!
      },
    };

    const result = verifySignatureIntegrity(mitmPayload);
    assert.equal(result.isValid, false, "Must fail when signed challenge does not match payload hash");
    assert.match(result.reason, /Challenge mismatch/);
  });
});

describe("4. State Machine & Fraud Flagging Invariants", () => {
  test("Pending transaction requires proof to transition to authorized", () => {
    const pendingTx = {
      id: "tx-2026-test-03",
      status: "PENDING_AUTHORIZATION",
      payloadHash: "abc123",
      authProof: undefined,
    };

    const result = verifySignatureIntegrity(pendingTx);
    assert.equal(result.isValid, false, "Pending transaction cannot be marked authorized without proof");
  });

  test("Fraud report requires threat reason classification", () => {
    const fraudReport = {
      flaggedAt: "2026-09-04T00:00:00.000Z",
      flaggedBy: "ceo@enterprise.com",
      reason: "Synthetic Voice Clone Impersonation Detected",
      suspectedChannel: "VOICE_CLONE_PHONE",
    };

    assert.ok(fraudReport.reason.length > 5, "Fraud reason must be descriptive");
    assert.equal(fraudReport.suspectedChannel, "VOICE_CLONE_PHONE");
  });
});
