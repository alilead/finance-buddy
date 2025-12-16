import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Currency conversion rates to CHF (approximate rates as of 2024)
const conversionRates: Record<string, number> = {
  'CHF': 1,
  'EUR': 0.95,
  'USD': 0.91,
  'GBP': 1.15,
  'JPY': 0.0064,
  'CAD': 0.67,
  'AUD': 0.60,
  'SEK': 0.085,
  'NOK': 0.083,
  'DKK': 0.13,
  'PLN': 0.23,
  'CZK': 0.041,
  'HUF': 0.0026,
  'RON': 0.20,
  'BGN': 0.51,
  'HRK': 0.13,
  'TRY': 0.027,
  'RUB': 0.0098,
  'CNY': 0.13,
  'HKD': 0.12,
  'SGD': 0.68,
  'NZD': 0.56,
  'ZAR': 0.049,
  'BRL': 0.18,
  'MXN': 0.046,
  'ARS': 0.00091,
  'KRW': 0.00067,
  'INR': 0.011,
  'THB': 0.026,
  'MYR': 0.21,
  'IDR': 0.000059,
  'PHP': 0.016,
  'VND': 0.000037,
};

const convertToCHF = (amount: number | null, currency: string | null): number | null => {
  if (amount === null || currency === null) return null;
  const rate = conversionRates[currency.toUpperCase()] || 1;
  return Math.round((amount / rate) * 100) / 100;
};

