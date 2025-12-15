import { useState, useCallback } from 'react';
import { ProcessedDocument, ExtractedData } from '@/types/document';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useDocumentProcessor = () => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);

    // Add files with processing status
    const newDocs: ProcessedDocument[] = files.map(file => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      fileType: file.type,
      documentType: 'unknown',
      extractedData: {
        documentDate: null,
        issuer: null,
        documentNumber: null,
        totalAmount: null,
        originalCurrency: null,
        totalAmountCHF: null,
        vatAmount: null,
        vatAmountCHF: null,
        netAmount: null,
        netAmountCHF: null,
        expenseCategory: null,
      },
      status: 'processing',
      uploadedAt: new Date(),
    }));

    setDocuments(prev => [...prev, ...newDocs]);

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const docId = newDocs[i].id;

      try {
        // Convert file to base64
        const base64 = await fileToBase64(file);
        
        // Call edge function
        const { data, error } = await supabase.functions.invoke('process-document', {
          body: {
            fileData: base64,
            fileName: file.name,
            fileType: file.type,
          },
        });

        if (error) throw error;

        // Update document with extracted data
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === docId
              ? {
                  ...doc,
                  documentType: data.documentType,
                  extractedData: data.extractedData as ExtractedData,
                  status: 'completed',
                }
              : doc
          )
        );
      } catch (error) {
        console.error('Error processing document:', error);
        
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === docId
              ? {
                  ...doc,
                  status: 'error',
                  errorMessage: error instanceof Error ? error.message : 'Processing failed',
                }
              : doc
          )
        );

        toast({
          title: 'Processing Error',
          description: `Failed to process ${file.name}`,
          variant: 'destructive',
        });
      }
    }

    setIsProcessing(false);
    toast({
      title: 'Processing Complete',
      description: `Processed ${files.length} document(s)`,
    });
  }, []);

  const clearDocuments = useCallback(() => {
    setDocuments([]);
  }, []);

  return {
    documents,
    isProcessing,
    processFiles,
    clearDocuments,
  };
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};
