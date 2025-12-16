import { useMemo } from 'react';
import { ProcessedDocument } from '@/types/document';
import { Building2, TrendingUp, FileText, DollarSign, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SummaryViewProps {
  documents: ProcessedDocument[];
}

interface CategorySummary {
  category: string;
  count: number;
  totalCHF: number;
  vatCHF: number;
  netCHF: number;
}

interface VendorSummary {
  vendor: string;
  count: number;
  totalCHF: number;
}

const SummaryView = ({ documents }: SummaryViewProps) => {
  const completedDocs = useMemo(() => documents.filter(d => d.status === 'completed'), [documents]);

  const categorySummary = useMemo(() => {
    const categoryMap = new Map<string, CategorySummary>();
    completedDocs.forEach(doc => {
      const category = doc.extractedData.expenseCategory || 'Uncategorized';
      const existing = categoryMap.get(category) || { category, count: 0, totalCHF: 0, vatCHF: 0, netCHF: 0 };
      categoryMap.set(category, {
        category,
        count: existing.count + 1,
        totalCHF: existing.totalCHF + (doc.extractedData.totalAmountCHF || 0),
        vatCHF: existing.vatCHF + (doc.extractedData.vatAmountCHF || 0),
        netCHF: existing.netCHF + (doc.extractedData.netAmountCHF || 0),
      });
    });
    return Array.from(categoryMap.values()).sort((a, b) => b.totalCHF - a.totalCHF);
  }, [completedDocs]);

  const vendorSummary = useMemo(() => {
    const vendorMap = new Map<string, VendorSummary>();
    completedDocs.forEach(doc => {
      const vendor = doc.extractedData.issuer || 'Unknown';
      const existing = vendorMap.get(vendor) || { vendor, count: 0, totalCHF: 0 };
      vendorMap.set(vendor, {
        vendor,
        count: existing.count + 1,
        totalCHF: existing.totalCHF + (doc.extractedData.totalAmountCHF || 0),
      });
    });
    return Array.from(vendorMap.values()).sort((a, b) => b.totalCHF - a.totalCHF).slice(0, 10);
  }, [completedDocs]);

  const totals = useMemo(() => {
    return completedDocs.reduce(
      (acc, doc) => ({
        totalCHF: acc.totalCHF + (doc.extractedData.totalAmountCHF || 0),
        vatCHF: acc.vatCHF + (doc.extractedData.vatAmountCHF || 0),
        netCHF: acc.netCHF + (doc.extractedData.netAmountCHF || 0),
        count: acc.count + 1,
      }),
      { totalCHF: 0, vatCHF: 0, netCHF: 0, count: 0 }
    );
  }, [completedDocs]);

  const typeBreakdown = useMemo(() => {
    return {
      bank_statement: completedDocs.filter(d => d.documentType === 'bank_statement').length,
      invoice: completedDocs.filter(d => d.documentType === 'invoice').length,
      receipt: completedDocs.filter(d => d.documentType === 'receipt').length,
    };
  }, [completedDocs]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);

  if (completedDocs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg">No completed documents to summarize</p>
        <p className="text-sm mt-2">Upload and process documents to see a summary</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Documents</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
            <p className="text-xs text-muted-foreground">{`${typeBreakdown.invoice} invoices, ${typeBreakdown.receipt} receipts`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{formatCurrency(totals.totalCHF)}</div>
            <p className="text-xs text-muted-foreground">Converted to CHF</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total VAT</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.vatCHF)}</div>
            <p className="text-xs text-muted-foreground">7.7% Swiss VAT</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Amount</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.netCHF)}</div>
            <p className="text-xs text-muted-foreground">After VAT deduction</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieChart className="w-5 h-5" />Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Documents</TableHead>
                  <TableHead className="text-right">Total Amount (CHF)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorySummary.map(cat => (
                  <TableRow key={cat.category}>
                    <TableCell className="font-medium">{cat.category}</TableCell>
                    <TableCell className="text-right">{cat.count}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(cat.totalCHF)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Top 10 Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Total Amount (CHF)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorSummary.map(vendor => (
                  <TableRow key={vendor.vendor}>
                    <TableCell className="font-medium">{vendor.vendor}</TableCell>
                    <TableCell className="text-right">{vendor.count}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(vendor.totalCHF)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SummaryView;
