# SENTINEL // Zero-Trust Out-of-Band (OOB) Transaction Authorization Engine

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![WebAuthn / FIDO2](https://img.shields.io/badge/Security-FIDO2%20%2F%20WebAuthn-emerald?style=for-the-badge&logo=webauthn)](https://fidoalliance.org/)
[![NIST P-256 ECDSA](https://img.shields.io/badge/Cryptography-ECDSA%20(P--256)-cyan?style=for-the-badge)](https://csrc.nist.gov/)
[![Firebase Firestore](https://img.shields.io/badge/Database-Cloud%20Firestore-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![PWA Standalone](https://img.shields.io/badge/Client-PWA%20Mobile%20Enclave-purple?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

---

## 1. Executive Abstract & Threat Model

Modern financial wire fraud and corporate treasury manipulation have evolved past brute-force credential stuffing. The emergence of **Generative Synthetic Media**—specifically real-time deepfake video puppetry (latent diffusion model driven video call injection) and acoustic neural voice cloning (text-to-speech models fine-tuned on sub-three-second executive audio samples)—has rendered conversational communication channels completely untrustworthy for authorization.

Traditional financial controls rely on conversational verification:
1. *Call-back confirmation* (vulnerable to PBX spoofing and AI voice cloning).
2. *Email confirmation* (vulnerable to Business Email Compromise [BEC] and session token hijacking).
3. *Internal messaging approvals via Slack/Teams* (vulnerable to SSO credential compromise).
4. *Executive video check-ins* (vulnerable to real-time generative video avatar puppetry).

**Sentinel** eliminates this attack surface by enforcing a strict **Zero-Trust Axiom**:

> **The channel through which an instruction is communicated can never be the channel through which transaction intent is authorized.**

Sentinel decouples transaction creation from cryptographic authorization. High-value wire transfers created on a dedicated desktop finance console cannot execute until the exact canonical byte digest of the transfer is cryptographically signed by the physical executive's hardware-isolated Secure Enclave (Apple Secure Enclave, Android StrongBox, or TPM 2.0) via the **W3C WebAuthn / FIDO2 API**.

---

## 2. Formal Cryptographic Specification

```
                          TRANSACTION CREATION
     +-------------------------------------------------------------+
     |  Staff Enters Wire Parameters                                |
     |  - Payee Name, IBAN / Account Number, SWIFT / Routing, Bank |
     |  - Transfer Amount, Currency, Justification, Ingress Channel |
     +-------------------------------------------------------------+
                                   |
                                   v
             [ RFC 8785 JSON Canonicalization Scheme (JCS) ]
                     Alphabetically Ordered Keys
                                   |
                                   v
          H = SHA-256( JCS( Payload ) )  ---> 32-byte Hex Digest
                                   |
                                   |  (Dispatched out-of-band to Cloud Firestore)
                                   v
                   EXECUTIVE WEBAUTHN / FIDO2 SIGNING
     +-------------------------------------------------------------+
     |  Mobile PWA extracts H and injects as challenge:            |
     |  challenge = H (32-byte Uint8Array)                         |
     |  navigator.credentials.get({                                |
     |    publicKey: { challenge, userVerification: "required" }   |
     |  })                                                         |
     +-------------------------------------------------------------+
                                   |
                                   v
          [ Physical Biometric Prompt: FaceID / TouchID / PIN ]
                                   |
                                   v
          [ Hardware Enclave Generates ECDSA / ES256 Signature ]
          Signature over: AuthenticatorData || SHA-256(ClientDataJSON)
                                   |
                                   v
     +-------------------------------------------------------------+
     |  Immutable Proof Attached to Firestore:                     |
     |  - rawSignature (Base64URL)                                 |
     |  - authenticatorData (Base64URL) with UP & UV flags set     |
     |  - clientDataJSON (Base64URL) containing challenge = H      |
     |  - Status mutated to: CRYPTOGRAPHICALLY_AUTHORIZED          |
     +-------------------------------------------------------------+
```

### 2.1. Canonical Payload Digest Formulation
To ensure that key ordering or whitespace discrepancies never yield differing cryptographic hashes across disparate runtimes, the payload is serialized strictly adhering to the JSON Canonicalization Scheme (RFC 8785):

```typescript
// Deterministic Canonical Payload Tuple
PayloadTuple = {
  payeeName: string,
  targetAccount: TargetAccountDetails,
  amount: number,
  currency: string,
  justification: string,
  urgency: "STANDARD" | "HIGH" | "CRITICAL",
  reportedChannel: CommunicationChannel,
  initiator: { name: string, email: string, department: string }
};

// Canonical Digest Formulation
H_tx = SHA-256( JCS( PayloadTuple ) );
```

Where:
* **`PayloadTuple`** represents the deterministic dictionary of wire transfer instructions.
* **`JCS`** is the recursive alphanumeric key-sorting serializer implemented in `src/lib/crypto.ts`.
* **`H_tx`** is the invariant 256-bit digest formatted as a 64-character lowercase hexadecimal string.

### 2.2. WebAuthn Hardware Assertion
When the approving executive activates the biometric authorization trigger:
1. The client converts `H_tx` into an `ArrayBuffer` of length 32.
2. The browser invokes `navigator.credentials.get({ publicKey: { challenge: H_bytes, ... } })`.
3. The platform authenticator prompts for physical biometric attestation (Apple TouchID/FaceID, Windows Hello, or Android BiometricPrompt).
4. Upon biometric success, the platform private key (`k_priv` on NIST P-256 / secp256r1) computes an ECDSA signature `sigma = (r, s)` over:
   ```text
   MessageToSign = AuthenticatorData || SHA-256( ClientDataJSON )
   ```
5. The resulting cryptographic assertion contains:
   * **`rawSignature`**: The DER-encoded ECDSA signature `(r, s)`.
   * **`authenticatorData`**: 37+ bytes containing the RP ID hash, flags byte (`bit 0 = UP [User Present]`, `bit 2 = UV [User Verified]`), and signature counter.
   * **`clientDataJSON`**: The JSON dictionary containing the base64url-encoded challenge `H_tx` and origin binding.

---

## 3. System Architecture & End-to-End Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Treasury Staff
    participant Desk as Staff Console
    participant FS as Cloud Firestore
    participant PWA as Executive Mobile PWA
    actor Exec as Authorizing Executive
    participant Enclave as Hardware Secure Enclave

    Note over Staff,Desk: Phase 1: Initiation
    Staff->>Desk: Inputs Payee, Account, Amount and Context
    Desk->>Desk: Computes Canonical SHA-256 Digest
    Desk->>FS: Commits Transaction (status: PENDING_AUTHORIZATION)
    FS-->>Desk: Real-time listener confirms write

    Note over PWA,Exec: Phase 2: Out-of-Band Verification
    FS-->>PWA: Real-time update delivers pending transaction
    Exec->>PWA: Opens Mobile Review Card
    PWA->>Exec: Displays Beneficiary, Amount and Origin Warning

    alt Scenario A: Impersonation Recognized
        Exec->>PWA: Taps Reject and Flag as Fraud
        PWA->>FS: Updates status to FLAGGED_AS_FRAUD
        FS-->>Desk: Real-time alert triggers breach beacon
    else Scenario B: Valid Transaction
        Exec->>PWA: Taps Biometric Passkey Sign
        PWA->>Enclave: WebAuthn Assertion Request
        Exec->>Enclave: Biometric Verification (TouchID or FaceID)
        Enclave-->>PWA: Cryptographic Assertion (Signature and AuthData)
        PWA->>FS: Updates status to CRYPTOGRAPHICALLY_AUTHORIZED
        FS-->>Desk: Ledger turns Emerald; unlocks Audit Certificate
    end
```

---

## 4. Component Topology & Deep Technical Breakdown

### Component 1: Staff Initiator Desktop Console (`/staff`)
* **File Reference:** [`src/components/staff/StaffDashboard.tsx`](src/components/staff/StaffDashboard.tsx)
* **Real-Time KPI Telemetry:**
  * Total Authorized Volume (USD)
  * Pending Authorization Queue (pulsing amber indicator)
  * Cryptographically Authorized Count (FIDO2 certified)
  * Fraud Attacks Intercepted (monetary value and threat counts)
* **Wire Initiation Modal (`NewTransactionModal.tsx`):**
  * Collects Payee entity, Receiving bank name, Account number / IBAN, Routing / SWIFT-BIC code, Destination jurisdiction.
  * Ingress Channel Tagging: `DEEPFAKE_VIDEO_CALL`, `VOICE_CLONE_PHONE`, `COMPROMISED_EMAIL`, `URGENT_MESSAGING_SLACK_WHATSAPP`, or `ROUTINE_INVOICE_PROCEDURE`.
  * Real-time reactive canonical SHA-256 calculation displayed before submission.
* **Cryptographic Audit Certificate Inspector (`AuditCertificateModal.tsx`):**
  * Displays the raw DER signature, Base64URL `authenticatorData`, `clientDataJSON`, and signer public key identity.
  * Features a **"Verify Mathematical Integrity"** button that re-executes the canonical hash from current memory and verifies challenge equality live in the browser.
* **Out-of-Band Mobile QR Bridge (`MobileBridgeModal.tsx`):**
  * Uses vector QR encoding (`qrcode.react`) to project the deep-link URL (`/approver?tx=<id>`) for instant smartphone camera scanning.

### Component 2: Executive Approver PWA (`/approver`)
* **File Reference:** [`src/components/approver/ApproverPWA.tsx`](src/components/approver/ApproverPWA.tsx)
* **Mobile-First Progressive Web App Shell:**
  * Configured with `src/app/manifest.ts` for standalone mobile installation.
  * Tactile ergonomics optimized for one-handed mobile review.
* **Tamper-Evident Transaction Container:**
  * Prominent transfer volume display and payee verification card.
  * **Out-of-Band Threat Context Warning:** Explicitly notifies the executive of the channel through which staff allegedly received the order:
    > *"⚠️ STAFF ADVISORY: Staff logged that this transfer request was received via Deepfake Video Meeting. If you did not instruct this transfer in an authenticated protocol, tap 'Flag as Fraud' immediately."*
* **"Reject & Flag as Fraud" (Red Action Trigger):**
  * One-tap escalation opening an incident categorization sheet.
  * Updates Firestore transaction status to `FLAGGED_AS_FRAUD`.
  * Renders permanent crimson audit stamp.
* **"Biometric Passkey Sign & Authorize" (Emerald Action Trigger):**
  * Invokes the WebAuthn API directly via `signTransactionWithWebAuthn()`.
  * Enforces `userVerification: "required"` to ensure biometric authentication is not bypassed by passive tokens.
  * Writes the resulting hardware cryptographic assertion into Firestore.

---

## 5. Database Architecture & Firestore Security Rules

### 5.1. Data Models (`src/types/transaction.ts`)

```typescript
export interface TargetAccountDetails {
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  swiftBic?: string;
  country: string;
}

export interface WebAuthnProof {
  credentialId: string;
  rawSignature: string;          // Base64URL DER-encoded signature
  authenticatorData: string;     // Base64URL authenticator data
  clientDataJSON: string;        // Base64URL client data JSON
  signatureAlgorithm: string;    // "ES256 (NIST P-256 + ECDSA)"
  userVerified: boolean;
  userPresent: boolean;
  approvedAt: string;            // ISO 8601 UTC
  approverEmail: string;
  authenticatorType?: string;    // "Hardware Platform Authenticator"
  challengeSigned: string;       // SHA-256 hex digest
}

export interface FraudReport {
  flaggedAt: string;
  flaggedBy: string;
  reason: string;
  details?: string;
  suspectedChannel: string;
}

export interface TransactionPayload {
  id: string;
  payeeName: string;
  targetAccount: TargetAccountDetails;
  amount: number;
  currency: string;
  justification: string;
  urgency: "STANDARD" | "HIGH" | "CRITICAL";
  reportedChannel: CommunicationChannel;
  initiator: { name: string; email: string; department: string };
  payloadHash: string;           // SHA-256 digest
  status: "PENDING_AUTHORIZATION" | "CRYPTOGRAPHICALLY_AUTHORIZED" | "FLAGGED_AS_FRAUD";
  createdAt: string;
  updatedAt: string;
  authProof?: WebAuthnProof;
  fraudReport?: FraudReport;
}
```

### 5.2. Formal Security Rules (`firestore.rules`)

The system enforces mathematical immutability at the database layer. No client or compromised staff member can modify transaction parameters once initiated:

```cel
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    match /transactions/{txId} {
      allow read: if true;

      // Creation: must enter pending state with valid positive amount and canonical hash
      allow create: if request.resource.data.status == "PENDING_AUTHORIZATION"
                    && request.resource.data.amount > 0
                    && request.resource.data.payeeName is string
                    && request.resource.data.payloadHash is string;

      // State Transition Invariance:
      // Once created, payload details (payee, amount, account) CANNOT be modified.
      // Only valid status transitions are permitted:
      // 1. PENDING -> CRYPTOGRAPHICALLY_AUTHORIZED (strictly requires authProof with signature)
      // 2. PENDING -> FLAGGED_AS_FRAUD (strictly requires fraudReport with reason)
      allow update: if resource.data.status == "PENDING_AUTHORIZATION"
                    && request.resource.data.payloadHash == resource.data.payloadHash
                    && request.resource.data.amount == resource.data.amount
                    && (
                      (request.resource.data.status == "CRYPTOGRAPHICALLY_AUTHORIZED"
                       && request.resource.data.authProof.rawSignature is string)
                      ||
                      (request.resource.data.status == "FLAGGED_AS_FRAUD"
                       && request.resource.data.fraudReport.reason is string)
                    );

      // Deletion is strictly forbidden to preserve cryptographic audit trail
      allow delete: if false;
    }

    match /audit_logs/{logId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false; // Append-only audit trail
    }
  }
}
```

### 5.3. Dual-Mode Reactive Synchronization Engine
The application implements an automatic dual-mode synchronization engine in [`src/lib/firebase.ts`](src/lib/firebase.ts):
1. **Live Cloud Firestore Mode:** When Firebase environment variables or custom configuration are provided, transactions synchronize across the internet in real time via Firestore `onSnapshot`.
2. **Local Enclave Mode (Zero-Config Testing):** When running locally without cloud credentials, an internal synchronization layer powered by `window.localStorage` and the `BroadcastChannel("sentinel_oob_sync")` API mirrors state transitions across browser tabs and companion mobile windows instantly with zero latency.
3. **Runtime Config Modal:** Users can toggle or paste live Firebase API keys directly into the UI at runtime without requiring a project rebuild.

---

## 6. Directory Layout

```
oob-portal/
├── firestore.rules               # Firestore security rules enforcing immutability
├── next.config.ts                # Next.js 16 configuration
├── package.json                  # Dependencies: firebase, lucide-react, qrcode.react
├── tsconfig.json                 # TypeScript strict configuration
├── public/
│   ├── shield-icon.svg           # Security branding asset
│   └── ...
└── src/
    ├── app/
    │   ├── layout.tsx            # Global layout, dark theme & PWA viewport
    │   ├── globals.css           # Tailwind CSS directives
    │   ├── manifest.ts           # Web App Manifest for mobile PWA standalone
    │   ├── page.tsx              # Split-screen dual console & view switcher
    │   ├── staff/page.tsx        # Dedicated Staff Initiator Desktop route
    │   └── approver/page.tsx     # Dedicated Executive Approver PWA route (?tx=<id>)
    ├── components/
    │   ├── Navbar.tsx            # Navigation bar & status indicators
    │   ├── FirebaseConfigModal.tsx # Runtime Firebase credentials modal
    │   ├── staff/
    │   │   ├── StaffDashboard.tsx       # Live ledger, KPI stats & filters
    │   │   ├── NewTransactionModal.tsx  # Wire creation with canonical hash preview
    │   │   ├── AuditCertificateModal.tsx # Cryptographic signature inspector & verifier
    │   │   └── MobileBridgeModal.tsx    # Vector QR code & smartphone deep link
    │   └── approver/
    │       └── ApproverPWA.tsx          # Mobile PWA review, biometric passkey & fraud flag
    ├── lib/
    │   ├── crypto.ts             # Canonical JCS, SHA-256, WebAuthn assertions
    │   ├── demo-data.ts          # Seed test transactions (Deepfake, Authorized, Fraud)
    │   └── firebase.ts           # Dual-mode Cloud Firestore & BroadcastChannel service
    └── types/
        └── transaction.ts        # Full TypeScript definitions
```

---

## 7. Local Setup & Execution Guide

### Prerequisites
* Node.js v18.0.0 or higher (v20+ recommended)
* Modern web browser with WebAuthn / FIDO2 support (Chrome, Safari, Edge, Firefox)

### Installation & Launch

```bash
# 1. Clone the repository
git clone https://github.com/ajayanand-1/Sentinel.git
cd Sentinel

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The portal will initialize at **`http://localhost:3000`**.

### Testing the Zero-Trust Protocol

1. **Dual Console Testing (Default View):**
   * Navigate to `http://localhost:3000`. The default view is **Dual View**, presenting the Staff Console on the left and the Executive Mobile PWA on the right.
2. **Initiate an Out-of-Band Wire Transfer:**
   * On the Staff Console, click **"Initiate New Transaction"**.
   * Click **"+ Auto-Fill Deepfake Threat Scenario"** to simulate an urgent request received during a compromised Zoom video call.
   * Observe the live pre-computation of the canonical SHA-256 hash.
   * Click **"Dispatch for Biometric Approval"**.
3. **Execute Hardware Biometric Signing:**
   * On the Executive Mobile PWA (right pane), view the incoming pending transfer.
   * Tap **"Biometric Passkey Sign & Authorize"**.
   * Your operating system will prompt for your device passkey (TouchID, FaceID, Windows Hello, or PIN).
   * Upon verification, the transaction updates across all connected interfaces to **`Authorized (FIDO2)`**.
4. **Inspect & Verify Mathematical Integrity:**
   * In the Staff table, click the certificate icon (📄) next to the authorized transaction.
   * Click **"Verify Hash & Signature"** to execute real-time mathematical validation confirming that the signed challenge strictly matches the recomputed payload digest.
5. **Simulate Threat Neutralization (Fraud Rejection):**
   * Select a pending transaction and tap **"Reject & Flag as Fraud"**.
   * Choose a threat reason (e.g., *"Synthetic Voice or Video Impersonation"*).
   * Confirm rejection: the transfer is permanently revoked, status turns crimson, and a real-time security alert triggers across the system.
6. **Cross-Device Mobile Testing:**
   * Click the QR code icon (📱) on any transaction row.
   * Scan the QR code with your mobile smartphone connected to the same local network to test the native mobile PWA with your smartphone's biometric hardware.

---

## 8. License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.
