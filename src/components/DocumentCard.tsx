import { FileText, Building2, Receipt, CreditCard, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { ProcessedDocument, DocumentType } from '@/types/document';
import { cn } from '@/lib/utils';

interface DocumentCardProps {
  document: ProcessedDocument;
}

const typeConfig: Record<DocumentType, { label: string; icon: typeof FileText; badgeClass: string }> = {
  bank_statement: {
    label: 'Bank Statement',
    icon: Building2,
    badgeClass: 'badge-bank',
  },
  invoice: {
    label: 'Invoice',
    icon: CreditCard,
    badgeClass: 'badge-invoice',
  },
  receipt: {
    label: 'Receipt',
    icon: Receipt,
    badgeClass: 'badge-receipt',
  },
  unknown: {
    label: 'Unknown',
    icon: FileText,
    badgeClass: 'bg-muted text-muted-foreground',
  },
};

const formatCurrency = (amount: number | null, currency: string = 'CHF'): string => {
  if (amount === null) return 'Not found';
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

const DocumentCard = ({ document }: DocumentCardProps) => {
  const config = typeConfig[document.documentType];
  const Icon = config.icon;
  const { extractedData } = document;

  return (
    <div className="card-elevated p-5 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h4 className="font-medium text-foreground text-sm truncate max-w-[200px]">
              {document.fileName}
            </h4>
            <span className={cn("badge-type mt-1", config.badgeClass)}>
              {config.label}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {document.status === 'processing' && (
            <Loader2 className="w-4 h-4 text-accent animate-spin" />
          )}
          {document.status === 'completed' && (
            <CheckCircle className="w-4 h-4 text-success" />
          )}
          {document.status === 'error' && (
            <AlertCircle className="w-4 h-4 text-destructive" />
          )}
        </div>
      </div>

      {document.status === 'processing' && (
        <div className="text-sm text-muted-foreground">Processing document...</div>
      )}

      {document.status === 'error' && (
        <div className="text-sm text-destructive">
          {document.errorMessage || 'Error processing document'}
        </div>
      )}

      {document.status === 'completed' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs block mb-1">Date</span>
              <span className="text-foreground">{extractedData.documentDate || 'Not found'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-1">Issuer</span>
              <span className="text-foreground truncate block">{extractedData.issuer || 'Not found'}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Total (CHF)</span>
              <span className="font-serif text-lg text-foreground">
                {formatCurrency(extractedData.totalAmountCHF)}
              </span>
            </div>
            {extractedData.originalCurrency && extractedData.originalCurrency !== 'CHF' && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-muted-foreground text-xs">Original</span>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(extractedData.totalAmount, extractedData.originalCurrency)}
                </span>
              </div>
            )}
          </div>

          {extractedData.expenseCategory && (
            <div className="pt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                {extractedData.expenseCategory}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentCard;
