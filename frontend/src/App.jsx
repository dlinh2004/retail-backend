import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import AppRouter from "./router/AppRouter"
import { Toaster } from "@/components/ui/toaster"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
