import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import DocumentCard from '@/components/DocumentCard';
import ExportPanel from '@/components/ExportPanel';
import StatsBar from '@/components/StatsBar';
import DataTableView from '@/components/DataTableView';
import { Button } from '@/components/ui/button';
import { useDocumentProcessor } from '@/hooks/useDocumentProcessor';
import { Trash2, LayoutGrid, Table2, RefreshCw, Loader2 } from 'lucide-react';
import { useState } from 'react';

type ViewMode = 'cards' | 'table';

const Index = () => {
  const { documents, isProcessing, isLoading, processFiles, clearDocuments, refreshDocuments } = useDocumentProcessor();
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

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
          <StatsBar documents={documents} />
        </div>

        {/* Main Content */}
        {documents.length > 0 && (
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
            {viewMode === 'cards' ? (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Documents List */}
                <div className="lg:col-span-2">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {documents.map(doc => (
                      <DocumentCard key={doc.id} document={doc} />
                    ))}
                  </div>
                </div>

                {/* Export Panel */}
                <div className="lg:col-span-1">
                  <ExportPanel documents={documents} />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <DataTableView documents={documents} />
                
                {/* Export Panel below table */}
                <div className="max-w-md mx-auto">
                  <ExportPanel documents={documents} />
                </div>
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
