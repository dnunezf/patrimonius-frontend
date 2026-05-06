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
  active?: boolean;
};

export type ArchivalSubseries = {
  id: number;
  code: string;
  name: string;
  serieId: number;
  active?: boolean;
};

export type ArchivalExpediente = {
  id: number;
  code: string;
  name: string;
  serieId: number;
  subserieId?: number | null;
  unitId?: number | null;
  state?: string | null;
  open?: boolean;
  fechaCierreISO?: string | null;
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

export type EadExportStatus = 'NO_EXPORTADO' | 'EXPORTADO';

export type ConservationEadDocumentRow = {
  id: number;
  officialCode: string;
  title: string;
  state: string;
  accessLevel?: ConfidentialityLevel | null;

  serieId?: number | null;
  serieCode?: string | null;
  serieName?: string | null;

  subserieId?: number | null;
  subserieCode?: string | null;
  subserieName?: string | null;

  expedienteId?: number | null;
  expedienteCode?: string | null;
  expedienteName?: string | null;

  createdAtISO?: string | null;
  eadStatus?: EadExportStatus | null;
  lastExportedAtISO?: string | null;
};

export type EadPreviewValidationItem = {
  key: string;
  label: string;
  valid: boolean;
  message?: string | null;
};

export type EadPreviewTreeNode = {
  tag: string;
  label: string;
  value?: string | null;
  children?: EadPreviewTreeNode[];
};

export type EadPreviewResponse = {
  canExport: boolean;
  fileName: string;

  document: {
    id: number;
    officialCode: string;
    title: string;
    state: string;
    serieName?: string | null;
    subserieName?: string | null;
    expedienteCode?: string | null;
    expedienteName?: string | null;
  };

  metadata: {
    descriptive: {
      title?: string | null;
      author?: string | null;
      documentType?: string | null;
      serie?: string | null;
      subserie?: string | null;
      expediente?: string | null;
    };
    technical: {
      format?: string | null;
      sizeBytes?: number | null;
      sizeHuman?: string | null;
      code?: string | null;
    };
    management: {
      state?: string | null;
      createdAtISO?: string | null;
      retentionYears?: number | null;
      unitResponsible?: string | null;
    };
  };

  validations: EadPreviewValidationItem[];
  previewTree: EadPreviewTreeNode[];
  xmlPreview: string;
};

export type EadExportFileResponse = {
  blob: Blob;
  fileName: string | null;
};
