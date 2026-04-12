'use client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingCart, Users, Package, AlertTriangle, DollarSign } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function StatCard({ title, value, icon: Icon, trend, color = 'text-primary' }: {
  title: string; value: string; icon: any; trend?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <div className={`rounded-lg bg-primary/10 p-2 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
    </div>
  );
}

// Mock chart data (replace with real data from analytics endpoint)
const revenueData = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  revenue: Math.floor(Math.random() * 8000) + 2000,
  orders: Math.floor(Math.random() * 50) + 10,
}));

export default function AdminDashboardPage() {
  const { data: report, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.getDashboard,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Last 30 days overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue"    value={formatCurrency(report?.totalRevenue ?? 0)} icon={DollarSign}  trend={`Avg ${formatCurrency(report?.averageOrderValue ?? 0)} / order`} />
        <StatCard title="Total Orders"     value={(report?.totalOrders ?? 0).toLocaleString()} icon={ShoppingCart} trend="This period" />
        <StatCard title="New Users"        value={(report?.newUsers ?? 0).toLocaleString()}    icon={Users}       trend="Registered users" />
        <StatCard title="Total Products"   value={(report?.totalProducts ?? 0).toLocaleString()} icon={Package}  trend={`${report?.lowStockProducts ?? 0} low stock`} color={report?.lowStockProducts ? 'text-yellow-600' : 'text-primary'} />
      </div>

      {/* Low stock alert */}
      {(report?.lowStockProducts ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-yellow-800 dark:text-yellow-200">
            <strong>{report?.lowStockProducts}</strong> products are low on stock.{' '}
            <a href="/admin/products?filter=low-stock" className="underline">View them</a>
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="font-semibold">Revenue (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(221.2 83.2% 53.3%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(221.2 83.2% 53.3%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={6} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v/1000}k`} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(221.2 83.2% 53.3%)" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="font-semibold">Orders per Day</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={6} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [v, 'Orders']} />
              <Bar dataKey="orders" fill="hsl(221.2 83.2% 53.3%)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
