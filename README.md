# Ypsom Partners - Financial Document Processor

AI-powered financial document analysis and organization system for bank statements, invoices, and receipts.

## Features

- 📄 **Multi-format Support**: Upload and analyze PDFs and images (JPG, PNG)
- 🤖 **AI-Powered Analysis**: Automatically extracts dates, amounts, vendors, and categories using Google Gemini
- 💱 **Currency Conversion**: Converts all amounts to CHF with accurate exchange rates
- 📊 **VAT Calculation**: Automatically calculates Swiss VAT (7.7%) and net amounts
- 🏢 **Vendor Organization**: Groups documents by vendor
- 📥 **Excel Export**: Exports to 3 separate Excel files (Bank Statements, Invoices, Receipts)
- 🔍 **Smart Categorization**: Automatically categorizes expenses
- 📋 **Quick Summary**: One-click analysis and summarization of all documents

## Project Info

**Repository**: https://github.com/alilead/finance-buddy

## Setup

### Prerequisites

- Node.js (v20.19.0 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/alilead/finance-buddy.git
   cd finance-buddy
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.local.example` to `.env.local`
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     ```
   - Get your API key from: https://aistudio.google.com/app/apikey

4. **Run the development server**:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Build for Production

```bash
npm run build
```

The production build will be in the `dist/` folder, ready to deploy to any static hosting service.

## Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

## Technologies

- **React 19**: Frontend framework
- **Vite**: Build tool
- **TypeScript**: Type safety
- **Google Gemini AI**: Document analysis and extraction
- **XLSX**: Excel file generation
- **Tailwind CSS**: Styling (via CDN)

## License

Copyright © 2025 Ypsom Partners. All rights reserved.
