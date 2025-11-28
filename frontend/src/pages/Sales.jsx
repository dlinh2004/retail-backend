"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { ShoppingCart } from "lucide-react"
import { format } from "date-fns"

const Sales = () => {
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const [newOrder, setNewOrder] = useState({
    productId: "",
    quantity: 1,
  })
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [filteredSales, setFilteredSales] = useState(null)

  const handleExportCsv = () => {
    const data = (filteredSales ?? sales) || []
    if (data.length === 0) {
      toast({ title: 'Lỗi', description: 'Không có dữ liệu để xuất', variant: 'destructive' })
      return
    }

    const rows = [["ID", "Sản phẩm", "Số lượng", "Tổng tiền", "Ngày bán"]]
    data.forEach((s) => {
      const prod = s.product?.name || `Product #${s.productId}`
      const total = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(s.total || 0)
      const date = s.soldAt ? format(new Date(s.soldAt), "dd/MM/yyyy HH:mm") : ""
      rows.push([`#${s.id}`, prod, String(s.quantity), total, date])
    })

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')

    // Add BOM so Excel opens UTF-8 correctly
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-history-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const fetchData = async () => {
    try {
      const [salesRes, productsRes] = await Promise.all([api.get("/sales"), api.get("/products")])
      setSales(salesRes.data)
      setProducts(productsRes.data)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateOrder = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const resp = await api.post(
        "/sales",
        {
          productId: Number(newOrder.productId),
          staffId: user.id,
          quantity: Number(newOrder.quantity),
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      )

      toast({ title: "Thành công", description: "Đã tạo đơn hàng mới" })
      fetchData() // Reload data

      // Notify other parts of the app (eg. Dashboard) that a new sale was created
      try {
        if (resp && resp.data) {
          window.dispatchEvent(new CustomEvent('sale:created', { detail: resp.data }))
        } else {
          window.dispatchEvent(new CustomEvent('sale:created'))
        }
      } catch (e) {
        // ignore event dispatch errors
      }
      setNewOrder({ productId: "", quantity: 1 })
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tạo đơn hàng",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Bán hàng</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Tạo đơn hàng mới</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product">Sản phẩm</Label>
                <Select
                  value={newOrder.productId}
                  onValueChange={(value) => setNewOrder({ ...newOrder, productId: value })}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Chọn sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name} -{" "}
                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(p.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Số lượng</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={!newOrder.productId}>
                <ShoppingCart className="mr-2 h-4 w-4" /> Tạo đơn hàng
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle>Lịch sử bán hàng</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-40"
                  />
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-40"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      // compute start/end and filter
                      if (!fromDate && !toDate) {
                        setFilteredSales(null)
                        return
                      }
                      const start = fromDate ? new Date(fromDate + "T00:00:00") : new Date(-8640000000000000)
                      const end = toDate
                        ? new Date(toDate + "T23:59:59")
                        : new Date((fromDate || toDate) + "T23:59:59")
                      const filtered = sales.filter((s) => {
                        if (!s.soldAt) return false
                        const t = new Date(s.soldAt)
                        return t >= start && t <= end
                      })
                      setFilteredSales(filtered)
                    }}
                  >
                    Lọc
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFromDate("")
                      setToDate("")
                      setFilteredSales(null)
                    }}
                  >
                    Reset
                  </Button>
                  <Button onClick={handleExportCsv} className="ml-2">
                    Xuất Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Tổng tiền</TableHead>
                    <TableHead>Ngày bán</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : sales.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          Chưa có đơn hàng nào
                        </TableCell>
                    </TableRow>
                  ) : (
                      (filteredSales ?? sales).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>#{sale.id}</TableCell>
                        <TableCell className="font-medium">
                          {sale.product?.name || `Product #${sale.productId}`}
                        </TableCell>
                        <TableCell>{sale.quantity}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                            sale.total || 0,
                          )}
                        </TableCell>
                        <TableCell>{sale.soldAt ? format(new Date(sale.soldAt), "dd/MM/yyyy HH:mm") : "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Sales
