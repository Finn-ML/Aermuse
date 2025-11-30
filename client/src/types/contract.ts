export interface Party {
  role: string;
  name: string;
  identified: boolean;
}

export interface KeyDate {
  description: string;
  date: string | null;
  isDeadline: boolean;
}

export interface ContractSummary {
  overview: string;
  contractType: string;
  parties: Party[];
  keyDates: KeyDate[];
  duration: string | null;
}

export interface KeyTerm {
  term: string;
  value: string;
  explanation: string;
  risk: 'low' | 'medium' | 'high';
  section: string | null;
}

export interface RedFlag {
  issue: string;
  clause: string;
  explanation: string;
  severity: 'warning' | 'critical';
  category: string;
  recommendation: string;
}

export interface MissingClause {
  clause: string;
  importance: 'recommended' | 'important' | 'essential';
  explanation: string;
}

export interface RiskBreakdown {
  category: string;
  score: number;
  notes: string;
}

export interface RiskAssessment {
  overallScore: number;
  overallRisk: 'low' | 'medium' | 'high';
  summary: string;
  breakdown: RiskBreakdown[];
}

export interface AnalysisMetadata {
  modelVersion: string;
  analyzedAt: string;
  processingTime: number;
  tokenCount: number;
  truncated: boolean;
}

export interface ContractAnalysis {
  summary: ContractSummary;
  keyTerms: KeyTerm[];
  redFlags: RedFlag[];
  missingClauses: MissingClause[];
  riskAssessment: RiskAssessment;
  metadata?: AnalysisMetadata;
}

export interface Contract {
  id: string;
  userId: string;
  name: string;
  type: string;
  status: string;
  partnerName?: string;
  partnerLogo?: string;
  value?: string;
  expiryDate?: string;
  fileUrl?: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  fileType?: string;
  extractedText?: string;
  aiAnalysis?: ContractAnalysis;
  aiRiskScore?: string;
  analyzedAt?: string;
  analysisVersion?: number;
  signedAt?: string;
  // Template-based contract fields
  templateId?: string;
  templateData?: Record<string, unknown>;
  renderedContent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ContractVersion {
  id: string;
  contractId: string;
  versionNumber: number;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  fileType?: string;
  extractedText?: string;
  aiAnalysis?: ContractAnalysis;
  aiRiskScore?: string;
  analyzedAt?: string;
  notes?: string;
  createdAt: string;
}
