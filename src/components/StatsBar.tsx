import { FileText, Building2, CreditCard, Receipt, Loader2 } from 'lucide-react';
import { ProcessedDocument } from '@/types/document';

interface StatsBarProps {
  documents: ProcessedDocument[];
}

const StatsBar = ({ documents }: StatsBarProps) => {
  const processing = documents.filter(d => d.status === 'processing').length;
  const completed = documents.filter(d => d.status === 'completed');
  
  const bankStatements = completed.filter(d => d.documentType === 'bank_statement').length;
  const invoices = completed.filter(d => d.documentType === 'invoice').length;
  const receipts = completed.filter(d => d.documentType === 'receipt').length;

  const totalCHF = completed.reduce((sum, doc) => 
    sum + (doc.extractedData.totalAmountCHF || 0), 0
  );

  if (documents.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in">
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <FileText className="w-3 h-3" />
          <span>Total Documents</span>
        </div>
        <div className="font-serif text-2xl text-foreground flex items-center gap-2">
          {documents.length}
          {processing > 0 && (
            <Loader2 className="w-4 h-4 text-accent animate-spin" />
          )}
        </div>
      </div>

      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <Building2 className="w-3 h-3" />
          <span>Bank Statements</span>
        </div>
        <div className="font-serif text-2xl text-foreground">{bankStatements}</div>
      </div>

      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <CreditCard className="w-3 h-3" />
          <span>Invoices</span>
        </div>
        <div className="font-serif text-2xl text-foreground">{invoices}</div>
      </div>

      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <Receipt className="w-3 h-3" />
          <span>Receipts</span>
        </div>
        <div className="font-serif text-2xl text-foreground">{receipts}</div>
      </div>

      <div className="card-elevated p-4 col-span-2 md:col-span-1">
        <div className="text-muted-foreground text-xs mb-1">Total Value</div>
        <div className="font-serif text-2xl text-accent">
          {new Intl.NumberFormat('de-CH', {
            style: 'currency',
            currency: 'CHF',
          }).format(totalCHF)}
        </div>
      </div>
    </div>
  );
};

export default StatsBar;
