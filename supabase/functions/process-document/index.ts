import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Currency conversion rates to CHF (approximate)
const conversionRates: Record<string, number> = {
  'CHF': 1,
  'EUR': 0.94,
  'USD': 0.88,
  'GBP': 1.11,
  'JPY': 0.0059,
  'CAD': 0.65,
  'AUD': 0.57,
};

const convertToCHF = (amount: number | null, currency: string | null): number | null => {
  if (amount === null || currency === null) return null;
  const rate = conversionRates[currency.toUpperCase()] || 1;
  return Math.round((amount / rate) * 100) / 100;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileData, fileName, fileType } = await req.json();
    
    console.log(`Processing document: ${fileName}, type: ${fileType}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare the prompt for document analysis
    const systemPrompt = `You are a financial document analyzer. Analyze the provided document and extract financial information.

Return a JSON object with this exact structure:
{
  "documentType": "bank_statement" | "invoice" | "receipt",
  "extractedData": {
    "documentDate": "YYYY-MM-DD format or null",
    "issuer": "bank name or vendor name or null",
    "documentNumber": "invoice/receipt number or null",
    "totalAmount": number or null,
    "originalCurrency": "CHF" | "EUR" | "USD" | "GBP" | etc or null,
    "vatAmount": number or null,
    "netAmount": number or null,
    "expenseCategory": "travel" | "meals" | "utilities" | "software" | "professional services" | "office supplies" | "telecommunications" | "insurance" | "rent" | "other" or null
  }
}

Rules:
- If information is not clearly visible or unavailable, set it to null (do not guess)
- For bank statements, the total amount should be the closing balance or total transactions
- For invoices/receipts, extract the total including VAT
- Detect the currency from symbols (€, $, CHF, £) or text
- Categorize expenses based on the vendor/description
- Only return valid JSON, no other text`;

    const userMessage = fileType.startsWith('image/')
      ? {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this financial document image and extract the data. File name: ${fileName}`,
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
          content: `Analyze this financial document (PDF). File name: ${fileName}. The document content is encoded in base64. Extract what you can from the filename and any context available.`,
        };

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          userMessage,
        ],
        response_format: { type: 'json_object' },
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
