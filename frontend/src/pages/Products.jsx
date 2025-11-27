"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const Products = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentProduct, setCurrentProduct] = useState(null)
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
  })

  const fetchProducts = async () => {
    try {
      const response = await api.get("/products")
      setProducts(response.data)
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleOpenDialog = (product = null) => {
    console.log('Products.handleOpenDialog called, product:', product)
    if (product) {
      setCurrentProduct(product)
      setFormData({
        name: product.name,
        price: product.price,
        stock: product.stock,
      })
    } else {
      setCurrentProduct(null)
      setFormData({
        name: "",
        price: "",
        stock: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const tokenPreview = localStorage.getItem('token')
      const payloadPreview = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
      }
      console.debug('Products.handleSubmit token:', !!tokenPreview, 'payload:', payloadPreview)
      if (currentProduct) {
        // Edit existing product
        const token = localStorage.getItem('token')
        await api.put(
          `/products/${currentProduct.id}`,
          {
            ...formData,
            price: Number(formData.price),
            stock: Number(formData.stock),
          },
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        )
        toast({ title: "Thành công", description: "Đã cập nhật sản phẩm" })
      } else {
        // Create new product
        const token = localStorage.getItem('token')
        await api.post(
          "/products",
          {
            ...formData,
            price: Number(formData.price),
            stock: Number(formData.stock),
          },
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        )
        toast({ title: "Thành công", description: "Đã tạo sản phẩm mới" })
      }
      setIsDialogOpen(false)
      fetchProducts()
    } catch (error) {
      console.error('Products.create error:', error)
      const msg = error.response?.data?.message || error.message || 'Có lỗi xảy ra'
      const status = error.response?.status
      toast({
        title: "Lỗi",
        description: status ? `${msg} (status ${status})` : msg,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xoá sản phẩm này?")) {
      try {
        const token = localStorage.getItem('token')
        await api.delete(`/products/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
        toast({ title: "Thành công", description: "Đã xoá sản phẩm" })
        fetchProducts()
      } catch (error) {
        toast({
          title: "Lỗi",
          description: "Không thể xoá sản phẩm",
          variant: "destructive",
        })
      }
    }
  }

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Sản phẩm</h1>
        {isAdmin && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> Thêm sản phẩm
          </Button>
        )}
      </div>

      <div className="flex items-center py-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tên sản phẩm</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Tồn kho</TableHead>
              {isAdmin && <TableHead className="text-right">Hành động</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy sản phẩm nào
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.id}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(product.price)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        product.stock > 10
                          ? "bg-green-100 text-green-800"
                          : product.stock > 0
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.stock}
                    </span>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit product ${product.name}`}
                        onClick={() => handleOpenDialog(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        aria-label={`Delete product ${product.name}`}
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div data-testid="dialog-state" className="mb-2 text-sm text-muted-foreground">Dialog state: {isDialogOpen ? 'OPEN' : 'CLOSED'}</div>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentProduct ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên sản phẩm</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Giá</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Số lượng tồn</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">Lưu</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Products
