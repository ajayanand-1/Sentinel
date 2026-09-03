export type TransactionStatus =
  | "PENDING_AUTHORIZATION"
  | "CRYPTOGRAPHICALLY_AUTHORIZED"
  | "FLAGGED_AS_FRAUD";

export type UrgencyLevel = "STANDARD" | "HIGH" | "CRITICAL";

export type CommunicationChannel =
  | "DEEPFAKE_VIDEO_CALL"
  | "VOICE_CLONE_PHONE"
  | "COMPROMISED_EMAIL"
  | "URGENT_MESSAGING_SLACK_WHATSAPP"
  | "ROUTINE_INVOICE_PROCEDURE";

export interface TargetAccountDetails {
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  swiftBic?: string;
  country: string;
}

export interface WebAuthnProof {
  credentialId: string;
  rawSignature: string; // Base64URL representation of ECDSA/RSA signature
  authenticatorData: string; // Base64URL of WebAuthn authData
  clientDataJSON: string; // Base64URL of clientDataJSON
  signatureAlgorithm: string; // e.g. "ES256" (-7)
  userVerified: boolean;
  userPresent: boolean;
  approvedAt: string; // ISO 8601 timestamp
  approverEmail: string;
  authenticatorType?: string; // e.g. "Platform (Secure Enclave / TouchID / FaceID)"
  challengeSigned: string; // The exact SHA-256 hash that was signed
}

export interface FraudReport {
  flaggedAt: string; // ISO 8601 timestamp
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
  urgency: UrgencyLevel;
  reportedChannel: CommunicationChannel;
  initiator: {
    name: string;
    email: string;
    department: string;
  };
  payloadHash: string; // Canonical SHA-256 hex digest
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
  authProof?: WebAuthnProof;
  fraudReport?: FraudReport;
}

export interface SystemStats {
  totalCount: number;
  pendingCount: number;
  authorizedCount: number;
  fraudCount: number;
  totalVolumeUSD: number;
  preventedFraudUSD: number;
}
