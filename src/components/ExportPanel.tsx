import { Download, FileSpreadsheet, Building2, CreditCard, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProcessedDocument } from '@/types/document';
import * as XLSX from 'xlsx';

interface ExportPanelProps {
  documents: ProcessedDocument[];
}

const ExportPanel = ({ documents }: ExportPanelProps) => {
  const completedDocs = documents.filter(d => d.status === 'completed');
  
  const bankStatements = completedDocs.filter(d => d.documentType === 'bank_statement');
  const invoices = completedDocs.filter(d => d.documentType === 'invoice');
  const receipts = completedDocs.filter(d => d.documentType === 'receipt');

  const exportToExcel = (docs: ProcessedDocument[], fileName: string) => {
    const data = docs.map(doc => ({
      'File Name': doc.fileName,
      'Document Date': doc.extractedData.documentDate || 'Not found',
      'Issuer': doc.extractedData.issuer || 'Not found',
      'Document Number': doc.extractedData.documentNumber || 'Not found',
      'Original Currency': doc.extractedData.originalCurrency || 'Not found',
      'Total Amount (Original)': doc.extractedData.totalAmount || 'Not found',
      'Total Amount (CHF)': doc.extractedData.totalAmountCHF || 'Not found',
      'VAT Amount (Original)': doc.extractedData.vatAmount || 'Not found',
      'VAT Amount (CHF)': doc.extractedData.vatAmountCHF || 'Not found',
      'Net Amount (Original)': doc.extractedData.netAmount || 'Not found',
      'Net Amount (CHF)': doc.extractedData.netAmountCHF || 'Not found',
      'Expense Category': doc.extractedData.expenseCategory || 'Not found',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const exportAll = () => {
    if (bankStatements.length > 0) exportToExcel(bankStatements, 'Bank_Statements');
    if (invoices.length > 0) exportToExcel(invoices, 'Invoices');
    if (receipts.length > 0) exportToExcel(receipts, 'Receipts');
  };

  if (completedDocs.length === 0) return null;

  return (
    <div className="card-elevated p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <FileSpreadsheet className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="font-serif text-lg text-foreground">Export Data</h3>
          <p className="text-sm text-muted-foreground">Download organized Excel files</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-foreground" />
            <span className="text-sm">Bank Statements</span>
            <span className="badge-type badge-bank">{bankStatements.length}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={bankStatements.length === 0}
            onClick={() => exportToExcel(bankStatements, 'Bank_Statements')}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-foreground" />
            <span className="text-sm">Invoices</span>
            <span className="badge-type badge-invoice">{invoices.length}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={invoices.length === 0}
            onClick={() => exportToExcel(invoices, 'Invoices')}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <Receipt className="w-4 h-4 text-foreground" />
            <span className="text-sm">Receipts</span>
            <span className="badge-type badge-receipt">{receipts.length}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={receipts.length === 0}
            onClick={() => exportToExcel(receipts, 'Receipts')}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Button
        variant="gold"
        className="w-full mt-4"
        onClick={exportAll}
      >
        <Download className="w-4 h-4" />
        Export All Files
      </Button>
    </div>
  );
};

export default ExportPanel;
