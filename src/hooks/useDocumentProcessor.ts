import { useState, useCallback, useEffect } from 'react';
import { ProcessedDocument, ExtractedData, DocumentType } from '@/types/document';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useDocumentProcessor = () => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Load documents from database on mount
  useEffect(() => {
    if (user) {
      loadDocuments();
    } else {
      setDocuments([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('processed_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const loadedDocs: ProcessedDocument[] = (data || []).map(doc => ({
        id: doc.id,
        fileName: doc.file_name,
        fileType: doc.file_type,
        documentType: doc.document_type as DocumentType,
        extractedData: {
          documentDate: doc.document_date,
          issuer: doc.issuer,
          documentNumber: doc.document_number,
          totalAmount: doc.total_amount ? Number(doc.total_amount) : null,
          originalCurrency: doc.original_currency,
          totalAmountCHF: doc.total_amount_chf ? Number(doc.total_amount_chf) : null,
          vatAmount: doc.vat_amount ? Number(doc.vat_amount) : null,
          vatAmountCHF: doc.vat_amount_chf ? Number(doc.vat_amount_chf) : null,
          netAmount: doc.net_amount ? Number(doc.net_amount) : null,
          netAmountCHF: doc.net_amount_chf ? Number(doc.net_amount_chf) : null,
          expenseCategory: doc.expense_category,
        },
        status: doc.status as 'processing' | 'completed' | 'error',
        errorMessage: doc.error_message || undefined,
        uploadedAt: new Date(doc.created_at),
      }));

      setDocuments(loadedDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processFiles = useCallback(async (files: File[]) => {
    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please sign in to process documents',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    for (const file of files) {
      const docId = crypto.randomUUID();
      
      // Add placeholder document
      const newDoc: ProcessedDocument = {
        id: docId,
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
      };

      setDocuments(prev => [newDoc, ...prev]);

      try {
        // Upload file to storage
        const filePath = `${user.id}/${docId}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Insert initial record into database
        const { error: insertError } = await supabase
          .from('processed_documents')
          .insert({
            id: docId,
            user_id: user.id,
            file_name: file.name,
            file_type: file.type,
            file_path: filePath,
            status: 'processing',
          });

        if (insertError) throw insertError;

        // Convert file to base64
        const base64 = await fileToBase64(file);
        
        // Call edge function for AI processing
        const { data, error } = await supabase.functions.invoke('process-document', {
          body: {
            fileData: base64,
            fileName: file.name,
            fileType: file.type,
          },
        });

        if (error) throw error;

        const extractedData = data.extractedData as ExtractedData;

        // Update database with extracted data
        const { error: updateError } = await supabase
          .from('processed_documents')
          .update({
            document_type: data.documentType,
            document_date: extractedData.documentDate,
            issuer: extractedData.issuer,
            document_number: extractedData.documentNumber,
            total_amount: extractedData.totalAmount,
            original_currency: extractedData.originalCurrency,
            total_amount_chf: extractedData.totalAmountCHF,
            vat_amount: extractedData.vatAmount,
            vat_amount_chf: extractedData.vatAmountCHF,
            net_amount: extractedData.netAmount,
            net_amount_chf: extractedData.netAmountCHF,
            expense_category: extractedData.expenseCategory,
            status: 'completed',
          })
          .eq('id', docId);

        if (updateError) throw updateError;

        // Update local state
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === docId
              ? {
                  ...doc,
                  documentType: data.documentType as DocumentType,
                  extractedData,
                  status: 'completed',
                }
              : doc
          )
        );
      } catch (error) {
        console.error('Error processing document:', error);
        
        // Update database with error
        await supabase
          .from('processed_documents')
          .update({
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Processing failed',
          })
          .eq('id', docId);

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
  }, [user]);

  const deleteDocument = useCallback(async (docId: string) => {
    if (!user) return;

    try {
      const doc = documents.find(d => d.id === docId);
      
      // Delete from storage if file path exists
      if (doc) {
        const filePath = `${user.id}/${docId}-${doc.fileName}`;
        await supabase.storage.from('documents').remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('processed_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== docId));
      
      toast({
        title: 'Document Deleted',
        description: 'The document has been removed',
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  }, [user, documents]);

  const clearDocuments = useCallback(async () => {
    if (!user) return;

    try {
      // Delete all files from storage
      const filePaths = documents.map(doc => `${user.id}/${doc.id}-${doc.fileName}`);
      if (filePaths.length > 0) {
        await supabase.storage.from('documents').remove(filePaths);
      }

      // Delete all from database
      const { error } = await supabase
        .from('processed_documents')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      setDocuments([]);
      
      toast({
        title: 'All Documents Cleared',
        description: 'All documents have been removed',
      });
    } catch (error) {
      console.error('Error clearing documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear documents',
        variant: 'destructive',
      });
    }
  }, [user, documents]);

  return {
    documents,
    isProcessing,
    isLoading,
    processFiles,
    deleteDocument,
    clearDocuments,
    refreshDocuments: loadDocuments,
  };
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};
