import { useState, useCallback, useEffect } from 'react';
import { ProcessedDocument, ExtractedData, DocumentType } from '@/types/document';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { convertToCHF } from '@/services/currencyConverter';

const STORAGE_KEY = 'finance-buddy-documents';

export const useDocumentProcessor = () => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Load documents from database or localStorage on mount
  useEffect(() => {
    if (user) {
      loadDocumentsFromLocalStorage();
      // Try to load from Supabase, but don't fail if it's not available
      loadDocuments().catch(() => {
        console.log('Supabase not available, using localStorage only');
      });
    } else {
      setDocuments([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadDocumentsFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const docs = parsed.map((doc: any) => ({
          ...doc,
          uploadedAt: new Date(doc.uploadedAt),
        }));
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    setIsLoading(false);
  };

  const saveDocumentsToLocalStorage = (docs: ProcessedDocument[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const loadDocuments = async () => {
    if (!user) return;
    
    // Skip Supabase for admin user
    const isAdmin = localStorage.getItem('admin-token') === 'admin-logged-in';
    if (isAdmin) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if we have a valid session first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

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
    console.log('processFiles called with', files.length, 'files');
    console.log('Files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    if (!user) {
      console.log('No user, cannot process files');
      toast({
        title: 'Not Authenticated',
        description: 'Please sign in to process documents',
        variant: 'destructive',
      });
      return;
    }

    console.log('User authenticated, starting processing');
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

      setDocuments(prev => {
        const updated = [newDoc, ...prev];
        saveDocumentsToLocalStorage(updated);
        return updated;
      });

      try {
        // Convert file to base64
        const base64 = await fileToBase64(file);
        
        // Try to use Supabase function first, fallback to direct API call
        let processedData;
        try {
          const { data, error } = await supabase.functions.invoke('process-document', {
            body: {
              fileData: base64,
              fileName: file.name,
              fileType: file.type,
            },
          });

          if (error) throw error;
          processedData = data;
        } catch (supabaseError) {
          console.log('Supabase not available, using direct API call');
          
          // Direct API call to process document (if you have the API endpoint)
          // For now, we'll use a mock processing
          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
          if (SUPABASE_URL && SUPABASE_URL.includes('supabase.co')) {
            // Try direct function URL
            const functionUrl = `${SUPABASE_URL}/functions/v1/process-document`;
            const response = await fetch(functionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                fileData: base64,
                fileName: file.name,
                fileType: file.type,
              }),
            });

            if (response.ok) {
              processedData = await response.json();
            } else {
              throw new Error('API call failed');
            }
          } else {
            // Mock processing for local development
            processedData = await mockProcessDocument(file, base64);
          }
        }

        let extractedData = processedData.extractedData as ExtractedData;

        // Use currency converter for accurate CHF conversion
        if (extractedData.totalAmount && extractedData.originalCurrency) {
          const totalCHF = await convertToCHF(extractedData.totalAmount, extractedData.originalCurrency);
          if (totalCHF !== null) {
            extractedData.totalAmountCHF = totalCHF;
          }
        }

        if (extractedData.vatAmount && extractedData.originalCurrency) {
          const vatCHF = await convertToCHF(extractedData.vatAmount, extractedData.originalCurrency);
          if (vatCHF !== null) {
            extractedData.vatAmountCHF = vatCHF;
          }
        }

        if (extractedData.netAmount && extractedData.originalCurrency) {
          const netCHF = await convertToCHF(extractedData.netAmount, extractedData.originalCurrency);
          if (netCHF !== null) {
            extractedData.netAmountCHF = netCHF;
          }
        }

        // Update local state
        const updatedDoc: ProcessedDocument = {
          ...newDoc,
          documentType: processedData.documentType as DocumentType,
          extractedData,
          status: 'completed',
        };

        setDocuments(prev => {
          const updated = prev.map(doc =>
            doc.id === docId ? updatedDoc : doc
          );
          saveDocumentsToLocalStorage(updated);
          return updated;
        });

        // Try to save to Supabase if available (non-blocking)
        // Skip if admin user (no real Supabase session)
        const isAdmin = localStorage.getItem('admin-token') === 'admin-logged-in';
        if (!isAdmin) {
          try {
            // Check if we have a valid session first
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const filePath = `${user.id}/${docId}-${file.name}`;
              await supabase.storage.from('documents').upload(filePath, file, {
                upsert: true,
              });
              
              await supabase.from('processed_documents').insert({
                id: docId,
                user_id: user.id,
                file_name: file.name,
                file_type: file.type,
                file_path: filePath,
                document_type: processedData.documentType,
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
              });
            }
          } catch (dbError) {
            // Silently fail - we're using localStorage as primary storage
            console.log('Could not save to Supabase (this is OK for admin/local mode):', dbError);
          }
        }

      } catch (error) {
        console.error('Error processing document:', error);
        
        const errorDoc: ProcessedDocument = {
          ...newDoc,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Processing failed',
        };

        setDocuments(prev => {
          const updated = prev.map(doc =>
            doc.id === docId ? errorDoc : doc
          );
          saveDocumentsToLocalStorage(updated);
          return updated;
        });

        toast({
          title: 'Processing Error',
          description: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      
      // Try to delete from Supabase (non-blocking)
      // Skip if admin user
      const isAdmin = localStorage.getItem('admin-token') === 'admin-logged-in';
      if (!isAdmin) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            if (doc) {
              const filePath = `${user.id}/${docId}-${doc.fileName}`;
              await supabase.storage.from('documents').remove([filePath]);
            }
            await supabase.from('processed_documents').delete().eq('id', docId);
          }
        } catch (dbError) {
          console.log('Could not delete from Supabase (this is OK for admin/local mode)');
        }
      }

      // Delete from local state and localStorage
      setDocuments(prev => {
        const updated = prev.filter(d => d.id !== docId);
        saveDocumentsToLocalStorage(updated);
        return updated;
      });
      
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
      // Try to delete from Supabase (non-blocking)
      // Skip if admin user
      const isAdmin = localStorage.getItem('admin-token') === 'admin-logged-in';
      if (!isAdmin) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const filePaths = documents.map(doc => `${user.id}/${doc.id}-${doc.fileName}`);
            if (filePaths.length > 0) {
              await supabase.storage.from('documents').remove(filePaths);
            }
            await supabase.from('processed_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          }
        } catch (dbError) {
          console.log('Could not clear from Supabase (this is OK for admin/local mode)');
        }
      }

      // Clear from local state and localStorage
      setDocuments([]);
      localStorage.removeItem(STORAGE_KEY);
      
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
    refreshDocuments: () => {
      loadDocumentsFromLocalStorage();
      loadDocuments().catch(() => {
        console.log('Supabase not available');
      });
    },
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

// Known vendors and their categories
const KNOWN_VENDORS: Record<string, { name: string; category: string; type: DocumentType }> = {
  'revolut': { name: 'Revolut', category: 'other', type: 'bank_statement' },
  'google': { name: 'Google', category: 'software', type: 'invoice' },
  'amazon': { name: 'Amazon', category: 'office supplies', type: 'receipt' },
  'uber': { name: 'Uber', category: 'travel', type: 'receipt' },
  'netflix': { name: 'Netflix', category: 'software', type: 'invoice' },
  'spotify': { name: 'Spotify', category: 'software', type: 'invoice' },
  'apple': { name: 'Apple', category: 'software', type: 'invoice' },
  'microsoft': { name: 'Microsoft', category: 'software', type: 'invoice' },
  'aws': { name: 'Amazon Web Services', category: 'software', type: 'invoice' },
  'azure': { name: 'Microsoft Azure', category: 'software', type: 'invoice' },
  'dropbox': { name: 'Dropbox', category: 'software', type: 'invoice' },
  'slack': { name: 'Slack', category: 'software', type: 'invoice' },
  'zoom': { name: 'Zoom', category: 'software', type: 'invoice' },
  'swisscom': { name: 'Swisscom', category: 'telecommunications', type: 'invoice' },
  'sunrise': { name: 'Sunrise', category: 'telecommunications', type: 'invoice' },
  'salt': { name: 'Salt', category: 'telecommunications', type: 'invoice' },
  'migros': { name: 'Migros', category: 'meals', type: 'receipt' },
  'coop': { name: 'Coop', category: 'meals', type: 'receipt' },
  'aldi': { name: 'Aldi', category: 'meals', type: 'receipt' },
  'lidl': { name: 'Lidl', category: 'meals', type: 'receipt' },
  'sbb': { name: 'SBB', category: 'travel', type: 'receipt' },
  'swiss': { name: 'Swiss Airlines', category: 'travel', type: 'receipt' },
  'booking': { name: 'Booking.com', category: 'travel', type: 'receipt' },
  'airbnb': { name: 'Airbnb', category: 'travel', type: 'receipt' },
  'ikea': { name: 'IKEA', category: 'office supplies', type: 'receipt' },
  'digitec': { name: 'Digitec', category: 'office supplies', type: 'receipt' },
  'galaxus': { name: 'Galaxus', category: 'office supplies', type: 'receipt' },
  'ubs': { name: 'UBS', category: 'other', type: 'bank_statement' },
  'credit suisse': { name: 'Credit Suisse', category: 'other', type: 'bank_statement' },
  'cs': { name: 'Credit Suisse', category: 'other', type: 'bank_statement' },
  'postfinance': { name: 'PostFinance', category: 'other', type: 'bank_statement' },
  'raiffeisen': { name: 'Raiffeisen', category: 'other', type: 'bank_statement' },
  'wise': { name: 'Wise', category: 'other', type: 'bank_statement' },
  'paypal': { name: 'PayPal', category: 'other', type: 'receipt' },
  'stripe': { name: 'Stripe', category: 'software', type: 'invoice' },
  'adobe': { name: 'Adobe', category: 'software', type: 'invoice' },
  'figma': { name: 'Figma', category: 'software', type: 'invoice' },
  'notion': { name: 'Notion', category: 'software', type: 'invoice' },
  'github': { name: 'GitHub', category: 'software', type: 'invoice' },
  'heroku': { name: 'Heroku', category: 'software', type: 'invoice' },
  'vercel': { name: 'Vercel', category: 'software', type: 'invoice' },
  'netlify': { name: 'Netlify', category: 'software', type: 'invoice' },
};

// Currency symbols and patterns
const CURRENCY_PATTERNS: Record<string, string> = {
  'chf': 'CHF',
  'fr': 'CHF',
  'sfr': 'CHF',
  'eur': 'EUR',
  '€': 'EUR',
  'usd': 'USD',
  '$': 'USD',
  'gbp': 'GBP',
  '£': 'GBP',
};

// Extract date from filename (supports various formats)
const extractDateFromFilename = (filename: string): string | null => {
  // Pattern: YYYY-MM-DD or YYYY_MM_DD
  const isoMatch = filename.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  
  // Pattern: DD-MM-YYYY or DD_MM_YYYY or DD.MM.YYYY
  const euMatch = filename.match(/(\d{2})[-_.](\d{2})[-_.](\d{4})/);
  if (euMatch) {
    return `${euMatch[3]}-${euMatch[2]}-${euMatch[1]}`;
  }
  
  // Pattern: YYYYMMDD
  const compactMatch = filename.match(/(\d{4})(\d{2})(\d{2})/);
  if (compactMatch) {
    const year = parseInt(compactMatch[1]);
    const month = parseInt(compactMatch[2]);
    const day = parseInt(compactMatch[3]);
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
    }
  }
  
  return null;
};

// Extract amount from filename
const extractAmountFromFilename = (filename: string): { amount: number | null; currency: string } => {
  // Remove extension and clean
  const cleaned = filename.replace(/\.[^/.]+$/, '').toLowerCase();
  
  // Look for amount patterns like: 123.45, 1234.56, CHF100, €50, $99.99
  const amountPatterns = [
    /(?:chf|eur|usd|gbp|fr|sfr|€|\$|£)\s*(\d+(?:[.,]\d{2})?)/i,
    /(\d+(?:[.,]\d{2})?)\s*(?:chf|eur|usd|gbp|fr|sfr|€|\$|£)/i,
    /amount[=_-]?(\d+(?:[.,]\d{2})?)/i,
    /total[=_-]?(\d+(?:[.,]\d{2})?)/i,
    /(\d+(?:[.,]\d{2})?)/,
  ];
  
  // Detect currency
  let currency = 'CHF';
  for (const [pattern, curr] of Object.entries(CURRENCY_PATTERNS)) {
    if (cleaned.includes(pattern)) {
      currency = curr;
      break;
    }
  }
  
  // Extract amount
  for (const pattern of amountPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const amountStr = match[1].replace(',', '.');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0 && amount < 1000000) {
        return { amount, currency };
      }
    }
  }
  
  return { amount: null, currency };
};

