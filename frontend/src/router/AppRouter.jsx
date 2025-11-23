import { Routes, Route, Navigate } from "react-router-dom"
import Layout from "../components/Layout"
import ProtectedRoute from "./ProtectedRoute"
import Login from "../pages/Login"
import Dashboard from "../pages/Dashboard"
import Products from "../pages/Products"
import Sales from "../pages/Sales"
import Analytics from "../pages/Analytics"
import Users from "../pages/Users"

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="sales" element={<Sales />} />
        <Route path="analytics" element={<Analytics />} />

        <Route
          path="users"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default AppRouter
