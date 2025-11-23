"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import api from "../services/api"
import { TrendingUp, Calendar } from "lucide-react"

const Analytics = () => {
  const [forecastData, setForecastData] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchForecast = async () => {
    setLoading(true)
    try {
      const response = await api.get("/analytics/forecast")
      if (response.data && response.data.forecasts) {
        setForecastData(response.data.forecasts)
      }
    } catch (error) {
      console.error("Error fetching forecast:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchForecast()
  }, [])

  // Mock historical data
  const historicalData = [
    { date: "01/05", revenue: 1200000 },
    { date: "02/05", revenue: 1500000 },
    { date: "03/05", revenue: 980000 },
    { date: "04/05", revenue: 1890000 },
    { date: "05/05", revenue: 2100000 },
    { date: "06/05", revenue: 1750000 },
    { date: "07/05", revenue: 2300000 },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Phân tích & Dự đoán</h1>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="predict">Dự đoán doanh thu</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Biểu đồ doanh thu theo thời gian</CardTitle>
              <CardDescription>Dữ liệu 7 ngày gần nhất</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Tooltip
                      formatter={(value) =>
                        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predict" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Dự đoán doanh thu 7 ngày tới
              </CardTitle>
              <CardDescription>Sử dụng thuật toán Linear Regression dựa trên dữ liệu lịch sử</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex justify-end">
                <Button onClick={fetchForecast} disabled={loading} variant="outline" size="sm">
                  <Calendar className="mr-2 h-4 w-4" />
                  Cập nhật dự đoán
                </Button>
              </div>

              {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <p className="text-muted-foreground">Đang tính toán dự đoán...</p>
                </div>
              ) : forecastData.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" label={{ value: "Ngày tới", position: "insideBottom", offset: -5 }} />
                      <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                      <Tooltip
                        formatter={(value) =>
                          new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)
                        }
                        labelFormatter={(label) => `Ngày thứ ${label} tiếp theo`}
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted_revenue"
                        stroke="#8884d8"
                        strokeWidth={3}
                        activeDot={{ r: 8 }}
                        name="Dự đoán"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center border rounded-md bg-muted/20">
                  <p className="text-muted-foreground">Chưa có đủ dữ liệu để dự đoán</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Analytics
