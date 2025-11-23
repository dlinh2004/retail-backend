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
      await api.post("/sales", {
        productId: Number(newOrder.productId),
        staffId: user.id,
        quantity: Number(newOrder.quantity),
      })

      toast({ title: "Thành công", description: "Đã tạo đơn hàng mới" })
      fetchData() // Reload data
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
                  <SelectTrigger>
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
            <CardTitle>Lịch sử bán hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
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
                    sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>#{sale.id}</TableCell>
                        <TableCell className="font-medium">
                          {sale.product?.name || `Product #${sale.productId}`}
                        </TableCell>
                        <TableCell>{sale.quantity}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                            sale.total_price,
                          )}
                        </TableCell>
                        <TableCell>{sale.sold_at ? format(new Date(sale.sold_at), "dd/MM/yyyy HH:mm") : "-"}</TableCell>
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
