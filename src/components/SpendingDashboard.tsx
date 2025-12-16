import { useMemo, useState, useEffect } from 'react';
import { ProcessedDocument } from '@/types/document';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart as PieChartIcon, FileText, Building2, Globe } from 'lucide-react';

interface SpendingDashboardProps {
  documents: ProcessedDocument[];
}

// ... (interfaces for data shapes remain the same)
interface MonthlySpending {
  month: string;
  total: number;
  vat: number;
  net: number;
  count: number;
}

interface CategorySpending {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

interface VendorSpending {
  vendor: string;
  amount: number;
  count: number;
}

interface CurrencySpending {
  currency: string;
  amount: number;
  count: number;
}


// Enhanced color palette
const COLORS = [
  '#5F6D89', '#1B3041', '#192332', '#4A5A75',
  '#DBE0E9', '#2A3F52', '#3A4D62', '#6B7D9A',
  '#8B9BB5', '#A2B0C7'
];

const SpendingDashboard = ({ documents }: SpendingDashboardProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const completedDocs = useMemo(() => documents.filter(d => d.status === 'completed'), [documents]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const monthlySpending = useMemo(() => {
    // ... (calculation logic remains the same)
    const monthlyMap = new Map<string, MonthlySpending>();
    completedDocs.forEach(doc => {
      const date = doc.extractedData.documentDate;
      if (!date) return;
      try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return;
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const existing = monthlyMap.get(monthKey) || { month: monthLabel, total: 0, vat: 0, net: 0, count: 0 };
        monthlyMap.set(monthKey, {
          month: monthLabel,
          total: existing.total + (doc.extractedData.totalAmountCHF || 0),
          vat: existing.vat + (doc.extractedData.vatAmountCHF || 0),
          net: existing.net + (doc.extractedData.netAmountCHF || 0),
          count: existing.count + 1,
        });
      } catch (e) { /* ignore invalid dates */ }
    });
    return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [completedDocs]);

  const categorySpending = useMemo(() => {
    // ... (calculation logic remains the same)
    const categoryMap = new Map<string, Omit<CategorySpending, 'percentage'>>();
    const total = completedDocs.reduce((sum, doc) => sum + (doc.extractedData.totalAmountCHF || 0), 0);
    completedDocs.forEach(doc => {
      const category = doc.extractedData.expenseCategory || 'Uncategorized';
      const existing = categoryMap.get(category) || { category, amount: 0, count: 0 };
      categoryMap.set(category, {
        category,
        amount: existing.amount + (doc.extractedData.totalAmountCHF || 0),
        count: existing.count + 1,
      });
    });
    return Array.from(categoryMap.values())
      .map(item => ({ ...item, percentage: total > 0 ? (item.amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [completedDocs]);

  const topVendors = useMemo(() => {
    // ... (calculation logic remains the same)
    const vendorMap = new Map<string, VendorSpending>();
    completedDocs.forEach(doc => {
      const vendor = doc.extractedData.issuer || 'Unknown';
      const existing = vendorMap.get(vendor) || { vendor, amount: 0, count: 0 };
      vendorMap.set(vendor, {
        vendor,
        amount: existing.amount + (doc.extractedData.totalAmountCHF || 0),
        count: existing.count + 1,
      });
    });
    return Array.from(vendorMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [completedDocs]);

  const currencySpending = useMemo(() => {
    const currencyMap = new Map<string, CurrencySpending>();
    completedDocs.forEach(doc => {
      const currency = doc.extractedData.originalCurrency || 'N/A';
      const existing = currencyMap.get(currency) || { currency, amount: 0, count: 0 };
      currencyMap.set(currency, {
        currency,
        amount: existing.amount + (doc.extractedData.totalAmountCHF || 0),
        count: existing.count + 1,
      });
    });
    return Array.from(currencyMap.values()).sort((a, b) => b.amount - a.amount);
  }, [completedDocs]);

  const stats = useMemo(() => {
    // ... (calculation logic remains the same, but now includes totalDocs)
    const total = completedDocs.reduce((sum, doc) => sum + (doc.extractedData.totalAmountCHF || 0), 0);
    const vat = completedDocs.reduce((sum, doc) => sum + (doc.extractedData.vatAmountCHF || 0), 0);
    const net = completedDocs.reduce((sum, doc) => sum + (doc.extractedData.netAmountCHF || 0), 0);
    const avgPerDoc = completedDocs.length > 0 ? total / completedDocs.length : 0;
    const lastTwoMonths = monthlySpending.slice(-2);
    const trend = lastTwoMonths.length === 2 && lastTwoMonths[0].total > 0
      ? ((lastTwoMonths[1].total - lastTwoMonths[0].total) / lastTwoMonths[0].total) * 100
      : 0;
    return { total, vat, net, avgPerDoc, trend, totalDocs: completedDocs.length };
  }, [completedDocs, monthlySpending]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);

  if (completedDocs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <PieChartIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg">No completed documents to analyze</p>
        <p className="text-sm mt-2">Upload and process documents to see the dashboard</p>
      </div>
    );
  }

  if (!isMounted) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <PieChartIcon className="w-16 h-16 mx-auto mb-4 opacity-50 animate-pulse" />
        <p className="text-lg">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spending</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{formatCurrency(stats.total)}</div>
            <p className="text-xs text-muted-foreground">{stats.totalDocs} documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. per Document</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgPerDoc)}</div>
            {stats.trend !== 0 && (
              <p className={`text-xs ${stats.trend > 0 ? 'text-destructive' : 'text-green-500'}`}>
                {stats.trend.toFixed(1)}% vs last month
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total VAT</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.vat)}</div>
            <p className="text-xs text-muted-foreground">7.7% Swiss VAT</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Amount</CardTitle>
            <PieChartIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.net)}</div>
            <p className="text-xs text-muted-foreground">After VAT deduction</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Spending Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Monthly Spending Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlySpending}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `CHF ${value}`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#5F6D89" strokeWidth={2} name="Total Spending" />
              <Line type="monotone" dataKey="net" stroke="#1B3041" strokeWidth={2} name="Net Amount" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Category & Currency Charts */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="w-5 h-5" />Spending by Category</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categorySpending} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80} fill="#5F6D89">
                    {categorySpending.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {categorySpending.slice(0, 5).map((cat, index) => (
                  <div key={cat.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span>{cat.category}</span></div>
                    <div className="font-medium">{formatCurrency(cat.amount)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" />Spending by Currency</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={currencySpending} dataKey="amount" nameKey="currency" cx="50%" cy="50%" outerRadius={80} fill="#5F6D89">
                    {currencySpending.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {currencySpending.slice(0, 5).map((cur, index) => (
                  <div key={cur.currency} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span>{cur.currency}</span></div>
                    <div className="font-medium">{formatCurrency(cur.amount)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Vendors */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Top Vendors by Spending</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={topVendors} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `CHF ${value}`} />
                  <YAxis dataKey="vendor" type="category" width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="#5F6D89" name="Spending (CHF)">
                    {topVendors.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SpendingDashboard;
