export type ConfidentialityLevel =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'HIGH'
  | 'RESTRICTED';

export type FinalDocumentFlow = 'PRODUCED_SENT' | 'RECEIVED';

export type ProcedureType =
  | 'CONOCIMIENTO'
  | 'ARCHIVO'
  | 'RESPUESTA'
  | 'SEGUIMIENTO';

export type CandidateDoc = {
  id: number;
  officialCode: string;
  title: string;
  documentType?: string | null;
  producingUnit: string;
  createdAtISO: string;
  author?: string;
  accessLevel?: ConfidentialityLevel | null;
  isPDFA: boolean;
  signaturesComplete: boolean;
  keywords?: string[];
  sizeBytes?: number | null;
  format?: string | null;
  signers?: string[];
  signedAt?: string[];
  softwareVersion?: string | null;
  documentFlow?: FinalDocumentFlow | null;
};

export type EligibilityState = {
  pdfa: boolean;
  signatures: boolean;
  officialCodeComplete: boolean;
  requiredMetadata: boolean;
  classificationReady: boolean;
  flowDataReady: boolean;
  duplicateChecked: 'PENDING' | 'OK' | 'DUPLICATE' | 'NOT_CHECKED';
};

export type RetentionRule = {
  id: number;
  label: string;
  years: number;
};

export type ArchivalSeries = {
  id: number;
  code: string;
  name: string;
  unitId?: number | null;
  plazo_conservacion_anios?: number | null;
};

export type ArchivalSubseries = {
  id: number;
  code: string;
  name: string;
  serieId: number;
};

export type ArchivalExpediente = {
  id: number;
  code: string;
  name: string;
  serieId: number;
  subserieId?: number | null;
  unitId?: number | null;
  latestDocumentDateISO?: string | null;
};

export type IntakePayload = {
  candidateId: number;
  officialCode: string;
  metadata: {
    documentFlow: FinalDocumentFlow;
    documentType: string;
    title: string;
    producingUnit: string;
    keywords: string[];
    accessLevel: ConfidentialityLevel;
    procedureType?: ProcedureType | null;
    sizeBytes?: number | null;
    format?: string | null;
    signers?: string[];
    signedAt?: string[];
    softwareVersion?: string | null;
  };
  classification: {
    serieId: number;
    subserieId?: number | null;
    expedienteId: number;
    code: string;
    label: string;
  };
  retention: {
    ruleId: number;
    startDateISO: string;
    trackingEnabled: boolean;
  };
  outgoing?: {
    recipientNameRole: string;
    recipientInstitution: string;
    dispatchEmails: string[];
  } | null;
  incoming?: {
    senderNameRole?: string | null;
    senderInstitution?: string | null;
  } | null;
};
