"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { DollarSign, ShoppingBag, Package, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react"
import api from "../services/api"

const Dashboard = () => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [view, setView] = useState('week') // 'week' | 'month' | 'year'
  // weekOffset 0 = last 7 days ending today; -1 is previous 7d window, +1 next 7d window
  const [weekOffset, setWeekOffset] = useState(0)

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

    // If input is a string in format yyyy-mm-dd (no timezone), parse using UTC
    try {
      const s = String(d)
      const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s)
      if (isoDateOnly) {
        const parts = s.split('-').map((p) => Number(p))
        const y = parts[0]
        const m = parts[1]
        const day = parts[2]
        const utc = new Date(Date.UTC(y, m - 1, day))
        return weekdays[utc.getUTCDay()]
      }

      const parsed = new Date(s)
      if (!Number.isNaN(parsed.getTime())) {
        // Use UTC weekday to match backend's UTC-based date keys and avoid timezone shifts
        return weekdays[parsed.getUTCDay()]
      }
    } catch (e) {
      // fallthrough
    }

    return String(d)
  }

  const formatLocalIsoDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const currencyFormatter = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)

  const formatPct = (v) => {
    if (v === null) return 'N/A'
    if (v === undefined || Number.isNaN(Number(v))) return '-'
    const num = Number(v)
    const sign = num > 0 ? '+' : num < 0 ? '' : ''
    return `${sign}${Math.round(num * 10) / 10}%`
  }

  const currentYear = new Date().getFullYear()

  // compute a nice rounded Y-axis top from chartData so the axis scale matches
  // the visible data instead of defaulting to some unrelated rounding
  const yAxisMax = useMemo(() => {
    const max = chartData && chartData.length ? Math.max(...chartData.map((c) => Number(c.revenue) || 0)) : 0
    if (max <= 0) return 0

    // Compute a rounded top value but add a small buffer so the highest data point
    // doesn't sit exactly at the top of the chart and get visually clipped.
    // Use a slightly smaller magnitude for finer rounding, then add ~10% buffer.
    const order = Math.floor(Math.log10(max))
    const magnitude = Math.pow(10, Math.max(0, order - 1))
    const topRounded = Math.ceil(max / magnitude) * magnitude
    const buffer = Math.ceil((topRounded * 0.1) / magnitude) * magnitude

    return topRounded + buffer
  }, [chartData])

  // fetchData is exposed so we can call it from event listeners (eg. when a sale is created)
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
      // we want to show the full 7-day window for the week chart (including zeros)
      setChartData(mapped)

      // Top products: expect [{ name, sales }]
      setTopProducts(topRes.data || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Listen for new sales created elsewhere in the app and refresh dashboard
    const onSaleCreated = () => {
      // re-fetch summary and chart data
      fetchData()
    }

    window.addEventListener('sale:created', onSaleCreated)
    return () => window.removeEventListener('sale:created', onSaleCreated)
  }, [])

  // Fetch chart data when view changes
  useEffect(() => {
    const fetchChart = async () => {
      try {
        if (view === 'week') {
          // compute the start date for the requested 7-day window based on weekOffset
          const today = new Date()
          const days = 7
          // default start is today - (days - 1)
          const defaultStart = new Date()
          defaultStart.setDate(today.getDate() - (days - 1))
          defaultStart.setHours(0, 0, 0, 0)
          // apply week offset (multiples of 7 days)
          const start = new Date(defaultStart)
          start.setDate(defaultStart.getDate() + weekOffset * 7)
          // Use local date components to produce yyyy-mm-dd (avoid timezone shifts)
          const startIso = formatLocalIsoDate(start)

          const res = await api.get(`/analytics/revenue/day?days=${days}&start=${startIso}`)
          const rows = res.data || []
          // convert to chart items and keep zeros (show full 7-day window)
          const mapped = rows.map((r) => ({ name: toWeekdayLabel(r.day), revenue: Number(r.revenue) }))
          setChartData(mapped)
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
  }, [view, weekOffset])


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
            <p className="text-xs text-muted-foreground">{summary ? `${formatPct(summary.revenueChangePct)} so với tháng trước` : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng đơn hàng</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">{summary ? `${formatPct(summary.ordersChangePct)} so với tháng trước` : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sản phẩm đã bán</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalProductsSold || 0}</div>
            <p className="text-xs text-muted-foreground">{summary ? `${formatPct(summary.productsChangePct)} so với tháng trước` : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tăng trưởng</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary ? formatPct(summary.revenueYoYPct) : '+'}</div>
            <p className="text-xs text-muted-foreground">{summary ? `So với cùng kỳ năm trước` : ''}</p>
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

              <div className="flex items-center gap-2">
                {view === 'week' && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setWeekOffset((s) => s - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      {/* show current week window */}
                      {(() => {
                        const days = 7
                        const today = new Date()
                        const defaultStart = new Date()
                        defaultStart.setDate(today.getDate() - (days - 1))
                        defaultStart.setHours(0, 0, 0, 0)
                        const start = new Date(defaultStart)
                        start.setDate(defaultStart.getDate() + weekOffset * 7)
                        const end = new Date(start)
                        end.setDate(start.getDate() + days - 1)
                        const fmt = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short' })
                        return `${fmt.format(start)} — ${fmt.format(end)}`
                      })()}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setWeekOffset((s) => s + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                <Button variant={view === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setView('week')}>Tuần</Button>
                <Button variant={view === 'month' ? 'default' : 'ghost'} size="sm" onClick={() => setView('month')}>Tháng</Button>
                <Button variant={view === 'year' ? 'default' : 'ghost'} size="sm" onClick={() => setView('year')}>Năm</Button>
                </div>
              </div>
            </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {view === 'week' ? (
                  // give the chart some left padding so long Y-axis labels (eg. "20.000.000 ₫")
                  // don't get visually clipped by the container
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: 56, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} interval={0} tick={{ angle: -20, textAnchor: 'end' }} />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={100}
                      tickFormatter={(value) => currencyFormatter(value)}
                      domain={[0, yAxisMax]}
                    />
                    <Tooltip formatter={(value) => currencyFormatter(value)} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                ) : (
                  // month / year -> column (vertical bar) chart
                  <BarChart data={chartData} margin={{ top: 8, right: 12, left: 56, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} interval={0} tick={{ angle: -20, textAnchor: 'end' }} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => currencyFormatter(v)} domain={[0, yAxisMax]} width={100} />
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
