import { useMemo } from 'react';
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
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart as PieChartIcon } from 'lucide-react';

interface SpendingDashboardProps {
  documents: ProcessedDocument[];
}

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

const COLORS = [
  '#8B7355', // Gold/accent color
  '#A67C52',
  '#C49A6C',
  '#D4AF7A',
  '#E5C896',
  '#F5E1B2',
  '#6B5B4F',
  '#7D6B5F',
  '#8F7D6F',
  '#9F8F7F',
];

const SpendingDashboard = ({ documents }: SpendingDashboardProps) => {
  const completedDocs = documents.filter(d => d.status === 'completed');

  // Monthly spending analysis
  const monthlySpending = useMemo(() => {
    const monthlyMap = new Map<string, MonthlySpending>();

    completedDocs.forEach(doc => {
      const date = doc.extractedData.documentDate;
      if (!date) return;

      const dateObj = new Date(date);
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const existing = monthlyMap.get(monthKey) || {
        month: monthLabel,
        total: 0,
        vat: 0,
        net: 0,
        count: 0,
      };

      monthlyMap.set(monthKey, {
        month: monthLabel,
        total: existing.total + (doc.extractedData.totalAmountCHF || 0),
        vat: existing.vat + (doc.extractedData.vatAmountCHF || 0),
        net: existing.net + (doc.extractedData.netAmountCHF || 0),
        count: existing.count + 1,
      });
    });

    return Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [completedDocs]);

  // Category spending analysis
  const categorySpending = useMemo(() => {
    const categoryMap = new Map<string, CategorySpending>();
    const total = completedDocs.reduce((sum, doc) => sum + (doc.extractedData.totalAmountCHF || 0), 0);

    completedDocs.forEach(doc => {
      const category = doc.extractedData.expenseCategory || 'Uncategorized';
      const existing = categoryMap.get(category) || {
        category,
        amount: 0,
        count: 0,
        percentage: 0,
      };

      categoryMap.set(category, {
        category,
        amount: existing.amount + (doc.extractedData.totalAmountCHF || 0),
        count: existing.count + 1,
        percentage: 0,
      });
    });

    return Array.from(categoryMap.values())
      .map(item => ({
        ...item,
        percentage: total > 0 ? (item.amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [completedDocs]);

  // Top vendors analysis
  const topVendors = useMemo(() => {
    const vendorMap = new Map<string, VendorSpending>();

    completedDocs.forEach(doc => {
      const vendor = doc.extractedData.issuer || 'Unknown';
      const existing = vendorMap.get(vendor) || {
        vendor,
        amount: 0,
        count: 0,
      };

      vendorMap.set(vendor, {
        vendor,
        amount: existing.amount + (doc.extractedData.totalAmountCHF || 0),
        count: existing.count + 1,
      });
    });

    return Array.from(vendorMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [completedDocs]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = completedDocs.reduce((sum, doc) => sum + (doc.extractedData.totalAmountCHF || 0), 0);
    const vat = completedDocs.reduce((sum, doc) => sum + (doc.extractedData.vatAmountCHF || 0), 0);
    const net = completedDocs.reduce((sum, doc) => sum + (doc.extractedData.netAmountCHF || 0), 0);
    const avgPerDoc = completedDocs.length > 0 ? total / completedDocs.length : 0;

    // Calculate trend (compare last 2 months)
    const lastTwoMonths = monthlySpending.slice(-2);
    const trend = lastTwoMonths.length === 2
      ? ((lastTwoMonths[1].total - lastTwoMonths[0].total) / lastTwoMonths[0].total) * 100
      : 0;

    return {
      total,
      vat,
      net,
      avgPerDoc,
      trend,
      totalDocs: completedDocs.length,
    };
  }, [completedDocs, monthlySpending]);

  // Document type breakdown
  const typeBreakdown = useMemo(() => {
    const types = {
      bank_statement: completedDocs.filter(d => d.documentType === 'bank_statement'),
      invoice: completedDocs.filter(d => d.documentType === 'invoice'),
      receipt: completedDocs.filter(d => d.documentType === 'receipt'),
    };

    return [
      {
        name: 'Bank Statements',
        value: types.bank_statement.reduce((sum, d) => sum + (d.extractedData.totalAmountCHF || 0), 0),
        count: types.bank_statement.length,
      },
      {
        name: 'Invoices',
        value: types.invoice.reduce((sum, d) => sum + (d.extractedData.totalAmountCHF || 0), 0),
        count: types.invoice.length,
      },
      {
        name: 'Receipts',
        value: types.receipt.reduce((sum, d) => sum + (d.extractedData.totalAmountCHF || 0), 0),
        count: types.receipt.length,
      },
    ].filter(item => item.value > 0);
  }, [completedDocs]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (completedDocs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <PieChartIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg">No completed documents to analyze</p>
        <p className="text-sm mt-2">Upload and process documents to see spending analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{formatCurrency(stats.total)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.totalDocs} document{stats.totalDocs !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Average per Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgPerDoc)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.trend !== 0 && (
                <span className={stats.trend > 0 ? 'text-destructive' : 'text-success'}>
                  {stats.trend > 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                  {' '}
                  {Math.abs(stats.trend).toFixed(1)}% vs last month
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Total VAT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.vat)}</div>
            <div className="text-xs text-muted-foreground mt-1">7.7% Swiss VAT</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" />
              Net Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.net)}</div>
            <div className="text-xs text-muted-foreground mt-1">After VAT deduction</div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Spending Trend */}
      {monthlySpending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Monthly Spending Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySpending}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `CHF ${value}`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#8B7355"
                  strokeWidth={2}
                  name="Total Spending"
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#A67C52"
                  strokeWidth={2}
                  name="Net Amount"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Spending Pie Chart */}
        {categorySpending.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                Spending by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categorySpending}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {categorySpending.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {categorySpending.slice(0, 5).map((cat, index) => (
                  <div key={cat.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span>{cat.category}</span>
                    </div>
                    <div className="font-medium">
                      {formatCurrency(cat.amount)} ({cat.count} docs)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Vendors Bar Chart */}
        {topVendors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Top Vendors by Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topVendors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `CHF ${value}`} />
                  <YAxis dataKey="vendor" type="category" width={120} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="amount" fill="#8B7355" name="Spending (CHF)">
                    {topVendors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Monthly Breakdown Bar Chart */}
      {monthlySpending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Monthly Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlySpending}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `CHF ${value}`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Bar dataKey="total" fill="#8B7355" name="Total" />
                <Bar dataKey="vat" fill="#A67C52" name="VAT" />
                <Bar dataKey="net" fill="#C49A6C" name="Net" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Document Type Distribution */}
      {typeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Spending by Document Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={typeBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percentage }) => `${name}: ${formatCurrency(value)} (${percentage.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index * 2 % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              {typeBreakdown.map((type, index) => (
                <div key={type.name}>
                  <div className="text-2xl font-bold">{formatCurrency(type.value)}</div>
                  <div className="text-sm text-muted-foreground">{type.name}</div>
                  <div className="text-xs text-muted-foreground">{type.count} document{type.count !== 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpendingDashboard;

