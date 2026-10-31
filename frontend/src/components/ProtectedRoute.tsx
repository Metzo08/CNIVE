import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, UserRole } from '../context/AuthContext'

interface ProtectedRouteProps {
    children: React.ReactNode
    requiredRoles?: UserRole[]
}

/**
 * Route guard component.
 * - Redirects to /login if not authenticated
 * - Optionally checks required roles
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles }) => {
    const { isAuthenticated, user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
                <div style={{ color: '#3b82f6', fontSize: '1.2rem', fontWeight: 600 }}>Initialisation...</div>
            </div>
        )
    }

    if (!isAuthenticated) {
        // Redirect to login, preserving the intended destination
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    if (requiredRoles && requiredRoles.length > 0 && (!user || !requiredRoles.includes(user.role))) {
        // User doesn't have the required role — redirect to dashboard
        return <Navigate to="/" replace />
    }

    return <>{children}</>
}

export default ProtectedRoute
