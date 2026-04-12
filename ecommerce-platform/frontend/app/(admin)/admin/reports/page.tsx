'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

const PRESETS = [
  { label: '7 days',  days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

export default function AdminReportsPage() {
  const today = new Date();
  const [from, setFrom] = useState(format(subDays(today, 30), 'yyyy-MM-dd'));
  const [to,   setTo]   = useState(format(today, 'yyyy-MM-dd'));

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'reports', from, to],
    queryFn: () => adminApi.getReport(from, to),
  });

  const applyPreset = (days: number) => {
    setFrom(format(subDays(today, days), 'yyyy-MM-dd'));
    setTo(format(today, 'yyyy-MM-dd'));
  };

  const stats = [
    { label: 'Total Revenue',      value: formatCurrency(report?.totalRevenue ?? 0) },
    { label: 'Total Orders',       value: (report?.totalOrders ?? 0).toLocaleString() },
    { label: 'Avg Order Value',    value: formatCurrency(report?.averageOrderValue ?? 0) },
    { label: 'New Users',          value: (report?.newUsers ?? 0).toLocaleString() },
    { label: 'Total Products',     value: (report?.totalProducts ?? 0).toLocaleString() },
    { label: 'Low Stock Products', value: (report?.lowStockProducts ?? 0).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <button className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Date controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button key={p.days} onClick={() => applyPreset(p.days)}
              className="rounded-full border px-3 py-1 text-xs hover:bg-accent">
              Last {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm" />
          <span className="text-muted-foreground">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm" />
          <button onClick={() => refetch()}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
            Apply
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border bg-card p-4 space-y-1 ${isLoading ? 'animate-pulse' : ''}`}>
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            <p className="text-xl font-bold">{isLoading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder chart */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="font-semibold">Revenue Trend</h3>
        <p className="text-xs text-muted-foreground">
          Connect a time-series analytics endpoint for per-day breakdown. Showing mock data below.
        </p>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={Array.from({ length: 30 }, (_, i) => ({ day: i + 1, revenue: Math.floor(Math.random() * 5000) + 1000 }))}>
            <defs>
              <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(221.2 83.2% 53.3%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(221.2 83.2% 53.3%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v/1000}k`} />
            <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
            <Area type="monotone" dataKey="revenue" stroke="hsl(221.2 83.2% 53.3%)" fill="url(#gr)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
