export type DocumentType = 'bank_statement' | 'invoice' | 'receipt' | 'unknown';

export interface ExtractedData {
  documentDate: string | null;
  issuer: string | null;
  documentNumber: string | null;
  totalAmount: number | null;
  originalCurrency: string | null;
  totalAmountCHF: number | null;
  vatAmount: number | null;
  vatAmountCHF: number | null;
  netAmount: number | null;
  netAmountCHF: number | null;
  expenseCategory: string | null;
}

export interface ProcessedDocument {
  id: string;
  fileName: string;
  fileType: string;
  documentType: DocumentType;
  extractedData: ExtractedData;
  status: 'processing' | 'completed' | 'error';
  errorMessage?: string;
  uploadedAt: Date;
}

export interface ExportData {
  bankStatements: ProcessedDocument[];
  invoices: ProcessedDocument[];
  receipts: ProcessedDocument[];
}
