"use client"

import { createContext, useState, useContext, useEffect } from "react"
import api from "../services/api"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    const token = localStorage.getItem("token")

    if (storedUser && token) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      const response = await api.post("/auth/login", { username, password })
      const { access_token, user: userData } = response.data

      localStorage.setItem("token", access_token)
      localStorage.setItem("user", JSON.stringify(userData))
      setUser(userData)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Đăng nhập thất bại",
      }
    }
  }

  const register = async (username, password, role = "staff") => {
    try {
      await api.post("/auth/register", { username, password, role })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Đăng ký thất bại",
      }
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}
