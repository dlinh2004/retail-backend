"use client"

import { useEffect, useState } from "react"
import api from "../services/api"
import { useAuth } from "../context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Plus, User, Pencil, Trash2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"

const Users = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const { toast } = useToast()
  const { isAdmin } = useAuth()

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "staff",
  })

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users")
      setUsers(response.data)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleOpenDialog = (user = null) => {
    if (user) {
      setCurrentUser(user)
      setFormData({ username: user.username || "", password: "", role: user.role || "staff" })
    } else {
      setCurrentUser(null)
      setFormData({ username: "", password: "", role: "staff" })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setCurrentUser(null)
    setFormData({ username: "", password: "", role: "staff" })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Basic client-side validation
    if (!formData.username || !formData.username.trim()) {
      toast({ title: "Lỗi", description: "Username không được để trống", variant: "destructive" })
      return
    }

    // Password required for create, optional for update
    if (!currentUser) {
      if (!formData.password || formData.password.length < 6) {
        toast({ title: "Lỗi", description: "Password phải có tối thiểu 6 ký tự", variant: "destructive" })
        return
      }
    } else if (formData.password && formData.password.length > 0 && formData.password.length < 6) {
      toast({ title: "Lỗi", description: "Password phải có tối thiểu 6 ký tự", variant: "destructive" })
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (currentUser) {
        // update
        const payload = { username: formData.username, role: formData.role }
        if (formData.password && formData.password.length > 0) payload.password = formData.password

        await api.put(
          `/users/${currentUser.id}`,
          payload,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        )

        toast({ title: "Thành công", description: "Đã cập nhật người dùng" })
      } else {
        // create
        await api.post(
          "/users",
          {
            username: formData.username,
            password: formData.password,
            role: formData.role,
          },
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        )

        toast({ title: "Thành công", description: "Đã tạo nhân viên mới" })
      }
      handleCloseDialog()
      fetchUsers()
    } catch (error) {
      console.error("Users.create error:", error)
      const msg = error.response?.data?.message || error.message || "Có lỗi xảy ra"
      const status = error.response?.status
      toast({ title: "Lỗi", description: status ? `${msg} (status ${status})` : msg, variant: "destructive" })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá người dùng này?')) return

    try {
      const token = localStorage.getItem('token')
      await api.delete(`/users/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      toast({ title: 'Thành công', description: 'Đã xoá người dùng' })
      fetchUsers()
    } catch (error) {
      console.error('Users.delete error:', error)
      toast({ title: 'Lỗi', description: 'Không thể xoá người dùng', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý người dùng</h1>
        {isAdmin ? (
          <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Thêm nhân viên
          </Button>
        ) : null}
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              {isAdmin && <TableHead className="text-right">Hành động</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell className="font-medium flex items-center">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    {user.username}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${user.username}`} onClick={() => handleOpenDialog(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" aria-label={`Delete ${user.username}`} onClick={() => handleDelete(user.id)}>
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


      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{currentUser ? "Sửa người dùng" : "Thêm nhân viên"}</SheetTitle>
            <SheetDescription>{currentUser ? "Cập nhật thông tin người dùng." : "Nhập thông tin đăng nhập cho nhân viên mới."}</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <Label className="mb-2 block">Username</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData((s) => ({ ...s, username: e.target.value }))}
                placeholder="username"
              />
            </div>

            <div>
              <Label className="mb-2 block">Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((s) => ({ ...s, password: e.target.value }))}
                placeholder="******"
              />
            </div>

            <div>
              <Label className="mb-2 block">Vai trò</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData((s) => ({ ...s, role: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => handleCloseDialog()}>
                Hủy
              </Button>
              <Button type="submit">{currentUser ? "Cập nhật" : "Tạo"}</Button>
            </div>
          </form>

          <SheetFooter />
          <SheetClose />
        </SheetContent>
      </Sheet>

    </div>
  )
}

export default Users