// Extract vendor/issuer from filename
const extractVendorFromFilename = (filename: string): { name: string; category: string; type: DocumentType } | null => {
  const cleaned = filename.toLowerCase();
  
  for (const [key, vendor] of Object.entries(KNOWN_VENDORS)) {
    if (cleaned.includes(key)) {
      return vendor;
    }
  }
  
  return null;
};

// Extract document number/ID from filename
const extractDocumentNumberFromFilename = (filename: string): string | null => {
  // Common patterns: INV-12345, #12345, ID=12345, expenseID=12345
  const patterns = [
    /(?:inv|invoice|receipt|doc|id|expenseid)[=_-]?(\w+)/i,
    /#(\d+)/,
    /(\d{6,})/,
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
};

// Currency conversion rates to CHF
const CURRENCY_RATES: Record<string, number> = {
  'CHF': 1,
  'EUR': 0.95,
  'USD': 0.91,
  'GBP': 1.15,
  'JPY': 0.0064,
};

// Mock document processing for local development
const mockProcessDocument = async (file: File, base64: string): Promise<any> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const fileName = file.name;
  const fileNameLower = fileName.toLowerCase();
  
  // Extract all info from filename
  const extractedDate = extractDateFromFilename(fileName);
  const { amount, currency } = extractAmountFromFilename(fileName);
  const vendorInfo = extractVendorFromFilename(fileName);
  const documentNumber = extractDocumentNumberFromFilename(fileName);
  
  // Determine document type
  let documentType: DocumentType = vendorInfo?.type || 'unknown';
  if (documentType === 'unknown') {
    if (fileNameLower.includes('bank') || fileNameLower.includes('statement') || fileNameLower.includes('account')) {
      documentType = 'bank_statement';
    } else if (fileNameLower.includes('invoice') || fileNameLower.includes('bill') || fileNameLower.includes('inv')) {
      documentType = 'invoice';
    } else if (fileNameLower.includes('receipt') || fileNameLower.includes('ticket') || fileNameLower.includes('recu')) {
      documentType = 'receipt';
    }
  }
  
  // Determine expense category
  let expenseCategory: string | null = vendorInfo?.category || null;
  if (!expenseCategory) {
    if (fileNameLower.includes('travel') || fileNameLower.includes('hotel') || fileNameLower.includes('flight') || fileNameLower.includes('train')) {
      expenseCategory = 'travel';
    } else if (fileNameLower.includes('restaurant') || fileNameLower.includes('food') || fileNameLower.includes('meal') || fileNameLower.includes('lunch') || fileNameLower.includes('dinner')) {
      expenseCategory = 'meals';
    } else if (fileNameLower.includes('utility') || fileNameLower.includes('electric') || fileNameLower.includes('water') || fileNameLower.includes('gas')) {
      expenseCategory = 'utilities';
    } else if (fileNameLower.includes('software') || fileNameLower.includes('subscription') || fileNameLower.includes('license') || fileNameLower.includes('saas')) {
      expenseCategory = 'software';
    } else if (fileNameLower.includes('office') || fileNameLower.includes('supply') || fileNameLower.includes('equipment')) {
      expenseCategory = 'office supplies';
    } else if (fileNameLower.includes('phone') || fileNameLower.includes('mobile') || fileNameLower.includes('telecom')) {
      expenseCategory = 'telecommunications';
    } else if (fileNameLower.includes('insurance')) {
      expenseCategory = 'insurance';
    } else if (fileNameLower.includes('rent') || fileNameLower.includes('lease')) {
      expenseCategory = 'rent';
    }
  }
  
  // Determine issuer name
  let issuer: string | null = vendorInfo?.name || null;
  if (!issuer) {
    // Try to extract from filename - clean up the filename
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const nameParts = nameWithoutExt.split(/[_\-\s]+/);
    // Find a meaningful name part (not a date or number)
    for (const part of nameParts) {
      if (part.length > 2 && !/^\d+$/.test(part) && !/^\d{4}-\d{2}-\d{2}$/.test(part)) {
        issuer = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        break;
      }
    }
  }
  
  // Calculate CHF amounts
  const rate = CURRENCY_RATES[currency] || 1;
  const amountCHF = amount ? Math.round((amount / rate) * 100) / 100 : null;
  
  // Estimate VAT (7.7% for Switzerland)
  const vatRate = 0.077;
  const vatAmount = amount ? Math.round(amount * vatRate * 100) / 100 : null;
  const vatAmountCHF = vatAmount ? Math.round((vatAmount / rate) * 100) / 100 : null;
  const netAmount = amount && vatAmount ? Math.round((amount - vatAmount) * 100) / 100 : null;
  const netAmountCHF = netAmount ? Math.round((netAmount / rate) * 100) / 100 : null;

  console.log('Extracted data from filename:', {
    fileName,
    documentType,
    date: extractedDate,
    amount,
    currency,
    issuer,
    category: expenseCategory,
    documentNumber,
  });

  return {
    documentType,
    extractedData: {
      documentDate: extractedDate || new Date().toISOString().split('T')[0],
      issuer,
      documentNumber,
      totalAmount: amount,
      originalCurrency: currency,
      totalAmountCHF: amountCHF,
      vatAmount,
      vatAmountCHF,
      netAmount,
      netAmountCHF,
      expenseCategory,
    },
  };
};
