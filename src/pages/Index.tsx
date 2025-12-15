import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import DocumentCard from '@/components/DocumentCard';
import ExportPanel from '@/components/ExportPanel';
import StatsBar from '@/components/StatsBar';
import { Button } from '@/components/ui/button';
import { useDocumentProcessor } from '@/hooks/useDocumentProcessor';
import { Trash2 } from 'lucide-react';

const Index = () => {
  const { documents, isProcessing, processFiles, clearDocuments } = useDocumentProcessor();

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
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Documents List */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl text-foreground">Processed Documents</h2>
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
