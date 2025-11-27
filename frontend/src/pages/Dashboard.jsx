"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { DollarSign, ShoppingBag, Package, TrendingUp } from "lucide-react"
import api from "../services/api"

const Dashboard = () => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [view, setView] = useState('week') // 'week' | 'month' | 'year'

  // helper: weekday names and conversion
  const weekdays = [
    'Chủ nhật', // 0
    'Thứ 2',
    'Thứ 3',
    'Thứ 4',
    'Thứ 5',
    'Thứ 6',
    'Thứ 7',
  ]

  const toWeekdayLabel = (d) => {
    if (typeof d === 'number') {
      if (d >= 0 && d <= 6) return weekdays[d]
      if (d >= 1 && d <= 7) return weekdays[d % 7]
    }
    const parsed = new Date(d)
    if (!Number.isNaN(parsed.getTime())) return weekdays[parsed.getDay()]
    return String(d)
  }

  const currencyFormatter = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)

  const currentYear = new Date().getFullYear()

  // compute a nice rounded Y-axis top from chartData so the axis scale matches
  // the visible data instead of defaulting to some unrelated rounding
  const yAxisMax = useMemo(() => {
    const max = chartData && chartData.length ? Math.max(...chartData.map((c) => Number(c.revenue) || 0)) : 0
    if (max <= 0) return 0
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
    return Math.ceil(max / magnitude) * magnitude
  }, [chartData])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch dashboard data (summary, recent daily revenue for week, top-products)
        const [summaryRes, revenueDaysRes, topRes] = await Promise.all([
          api.get("/analytics/summary"),
          api.get('/analytics/revenue/day?days=7'),
          api.get("/analytics/top-products"),
        ])

        setSummary(summaryRes.data)

        // We still set week's chart data initially here (chart view default is week)
        const rows = revenueDaysRes.data || []
        const mapped = rows.map((r) => ({ name: toWeekdayLabel(r.day), revenue: Number(r.revenue) }))
        const nonZero = mapped.filter((m) => m.revenue > 0)
        setChartData(nonZero.length ? nonZero : mapped)

        // Top products: expect [{ name, sales }]
        setTopProducts(topRes.data || [])
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Fetch chart data when view changes
  useEffect(() => {
    const fetchChart = async () => {
      try {
        if (view === 'week') {
          // Use actual daily revenue for the last 7 days (instead of forecast) so the
          // chart matches real sales history and shows only days with activity.
          const res = await api.get('/analytics/revenue/day?days=7')
          const rows = res.data || []
          // convert to chart items and filter out zero-revenue days so the chart
          // reflects only days with sales (e.g., if history contains 3 days)
          const mapped = rows
            .map((r) => ({ name: toWeekdayLabel(r.day), revenue: Number(r.revenue) }))
          // If every day is zero we keep them so the chart still shows a timeline
          const nonZero = mapped.filter((m) => m.revenue > 0)
          setChartData(nonZero.length ? nonZero : mapped)
        } else if (view === 'month') {
          const res = await api.get(`/analytics/revenue/month?year=${currentYear}`)
          const rows = res.data || []
          // Normalize to 12 months — fill missing months with revenue 0
          const byMonth = new Map(rows.map((r) => [Number(r.month), Number(r.revenue)]))
          const monthsAll = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            revenue: byMonth.get(i + 1) ?? 0,
          }))

          setChartData(monthsAll.map((r) => ({ name: `Tháng ${r.month}`, revenue: r.revenue })))
        } else if (view === 'year') {
          const yearsToFetch = 5
          const res = await api.get(`/analytics/revenue/year?years=${yearsToFetch}`)
          const rows = res.data || []
          // Normalize to last `yearsToFetch` years (chronological)
          const years = rows.map(r => Number(r.year))
          const startYear = years.length ? Math.min(...years) : currentYear - (yearsToFetch - 1)
          const expectedYears = Array.from({ length: yearsToFetch }, (_, i) => startYear + i)
          const byYear = new Map(rows.map((r) => [Number(r.year), Number(r.revenue)]))

          setChartData(expectedYears.map((y) => ({ name: String(y), revenue: byYear.get(y) ?? 0 })))
        }
      } catch (error) {
        console.error('Error fetching chart data for view', view, error)
      }
    }

    fetchChart()
  }, [view])


  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalRevenue
                ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(summary.totalRevenue)
                : "0 ₫"}
            </div>
            <p className="text-xs text-muted-foreground">+20.1% so với tháng trước</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng đơn hàng</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">+15% so với tháng trước</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sản phẩm đã bán</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalProductsSold || 0}</div>
            <p className="text-xs text-muted-foreground">+12% so với tháng trước</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tăng trưởng</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+24.5%</div>
            <p className="text-xs text-muted-foreground">So với cùng kỳ năm trước</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Doanh thu</CardTitle>
                <div className="text-xs text-muted-foreground">{view === 'week' ? 'Tuần' : view === 'month' ? 'Tháng' : 'Năm'}</div>
              </div>

              <div className="flex gap-2">
                <Button variant={view === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setView('week')}>Tuần</Button>
                <Button variant={view === 'month' ? 'default' : 'ghost'} size="sm" onClick={() => setView('month')}>Tháng</Button>
                <Button variant={view === 'year' ? 'default' : 'ghost'} size="sm" onClick={() => setView('year')}>Năm</Button>
              </div>
            </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {view === 'week' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} interval={0} tick={{ angle: -20, textAnchor: 'end' }} />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => currencyFormatter(value)}
                      domain={[0, yAxisMax]}
                    />
                    <Tooltip formatter={(value) => currencyFormatter(value)} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                ) : (
                  // month / year -> column (vertical bar) chart
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} interval={0} tick={{ angle: -20, textAnchor: 'end' }} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => currencyFormatter(v)} domain={[0, yAxisMax]} />
                    <Tooltip formatter={(value) => currencyFormatter(value)} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
