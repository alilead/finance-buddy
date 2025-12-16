import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { ProcessedDocument } from '@/types/document';
import { toast } from '@/hooks/use-toast';

interface AnalyzeButtonProps {
  documents: ProcessedDocument[];
  onAnalyze?: () => void;
}

const AnalyzeButton = ({ documents, onAnalyze }: AnalyzeButtonProps) => {
  const completedDocs = documents.filter(d => d.status === 'completed');
  const processingDocs = documents.filter(d => d.status === 'processing');

  const handleAnalyze = () => {
    if (completedDocs.length === 0) {
      toast({
        title: 'No Documents',
        description: 'Please upload and process some documents first.',
        variant: 'destructive',
      });
      return;
    }

    // Calculate summary statistics
    const stats = {
      totalDocuments: completedDocs.length,
      bankStatements: completedDocs.filter(d => d.documentType === 'bank_statement').length,
      invoices: completedDocs.filter(d => d.documentType === 'invoice').length,
      receipts: completedDocs.filter(d => d.documentType === 'receipt').length,
      totalAmountCHF: completedDocs.reduce((sum, doc) => sum + (doc.extractedData.totalAmountCHF || 0), 0),
      totalVATCHF: completedDocs.reduce((sum, doc) => sum + (doc.extractedData.vatAmountCHF || 0), 0),
      totalNetCHF: completedDocs.reduce((sum, doc) => sum + (doc.extractedData.netAmountCHF || 0), 0),
      vendors: new Set(completedDocs.map(d => d.extractedData.issuer).filter(Boolean)).size,
      categories: new Set(completedDocs.map(d => d.extractedData.expenseCategory).filter(Boolean)).size,
    };

    // Group by vendor
    const vendorGroups: Record<string, number> = {};
    completedDocs.forEach(doc => {
      const vendor = doc.extractedData.issuer || 'Unknown';
      vendorGroups[vendor] = (vendorGroups[vendor] || 0) + 1;
    });

    // Create detailed vendor summary
    const vendorSummary = Object.entries(vendorGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([vendor, count]) => {
        const vendorTotal = completedDocs
          .filter(d => d.extractedData.issuer === vendor)
          .reduce((sum, d) => sum + (d.extractedData.totalAmountCHF || 0), 0);
        return `${count} from ${vendor} (${new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0 }).format(vendorTotal)})`;
      })
      .join('\n   ');

    // Category breakdown
    const categoryGroups: Record<string, { count: number; total: number }> = {};
    completedDocs.forEach(doc => {
      const category = doc.extractedData.expenseCategory || 'Uncategorized';
      if (!categoryGroups[category]) {
        categoryGroups[category] = { count: 0, total: 0 };
      }
      categoryGroups[category].count++;
      categoryGroups[category].total += doc.extractedData.totalAmountCHF || 0;
    });

    const categorySummary = Object.entries(categoryGroups)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([category, data]) => 
        `${category}: ${data.count} docs, ${new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0 }).format(data.total)}`
      )
      .join('\n   ');

    // Date range
    const dates = completedDocs
      .map(d => d.extractedData.documentDate)
      .filter(Boolean)
      .sort();
    const dateRange = dates.length > 0 
      ? `From ${dates[0]} to ${dates[dates.length - 1]}`
      : 'No dates available';

    const summary = `
📊 COMPREHENSIVE FINANCIAL ANALYSIS SUMMARY

📄 Document Overview:
   • Total Documents: ${stats.totalDocuments}
   • Bank Statements: ${stats.bankStatements}
   • Invoices: ${stats.invoices}
   • Receipts: ${stats.receipts}
   • Date Range: ${dateRange}

💰 Financial Overview (All in CHF):
   • Total Amount: ${new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(stats.totalAmountCHF)}
   • Total VAT (7.7%): ${new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(stats.totalVATCHF)}
   • Net Amount: ${new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(stats.totalNetCHF)}

🏢 Vendor Analysis (${stats.vendors} unique vendors):
   ${vendorSummary || 'No vendors identified'}

📁 Expense Categories (${stats.categories} categories):
   ${categorySummary || 'No categories assigned'}

${processingDocs.length > 0 ? `\n⏳ ${processingDocs.length} document(s) still processing...` : ''}

✅ All amounts converted to CHF using live exchange rates
    `.trim();

    // Show summary in toast
    toast({
      title: 'Analysis Complete',
      description: summary,
      duration: 10000,
    });

    // Also log to console for easy copying
    console.log('=== FINANCIAL DOCUMENT ANALYSIS ===');
    console.log(summary);
    console.log('===================================');

    if (onAnalyze) {
      onAnalyze();
    }
  };

  if (completedDocs.length === 0 && processingDocs.length === 0) {
    return null;
  }

  return (
    <Button
      variant="gold"
      onClick={handleAnalyze}
      disabled={processingDocs.length > 0}
      className="w-full"
    >
      {processingDocs.length > 0 ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-2" />
          Analyze & Summarize All
        </>
      )}
    </Button>
  );
};

export default AnalyzeButton;