// Process document with NanoBanana Pro for enhanced OCR
async function processWithNanoBanana(
  fileData: string,
  fileName: string,
  fileType: string
): Promise<{ text: string; confidence: number } | null> {
  const NANOBANANA_API_KEY = Deno.env.get('NANOBANANA_API_KEY');
  const NANOBANANA_API_URL = Deno.env.get('NANOBANANA_API_URL') || 'https://api.nanobanana.pro/v1/process';

  if (!NANOBANANA_API_KEY) {
    console.log('NanoBanana Pro API key not configured, skipping OCR enhancement');
    return null;
  }

  try {
    const isImage = fileType.startsWith('image/');
    const isPDF = fileType === 'application/pdf';

    const requestBody: any = {
      options: {
        enhance: true,
        ocr: true,
        extract_tables: true,
        extract_text: true,
        language: 'auto',
        improve_quality: true,
      },
    };

    if (isImage) {
      requestBody.image = `data:${fileType};base64,${fileData}`;
    } else if (isPDF) {
      requestBody.pdf = `data:application/pdf;base64,${fileData}`;
    } else {
      return null;
    }

    const response = await fetch(NANOBANANA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NANOBANANA_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NanoBanana Pro API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    
    return {
      text: data.text || data.extracted_text || data.ocr_text || '',
      confidence: data.confidence || data.ocr_confidence || 0.9,
    };
  } catch (error) {
    console.error('Error processing with NanoBanana Pro:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileData, fileName, fileType } = await req.json();

    console.log(`Processing document: ${fileName}, type: ${fileType}, data length: ${fileData?.length || 0}`);

    if (!fileData) {
      throw new Error('No file data provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Step 1: Process with NanoBanana Pro for enhanced OCR (if available)
    let ocrText = '';
    let ocrConfidence = 0;
    const nanoBananaResult = await processWithNanoBanana(fileData, fileName, fileType);
    if (nanoBananaResult && nanoBananaResult.confidence > 0.5) {
      ocrText = nanoBananaResult.text;
      ocrConfidence = nanoBananaResult.confidence;
      console.log(`NanoBanana Pro extracted text (confidence: ${ocrConfidence.toFixed(2)})`);
    }

    // Prepare the prompt for document analysis with enhanced Gemini instructions
    const systemPrompt = `You are an expert financial document analyzer powered by Google Gemini 3.0 Preview. Your capabilities are enhanced with a powerful OCR system called NanoBanana Pro. Your task is to analyze financial documents (images or PDFs) and extract all relevant information with high accuracy.

ENHANCED PROCESSING WITH OCR:
- You may receive OCR-extracted text from NanoBanana Pro for improved accuracy
- Use the OCR text to identify exact amounts, dates, and vendor names
- Cross-reference OCR text with the visual image for verification
- OCR text provides higher accuracy for numbers and text extraction
- Combine visual analysis with OCR data for best results

IMPORTANT FOR IMAGE ANALYSIS:
- For photos/receipts: Carefully examine the entire image, including all text, numbers, dates, and logos
- Look for vendor names, store names, or company logos visible in the image
- Extract amounts even if partially visible - be precise with decimal places
- Identify currency symbols (€, $, CHF, Fr., £, ¥) or currency codes clearly visible
- Read dates in any format and convert to YYYY-MM-DD
- For receipts: Look for itemized lists and calculate totals if needed
- For invoices: Find invoice numbers, due dates, and payment terms
- For bank statements: Identify account numbers, statement periods, and balances

Return a JSON object with this exact structure:
{
  "documentType": "bank_statement" | "invoice" | "receipt",
  "extractedData": {
    "documentDate": "YYYY-MM-DD format or null",
    "issuer": "bank name or vendor name or null",
    "documentNumber": "invoice/receipt number or null",
    "totalAmount": number or null,
    "originalCurrency": "CHF" | "EUR" | "USD" | "GBP" | "JPY" | "CAD" | "AUD" | etc or null,
    "vatAmount": number or null,
    "netAmount": number or null,
    "expenseCategory": "travel" | "meals" | "utilities" | "software" | "professional services" | "office supplies" | "telecommunications" | "insurance" | "rent" | "other" or null
  }
}

Document Type Classification Rules:
- bank_statement: Documents showing account balances, transactions, statements from banks (UBS, Credit Suisse, etc.)
- invoice: Formal billing documents with invoice numbers, due dates, company letterheads
- receipt: Simple receipts, cash register receipts, payment confirmations

Extraction Rules:
- If information is not clearly visible or unavailable, set it to null (do not guess)
- For bank statements: total amount is usually the closing balance or net transactions
- For invoices/receipts: total amount includes VAT, extract net amount and VAT separately if available
- Detect currency from symbols (€, $, CHF, Fr., £, ¥) or explicit currency codes
- Document dates should be in YYYY-MM-DD format
- Categorize expenses based on vendor type and transaction description

Expense Categories:
- travel: hotels, airlines, trains, taxis, car rentals
- meals: restaurants, catering, food delivery
- utilities: electricity, water, gas, internet, phone
- software: software licenses, cloud services, IT services
- professional services: consulting, legal, accounting, marketing
- office supplies: stationery, equipment, furniture
- telecommunications: phone, internet, mobile plans
- insurance: health, liability, property insurance
- rent: office rent, lease payments
- other: anything not fitting above categories

Only return valid JSON, no other text or explanations.`;

    // Build enhanced prompt with OCR text if available
    const ocrContext = ocrText 
      ? `\n\nENHANCED OCR TEXT (extracted with NanoBanana Pro, confidence: ${ocrConfidence.toFixed(2)}):\n${ocrText}\n\nUse this OCR text to help identify amounts, dates, vendor names, and other details. Cross-reference with the image to ensure accuracy.`
      : '';

    const userMessage = fileType.startsWith('image/')
      ? {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are analyzing a financial document PHOTO/RECEIPT. Please carefully examine this image and extract ALL visible information:

1. DOCUMENT TYPE: Determine if this is a bank_statement, invoice, or receipt based on the document structure and content.

2. VENDOR/ISSUER: Identify the company, store, or service provider name. Look for:
   - Store names, logos, or business names
   - Bank names for statements
   - Company letterheads for invoices
   - Merchant names on receipts

3. FINANCIAL AMOUNTS: Extract with precision:
   - Total amount (the main amount shown)
   - VAT/Tax amount (if visible separately)
   - Net amount (if visible, or calculate: total - VAT)
   - Currency (look for symbols €, $, CHF, Fr., £, ¥ or currency codes)

4. DATES: Find and extract:
   - Document date, transaction date, or issue date
   - Convert to YYYY-MM-DD format

5. DOCUMENT NUMBER: Find invoice numbers, receipt numbers, or transaction IDs

6. EXPENSE CATEGORY: Categorize based on vendor and content:
   - travel, meals, utilities, software, professional services, office supplies, telecommunications, insurance, rent, or other

File name: ${fileName}${ocrContext}

Be thorough and accurate. If information is not clearly visible, set it to null. Only extract what you can clearly see in the image or OCR text.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${fileType};base64,${fileData}`,
              },
            },
          ],
        }
      : {
          role: 'user',
          content: `This is a PDF document. The filename is "${fileName}".${ocrContext}

Please analyze the document content and extract financial information including document type, dates, amounts, currencies, VAT information, and expense categories. Use the OCR text above to help identify details. Even if the text extraction is imperfect, look for patterns typical of bank statements, invoices, or receipts.`,
        };

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.0-preview', // Better model for image analysis
        messages: [
          { role: 'system', content: systemPrompt },
          userMessage,
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Lower temperature for more accurate extraction
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', content);

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid AI response format');
    }

    // Convert amounts to CHF
    const extractedData = parsed.extractedData || {};
    const result = {
      documentType: parsed.documentType || 'unknown',
      extractedData: {
        documentDate: extractedData.documentDate || null,
        issuer: extractedData.issuer || null,
        documentNumber: extractedData.documentNumber || null,
        totalAmount: extractedData.totalAmount || null,
        originalCurrency: extractedData.originalCurrency || null,
        totalAmountCHF: convertToCHF(extractedData.totalAmount, extractedData.originalCurrency),
        vatAmount: extractedData.vatAmount || null,
        vatAmountCHF: convertToCHF(extractedData.vatAmount, extractedData.originalCurrency),
        netAmount: extractedData.netAmount || null,
        netAmountCHF: convertToCHF(extractedData.netAmount, extractedData.originalCurrency),
        expenseCategory: extractedData.expenseCategory || null,
      },
    };

    console.log('Processed result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Processing failed',
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
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
