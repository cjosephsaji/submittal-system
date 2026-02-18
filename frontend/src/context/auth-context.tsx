"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import api from "@/lib/api"

interface User {
    id: number
    email: string
    full_name: string
    role: string
    tenant_id: number
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    login: (token: string) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [token, setToken] = useState<string | null>(null)
    const router = useRouter()
    const pathname = usePathname()

    // Initialize from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem("token")
        if (storedToken) {
            setToken(storedToken)
            fetchUser(storedToken)
        } else {
            setIsLoading(false)
            if (pathname.startsWith("/dashboard")) {
                router.push("/login")
            }
        }
    }, [])

    const fetchUser = async (authToken: string) => {
        try {
            // Ensure api client uses this token
            // (Mocking the interceptor logic here if not present in api util)
            const response = await api.get("users/me", {
                headers: { Authorization: `Bearer ${authToken}` }
            })
            setUser(response.data)
        } catch (error) {
            console.error("Failed to fetch user", error)
            logout() // Invalid token
        } finally {
            setIsLoading(false)
        }
    }

    const login = (newToken: string) => {
        localStorage.setItem("token", newToken)
        setToken(newToken)
        fetchUser(newToken)
        router.push("/dashboard")
    }

    const logout = () => {
        localStorage.removeItem("token")
        setToken(null)
        setUser(null)
        router.push("/login")
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
