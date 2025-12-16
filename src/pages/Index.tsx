import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import DocumentCard from '@/components/DocumentCard';
import ExportPanel from '@/components/ExportPanel';
import StatsBar from '@/components/StatsBar';
import DataTableView from '@/components/DataTableView';
import IssuerGroupView from '@/components/IssuerGroupView';
import SummaryView from '@/components/SummaryView';
import SpendingDashboard from '@/components/SpendingDashboard';
import AnalyzeButton from '@/components/AnalyzeButton';
import { Button } from '@/components/ui/button';
import { useDocumentProcessor } from '@/hooks/useDocumentProcessor';
import { Trash2, LayoutGrid, Table2, RefreshCw, Loader2, Building2, BarChart3, TrendingUp } from 'lucide-react';
import { useState, useMemo } from 'react';

type ViewMode = 'cards' | 'table' | 'grouped' | 'summary' | 'dashboard';

const Index = () => {
  const { documents, isProcessing, isLoading, processFiles, clearDocuments, refreshDocuments } = useDocumentProcessor();
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Sort documents by date (newest first)
  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      const dateA = a.extractedData.documentDate 
        ? new Date(a.extractedData.documentDate).getTime() 
        : a.uploadedAt.getTime();
      const dateB = b.extractedData.documentDate 
        ? new Date(b.extractedData.documentDate).getTime() 
        : b.uploadedAt.getTime();
      return dateB - dateA;
    });
  }, [documents]);

  const completedCount = documents.filter(d => d.status === 'completed').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            Financial Document <span className="text-gradient">Processor</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            AI-powered extraction and organization of your bank statements, invoices, and receipts. 
            Automatic currency conversion to CHF and Excel export.
          </p>
        </div>

        {/* Upload Zone */}
        <div className="mb-8">
          <UploadZone 
            onFilesSelected={processFiles} 
            isProcessing={isProcessing} 
          />
        </div>

        {/* Stats Bar */}
        <div className="mb-8">
          <StatsBar documents={sortedDocuments} />
        </div>

        {/* Analyze Button */}
        {sortedDocuments.length > 0 && (
          <div className="mb-8 flex justify-center">
            <div className="max-w-md w-full">
              <AnalyzeButton documents={sortedDocuments} />
            </div>
          </div>
        )}

        {/* Main Content */}
        {sortedDocuments.length > 0 && (
          <>
            {/* View Toggle & Actions */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl text-foreground">Processed Documents</h2>
                {completedCount > 0 && (
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <Button
                      variant={viewMode === 'cards' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('cards')}
                      className="h-8 px-3"
                    >
                      <LayoutGrid className="w-4 h-4 mr-1" />
                      Cards
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="h-8 px-3"
                    >
                      <Table2 className="w-4 h-4 mr-1" />
                      Table
                    </Button>
                    <Button
                      variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grouped')}
                      className="h-8 px-3"
                    >
                      <Building2 className="w-4 h-4 mr-1" />
                      By Vendor
                    </Button>
                    <Button
                      variant={viewMode === 'summary' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('summary')}
                      className="h-8 px-3"
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Summary
                    </Button>
                    <Button
                      variant={viewMode === 'dashboard' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('dashboard')}
                      className="h-8 px-3"
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Dashboard
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshDocuments}
                  className="text-muted-foreground"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDocuments}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>

            {/* Content based on view mode */}
            {viewMode === 'cards' && (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Documents List */}
                <div className="lg:col-span-2">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {sortedDocuments.map(doc => (
                      <DocumentCard key={doc.id} document={doc} />
                    ))}
                  </div>
                </div>

                {/* Export Panel */}
                <div className="lg:col-span-1">
                  <ExportPanel documents={sortedDocuments} />
                </div>
              </div>
            )}

            {viewMode === 'table' && (
              <div className="space-y-6">
                <DataTableView documents={sortedDocuments} />
                
                {/* Export Panel below table */}
                <div className="max-w-md mx-auto">
                  <ExportPanel documents={sortedDocuments} />
                </div>
              </div>
            )}

            {viewMode === 'grouped' && (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Grouped Documents */}
                <div className="lg:col-span-2">
                  <IssuerGroupView documents={sortedDocuments} />
                </div>

                {/* Export Panel */}
                <div className="lg:col-span-1">
                  <ExportPanel documents={sortedDocuments} />
                </div>
              </div>
            )}

            {viewMode === 'summary' && (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Summary View */}
                <div className="lg:col-span-2">
                  <SummaryView documents={sortedDocuments} />
                </div>

                {/* Export Panel */}
                <div className="lg:col-span-1">
                  <ExportPanel documents={sortedDocuments} />
                </div>
              </div>
            )}

            {viewMode === 'dashboard' && (
              <div>
                <SpendingDashboard documents={sortedDocuments} />
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {documents.length === 0 && (
          <div className="text-center py-16 text-muted-foreground animate-fade-in">
            <p>Upload your financial documents to get started</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by AI • All amounts converted to CHF • Data processed securely</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
