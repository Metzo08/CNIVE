import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type ThemeMode = 'dark' | 'light'

interface ThemeColors {
    bg: string
    bgSecondary: string
    card: string
    border: string
    text: string
    textSecondary: string
    inputBg: string
    primary: string
    primaryHover: string
    accent: string
    radius: string
}

interface ThemeContextType {
    mode: ThemeMode
    toggleTheme: () => void
    colors: ThemeColors
}

const darkTheme: ThemeColors = {
    bg: '#0B1120',          // Bleu nuit très profond, meilleur que le gris
    bgSecondary: '#111827', // Gris/Bleu foncé
    card: '#1F2937',        // Surface surélevée
    border: '#374151',
    text: '#F9FAFB',        // Blanc presque pur
    textSecondary: '#9CA3AF',// Gris clair lisible
    inputBg: '#111827',
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    accent: '#8b5cf6',
    radius: '24px'
}

const lightTheme: ThemeColors = {
    bg: '#F9FAFB',          // Gris très clair (fond)
    bgSecondary: '#FFFFFF', // Blanc pur
    card: '#FFFFFF',
    border: '#E5E7EB',      // Bordure douce
    text: '#111827',        // Noir profond pour un contraste > 4.5:1
    textSecondary: '#4B5563',// Gris foncé lisible
    inputBg: '#FFFFFF',
    primary: '#2563EB',     // Bleu primaire légèrement plus foncé en mode clair
    primaryHover: '#1D4ED8',
    accent: '#7C3AED',
    radius: '24px'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('cnive-theme')
        return (saved as ThemeMode) || 'dark'
    })

    useEffect(() => {
        localStorage.setItem('cnive-theme', mode)
        
        // Add/remove .dark class from html element to enable Tailwind dark mode classes
        const root = window.document.documentElement
        if (mode === 'dark') {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }

        document.body.style.backgroundColor = mode === 'dark' ? darkTheme.bg : lightTheme.bg
        document.body.style.color = mode === 'dark' ? darkTheme.text : lightTheme.text
    }, [mode])

    const toggleTheme = () => {
        setMode(prev => prev === 'dark' ? 'light' : 'dark')
    }

    const colors = mode === 'dark' ? darkTheme : lightTheme

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}

export default ThemeContext
