import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export type UserRole = 'GTE_ADMIN' | 'SCHOOL_DIRECTOR' | 'SOCIAL_WORKER' | 'HEALTH_WORKER' | 'TEACHER'

export interface AuthUser {
    email: string
    role: UserRole
    firstName?: string
    lastName?: string
}

export interface AuthContextType {
    user: AuthUser | null
    token: string | null
    loading: boolean
    login: (token: string) => void
    logout: () => void
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Robustly decode a JWT payload handling base64url encoding
 */
const decodeToken = (token: string): any => {
    try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
        return JSON.parse(jsonPayload)
    } catch (e) {
        console.error("Token decoding failed", e)
        return null
    }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
    const [user, setUser] = useState<AuthUser | null>(() => {
        const storedToken = localStorage.getItem('token')
        if (storedToken) {
            const payload = decodeToken(storedToken)
            if (payload) {
                const isExpired = (payload.exp * 1000) < (Date.now() - 300000)
                if (!isExpired) {
                    return {
                        email: payload.sub || '',
                        role: payload.role || 'SOCIAL_WORKER',
                        firstName: payload.first_name,
                        lastName: payload.last_name
                    }
                }
            }
            localStorage.removeItem('token')
        }
        return null
    })
    const [loading, setLoading] = useState(false)

    const logout = useCallback(() => {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
    }, [])

    useEffect(() => {
        const checkToken = () => {
            const storedToken = localStorage.getItem('token')
            if (storedToken) {
                const payload = decodeToken(storedToken)
                if (payload) {
                    const isExpired = (payload.exp * 1000) < (Date.now() - 300000)
                    if (isExpired) {
                        logout()
                    } else if (!user) {
                        setToken(storedToken)
                        setUser({
                            email: payload.sub || '',
                            role: payload.role || 'SOCIAL_WORKER',
                            firstName: payload.first_name,
                            lastName: payload.last_name
                        })
                    }
                } else {
                    logout()
                }
            }
            setLoading(false)
        }

        checkToken() // Re-check on mount
        const interval = setInterval(checkToken, 30000)
        return () => clearInterval(interval)
    }, [user, logout])

    const login = (newToken: string) => {
        localStorage.setItem('token', newToken)
        setToken(newToken)
        const payload = decodeToken(newToken)
        if (payload) {
            setUser({
                email: payload.sub || '',
                role: payload.role || 'SOCIAL_WORKER',
                firstName: payload.first_name,
                lastName: payload.last_name
            })
        }
    }

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            loading, 
            login, 
            logout, 
            isAuthenticated: !!user 
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}

export default AuthContext
