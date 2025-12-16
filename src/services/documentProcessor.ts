// Document Processing Service
// Supports multiple OCR/document processing APIs including nanobanana pro

interface ProcessingOptions {
  apiKey?: string;
  apiUrl?: string;
  provider?: 'nanobanana' | 'google-vision' | 'tesseract' | 'gemini';
}

interface ProcessedText {
  text: string;
  confidence: number;
  boundingBoxes?: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

/**
 * Process image using nanobanana pro API
 */
async function processWithNanoBanana(
  imageBase64: string,
  mimeType: string,
  options: ProcessingOptions
): Promise<ProcessedText> {
  if (!options.apiKey || !options.apiUrl) {
    throw new Error('NanoBanana Pro API key and URL are required');
  }

  try {
    const response = await fetch(options.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        image: `data:${mimeType};base64,${imageBase64}`,
        options: {
          enhance: true,
          ocr: true,
          extract_tables: true,
          extract_text: true,
          language: 'auto',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`NanoBanana API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      text: data.text || data.extracted_text || '',
      confidence: data.confidence || 0.9,
      boundingBoxes: data.bounding_boxes || data.text_regions || [],
    };
  } catch (error) {
    console.error('NanoBanana Pro processing error:', error);
    throw error;
  }
}

/**
 * Process PDF using nanobanana pro API
 */
async function processPDFWithNanoBanana(
  pdfBase64: string,
  options: ProcessingOptions
): Promise<ProcessedText> {
  if (!options.apiKey || !options.apiUrl) {
    throw new Error('NanoBanana Pro API key and URL are required');
  }

  try {
    const response = await fetch(options.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        pdf: `data:application/pdf;base64,${pdfBase64}`,
        options: {
          enhance: true,
          ocr: true,
          extract_tables: true,
          extract_text: true,
          extract_images: true,
          language: 'auto',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`NanoBanana API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      text: data.text || data.extracted_text || '',
      confidence: data.confidence || 0.9,
      boundingBoxes: data.bounding_boxes || data.text_regions || [],
    };
  } catch (error) {
    console.error('NanoBanana Pro PDF processing error:', error);
    throw error;
  }
}

/**
 * Enhanced document processing with nanobanana pro
 */
export async function processDocumentWithNanoBanana(
  file: File,
  base64: string,
  options: ProcessingOptions = {}
): Promise<{
  extractedText: string;
  confidence: number;
  metadata?: any;
}> {
  const isImage = file.type.startsWith('image/');
  const isPDF = file.type === 'application/pdf';

  // Default to environment variables if not provided
  const apiKey = options.apiKey || import.meta.env.VITE_NANOBANANA_API_KEY;
  const apiUrl = options.apiUrl || import.meta.env.VITE_NANOBANANA_API_URL || 'https://api.nanobanana.pro/v1/process';

  if (!apiKey) {
    console.warn('NanoBanana Pro API key not found. Using fallback processing.');
    return {
      extractedText: '',
      confidence: 0,
    };
  }

  try {
    let result: ProcessedText;

    if (isImage) {
      result = await processWithNanoBanana(base64, file.type, {
        ...options,
        apiKey,
        apiUrl,
      });
    } else if (isPDF) {
      result = await processPDFWithNanoBanana(base64, {
        ...options,
        apiKey,
        apiUrl,
      });
    } else {
      throw new Error('Unsupported file type');
    }

    return {
      extractedText: result.text,
      confidence: result.confidence,
      metadata: {
        boundingBoxes: result.boundingBoxes,
        provider: 'nanobanana-pro',
      },
    };
  } catch (error) {
    console.error('Error processing with NanoBanana Pro:', error);
    // Return empty result on error, will fall back to other methods
    return {
      extractedText: '',
      confidence: 0,
    };
  }
}

/**
 * Enhanced text extraction with better OCR
 */
export async function extractTextFromDocument(
  file: File,
  base64: string,
  options: ProcessingOptions = {}
): Promise<string> {
  // Try NanoBanana Pro first if configured
  if (options.provider === 'nanobanana' || import.meta.env.VITE_NANOBANANA_API_KEY) {
    try {
      const result = await processDocumentWithNanoBanana(file, base64, options);
      if (result.extractedText && result.confidence > 0.5) {
        return result.extractedText;
      }
    } catch (error) {
      console.log('NanoBanana Pro not available, using fallback');
    }
  }

  // Fallback: Return empty, will be handled by Gemini
  return '';
}

/**
 * Get processing provider info
 */
export function getProcessingProvider(): string {
  if (import.meta.env.VITE_NANOBANANA_API_KEY) {
    return 'NanoBanana Pro';
  }
  return 'Gemini AI (Fallback)';
}

