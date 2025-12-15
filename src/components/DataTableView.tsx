import { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProcessedDocument, DocumentType } from '@/types/document';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableViewProps {
  documents: ProcessedDocument[];
}

type SortKey = 'fileName' | 'documentType' | 'documentDate' | 'issuer' | 'totalAmountCHF' | 'expenseCategory';
type SortDirection = 'asc' | 'desc';

const documentTypeLabels: Record<DocumentType, string> = {
  bank_statement: 'Bank Statement',
  invoice: 'Invoice',
  receipt: 'Receipt',
  unknown: 'Unknown',
};

const expenseCategories = [
  'travel',
  'meals',
  'utilities',
  'software',
  'professional services',
  'office supplies',
  'telecommunications',
  'insurance',
  'rent',
  'other',
];

const formatCurrency = (amount: number | null, currency: string = 'CHF'): string => {
  if (amount === null) return '—';
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

const DataTableView = ({ documents }: DataTableViewProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('documentDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const completedDocs = documents.filter(d => d.status === 'completed');

  const filteredAndSortedDocs = useMemo(() => {
    let filtered = completedDocs;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.fileName.toLowerCase().includes(query) ||
        doc.extractedData.issuer?.toLowerCase().includes(query) ||
        doc.extractedData.documentNumber?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.documentType === typeFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(doc => doc.extractedData.expenseCategory === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortKey) {
        case 'fileName':
          aVal = a.fileName;
          bVal = b.fileName;
          break;
        case 'documentType':
          aVal = a.documentType;
          bVal = b.documentType;
          break;
        case 'documentDate':
          aVal = a.extractedData.documentDate || '';
          bVal = b.extractedData.documentDate || '';
          break;
        case 'issuer':
          aVal = a.extractedData.issuer || '';
          bVal = b.extractedData.issuer || '';
          break;
        case 'totalAmountCHF':
          aVal = a.extractedData.totalAmountCHF || 0;
          bVal = b.extractedData.totalAmountCHF || 0;
          break;
        case 'expenseCategory':
          aVal = a.extractedData.expenseCategory || '';
          bVal = b.extractedData.expenseCategory || '';
          break;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal || '').toLowerCase();
      const strB = String(bVal || '').toLowerCase();
      return sortDirection === 'asc' 
        ? strA.localeCompare(strB) 
        : strB.localeCompare(strA);
    });

    return filtered;
  }, [completedDocs, searchQuery, typeFilter, categoryFilter, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-accent" /> 
      : <ArrowDown className="w-3 h-3 ml-1 text-accent" />;
  };

  const SortableHeader = ({ columnKey, children }: { columnKey: SortKey; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
      onClick={() => handleSort(columnKey)}
    >
      <div className="flex items-center">
        {children}
        <SortIcon columnKey={columnKey} />
      </div>
    </TableHead>
  );

  if (completedDocs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No completed documents to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename, issuer, or document number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-3 h-3 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bank_statement">Bank Statement</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="receipt">Receipt</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-3 h-3 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {expenseCategories.map(cat => (
                <SelectItem key={cat} value={cat} className="capitalize">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedDocs.length} of {completedDocs.length} documents
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <SortableHeader columnKey="fileName">File Name</SortableHeader>
                <SortableHeader columnKey="documentType">Type</SortableHeader>
                <SortableHeader columnKey="documentDate">Date</SortableHeader>
                <SortableHeader columnKey="issuer">Issuer</SortableHeader>
                <TableHead>Doc #</TableHead>
                <SortableHeader columnKey="totalAmountCHF">Total (CHF)</SortableHeader>
                <TableHead>Original</TableHead>
                <TableHead>VAT (CHF)</TableHead>
                <TableHead>Net (CHF)</TableHead>
                <SortableHeader columnKey="expenseCategory">Category</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedDocs.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium max-w-[200px] truncate" title={doc.fileName}>
                    {doc.fileName}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "badge-type",
                      doc.documentType === 'bank_statement' && "badge-bank",
                      doc.documentType === 'invoice' && "badge-invoice",
                      doc.documentType === 'receipt' && "badge-receipt",
                      doc.documentType === 'unknown' && "bg-muted text-muted-foreground"
                    )}>
                      {documentTypeLabels[doc.documentType]}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {doc.extractedData.documentDate || '—'}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate" title={doc.extractedData.issuer || undefined}>
                    {doc.extractedData.issuer || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.extractedData.documentNumber || '—'}
                  </TableCell>
                  <TableCell className="font-medium text-foreground whitespace-nowrap">
                    {formatCurrency(doc.extractedData.totalAmountCHF)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {doc.extractedData.originalCurrency && doc.extractedData.originalCurrency !== 'CHF'
                      ? formatCurrency(doc.extractedData.totalAmount, doc.extractedData.originalCurrency)
                      : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatCurrency(doc.extractedData.vatAmountCHF)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatCurrency(doc.extractedData.netAmountCHF)}
                  </TableCell>
                  <TableCell>
                    {doc.extractedData.expenseCategory ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground capitalize">
                        {doc.extractedData.expenseCategory}
                      </span>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {filteredAndSortedDocs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No documents match your filters</p>
        </div>
      )}
    </div>
  );
};

export default DataTableView;
