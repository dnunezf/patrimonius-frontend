export type ConfidentialityLevel =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'HIGH'
  | 'RESTRICTED';

export type CandidateDoc = {
  id: number;
  officialCode: string;
  title: string;
  producingUnit: string;
  createdAtISO: string;
  author?: string;
  isPDFA: boolean;
  signaturesComplete: boolean;
  keywords?: string[];
};

export type EligibilityState = {
  pdfa: boolean;
  signatures: boolean;
  officialCodeComplete: boolean;
  requiredMetadata: boolean;
  duplicateChecked: 'PENDING' | 'OK' | 'DUPLICATE' | 'NOT_CHECKED';
};

export type RetentionRule = {
  id: number;
  label: string;
  years: number;
};

export type IntakePayload = {
  candidateId: number;
  officialCode: string;
  metadata: {
    title: string;
    producingUnit: string;
    author: string;
    keywords: string[];
    accessLevel: ConfidentialityLevel;
  };
  classification: {
    code: string;
    label: string;
  };
  retention: {
    ruleId: number;
    startDateISO: string;
    trackingEnabled: boolean;
  };
};
