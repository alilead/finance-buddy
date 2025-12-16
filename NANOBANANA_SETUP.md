# NanoBanana Pro Integration Setup

This guide explains how to set up NanoBanana Pro for enhanced image and PDF document processing.

## What is NanoBanana Pro?

NanoBanana Pro is an advanced OCR and document processing service that provides:
- Enhanced image quality improvement
- Accurate text extraction from images and PDFs
- Table extraction capabilities
- Multi-language support
- Higher accuracy than standard OCR

## Setup Instructions

### 1. Get Your API Key

1. Sign up for NanoBanana Pro at [nanobanana.pro](https://nanobanana.pro)
2. Navigate to your API settings
3. Copy your API key

### 2. Configure Environment Variables

#### For Local Development

Create a `.env.local` file in the root directory:

```env
VITE_NANOBANANA_API_KEY=your_api_key_here
VITE_NANOBANANA_API_URL=https://api.nanobanana.pro/v1/process
```

#### For Supabase Edge Functions

Add the following secrets to your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to Project Settings → Edge Functions → Secrets
3. Add the following secrets:
   - `NANOBANANA_API_KEY`: Your NanoBanana Pro API key
   - `NANOBANANA_API_URL`: `https://api.nanobanana.pro/v1/process` (or your custom endpoint)

### 3. How It Works

1. **Document Upload**: User uploads an image or PDF
2. **NanoBanana Pro Processing**: 
   - Image/PDF is sent to NanoBanana Pro for OCR
   - Text is extracted with high accuracy
   - Quality is enhanced if needed
3. **Gemini Analysis**: 
   - Extracted text + original image is sent to Gemini
   - Gemini uses both OCR text and visual analysis
   - Final structured data is extracted

### 4. Benefits

- **Better Accuracy**: OCR text helps identify exact amounts and dates
- **Handles Poor Quality**: Enhances blurry or low-quality images
- **Multi-language**: Supports various languages automatically
- **Table Extraction**: Can extract data from tables in documents
- **Fallback Support**: If NanoBanana Pro is unavailable, falls back to Gemini-only analysis

### 5. Testing

To test if NanoBanana Pro is working:

1. Upload a test receipt or invoice
2. Check the browser console for: "NanoBanana Pro extracted text (confidence: X.XX)"
3. If you see this message, the integration is working!

### 6. Troubleshooting

**Issue**: "NanoBanana Pro API key not configured"
- **Solution**: Make sure you've added the API key to your environment variables

**Issue**: API errors
- **Solution**: Check your API key is valid and you have sufficient credits
- Verify the API URL is correct

**Issue**: No improvement in accuracy
- **Solution**: Check the confidence score in console logs
- If confidence is low, the system will fall back to Gemini-only analysis

## API Endpoint Format

The integration expects the following API format:

**Request:**
```json
{
  "image": "data:image/jpeg;base64,..." (for images)
  "pdf": "data:application/pdf;base64,..." (for PDFs)
  "options": {
    "enhance": true,
    "ocr": true,
    "extract_tables": true,
    "extract_text": true,
    "language": "auto",
    "improve_quality": true
  }
}
```

**Response:**
```json
{
  "text": "extracted text content",
  "confidence": 0.95,
  "extracted_text": "alternative field name",
  "ocr_text": "alternative field name",
  "bounding_boxes": [...]
}
```

## Cost Considerations

- NanoBanana Pro may have usage limits or costs
- The system gracefully falls back if the service is unavailable
- Consider caching results for frequently processed documents

## Support

For NanoBanana Pro API issues, contact their support team.
For integration issues, check the console logs and ensure environment variables are set correctly.

