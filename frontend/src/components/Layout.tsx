import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'
import { useTranslation } from 'react-i18next'
import ErrorBoundary from './ErrorBoundary'
import { 
    LayoutDashboard, Users, AlertTriangle, Activity, 
    Stethoscope, Map, CreditCard, 
    FileText, BrainCircuit, Bell, ClipboardList, 
    Settings, LogOut, Menu, X, Languages, Archive,
    ChevronLeft, Shield
} from 'lucide-react'

interface NavItem {
    path: string;
    label: string;
    icon: any;
    badge?: number;
}

interface NavSection {
    id: string;
    title: string;
    items: NavItem[];
}

const Layout: React.FC = () => {
    const { t, i18n } = useTranslation()
    const location = useLocation()
    const navigate = useNavigate()
    const { mode, colors, toggleTheme } = useTheme()
    const { user, logout } = useAuth()
    
    const [unreadAlerts, setUnreadAlerts] = useState(0)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [langMenuOpen, setLangMenuOpen] = useState(false)
    const [isOnline, setIsOnline] = useState(navigator.onLine)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const res = await apiClient.get('/alerts/unread-count')
                setUnreadAlerts(res.data.count || 0)
            } catch (error) {}
        }
        fetchCounts()
        const interval = setInterval(fetchCounts, 30000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        setMobileMenuOpen(false)
    }, [location.pathname])

    const formatLabel = (text: string) => {
        if (!text) return ""
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    }

    // Navigation structurée par domaines métier
    const navSections: NavSection[] = [
        {
            id: 'general',
            title: 'Pilotage',
            items: [
                { path: '/', label: formatLabel(t('nav.dashboard')), icon: LayoutDashboard },
                { path: '/alerts', label: formatLabel(t('nav.alerts')), icon: Bell, badge: unreadAlerts }
            ]
        },
        {
            id: 'beneficiaries',
            title: 'Bénéficiaires et terrain',
            items: [
                { path: '/pupils', label: formatLabel(t('nav.pupils')), icon: Users },
                { path: '/vulnerability', label: formatLabel(t('nav.assessment')), icon: AlertTriangle },
                { path: '/analytics', label: formatLabel(t('nav.ai_analysis')), icon: BrainCircuit },
                { path: '/interventions', label: formatLabel(t('nav.interventions')), icon: Activity },
                { path: '/health', label: formatLabel(t('nav.health')), icon: Stethoscope },
                { path: '/map', label: formatLabel(t('nav.map')), icon: Map }
            ]
        },
        {
            id: 'tools',
            title: 'Services et documents',
            items: [
                { path: '/cards', label: formatLabel(t('nav.cards')), icon: CreditCard },
                { path: '/reports', label: formatLabel(t('nav.reports')), icon: FileText }
            ]
        },
        {
            id: 'admin',
            title: 'Administration',
            items: [
                ...(user?.role === 'GTE_ADMIN' ? [{ path: '/team', label: formatLabel(t('nav.team')), icon: ClipboardList }] : []),
                ...(user?.role === 'GTE_ADMIN' ? [{ path: '/audit', label: formatLabel(t('nav.audit')), icon: Shield }] : []),
                ...(user?.role === 'GTE_ADMIN' || user?.role === 'SCHOOL_DIRECTOR' ? [{ path: '/archives', label: formatLabel(t('nav.archives')), icon: Archive }] : []),
                { path: '/settings', label: formatLabel(t('nav.settings')), icon: Settings }
            ]
        }
    ].filter(section => section.items.length > 0)

    const allNavItems = navSections.flatMap(s => s.items)

    // Barre mobile inférieure (les 5 accès rapides essentiels)
    const bottomNavItems = [
        { path: '/', label: formatLabel(t('nav.dashboard')), icon: LayoutDashboard },
        { path: '/pupils', label: formatLabel(t('nav.pupils')), icon: Users },
        { path: '/alerts', label: formatLabel(t('nav.alerts')), icon: Bell, badge: unreadAlerts },
        { path: '/interventions', label: formatLabel(t('nav.interventions')), icon: Activity },
        { path: '/health', label: formatLabel(t('nav.health')), icon: Stethoscope },
    ]

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng)
        setLangMenuOpen(false)
    }

    const displayName = user?.email ? (user.email.split('@')[0]) : (t('roles.user') || 'Utilisateur')
    const getRoleLabel = () => {
        if (!user) return 'Utilisateur'
        switch (user.role) {
            case 'GTE_ADMIN':
                return 'Administrateur national'
            case 'SCHOOL_DIRECTOR':
                return 'Directeur d’école'
            case 'TEACHER':
                return 'Enseignant'
            case 'SOCIAL_WORKER':
                return 'Travailleur social'
            case 'HEALTH_WORKER':
                return 'Agent de santé'
            default:
                return formatLabel(user.role)
        }
    }
    const roleLabel = getRoleLabel()
    const isCollapsed = sidebarCollapsed && !mobileMenuOpen

    return (
        <div className="flex min-h-screen transition-colors duration-500" style={{ backgroundColor: colors.bg, color: colors.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Overlay Mobile */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-md transition-all duration-500 animate-in fade-in"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Améliorée avec Navigation Structurée */}
            <aside 
                className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] border-r border-slate-200 dark:border-white/5 lg:translate-x-0 ${
                    mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
                } ${sidebarCollapsed ? 'lg:w-24' : 'lg:w-[290px] w-[85vw] max-w-[320px]'}`}
                style={{ backgroundColor: colors.bgSecondary }}
            >
                {/* En-tête Sidebar Institutionnel Unique */}
                <div className="p-3.5 border-b border-slate-200/60 dark:border-white/5">
                    {(!isCollapsed || mobileMenuOpen) ? (
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0 bg-slate-100/70 dark:bg-white/5 p-2 rounded-2xl border border-slate-200/60 dark:border-white/5">
                                <img 
                                    src="/logo_ministere.png" 
                                    className="h-8 w-auto object-contain flex-shrink-0" 
                                    alt="Ministère de l'éducation nationale" 
                                    onError={(e) => { e.currentTarget.style.display = 'none' }} 
                                />
                                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                                    <span className="text-[8px] font-black tracking-wider text-slate-400 dark:text-slate-400 truncate">
                                        République du sénégal
                                    </span>
                                    <span className="text-[10px] font-black text-slate-800 dark:text-slate-100 truncate">
                                        Éducation nationale
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <img 
                                        src="/logo_gte.jpg" 
                                        className="w-7 h-7 rounded-lg shadow-sm border border-slate-200 dark:border-white/10 object-cover" 
                                        alt="Groupe thématique éducation" 
                                        title="Groupe thématique éducation (gte)"
                                        onError={(e) => { e.currentTarget.style.display = 'none' }} 
                                    />
                                    <img 
                                        src="/logo_nouscims.png" 
                                        className="h-5 w-auto object-contain" 
                                        alt="Nous Cims" 
                                        title="Fondation nous cims"
                                        onError={(e) => { e.currentTarget.style.display = 'none' }} 
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={() => mobileMenuOpen ? setMobileMenuOpen(false) : setSidebarCollapsed(!sidebarCollapsed)} 
                                className="p-2 transition-all rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 flex-shrink-0 touch-target"
                                title="Réduire le menu"
                            >
                                {mobileMenuOpen ? <X size={20}/> : <ChevronLeft size={20}/>}
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-1">
                                <img 
                                    src="/logo_gte.jpg" 
                                    className="w-8 h-8 rounded-xl shadow-md border border-slate-200 dark:border-white/10 object-cover" 
                                    alt="GTE" 
                                    title="Groupe thématique éducation (gte)" 
                                />
                            </div>
                            <button 
                                onClick={() => setSidebarCollapsed(false)} 
                                className="p-2 transition-all rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90"
                                title="Agrandir le menu"
                            >
                                <Menu size={20}/>
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation par sections */}
                <nav className="flex-1 px-3 space-y-4 overflow-y-auto no-scrollbar pb-6 pt-1">
                    {navSections.map((section) => (
                        <div key={section.id} className="space-y-1">
                            {!isCollapsed && (
                                <p className="px-3 text-[10px] font-black tracking-[0.12em] text-slate-400 dark:text-slate-500 pt-2 pb-1">
                                    {section.title}
                                </p>
                            )}
                            {isCollapsed && (
                                <div className="w-8 h-px bg-slate-200 dark:bg-white/10 mx-auto my-2" />
                            )}
                            {section.items.map((item) => {
                                const isActive = location.pathname === item.path
                                const Icon = item.icon
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        title={isCollapsed ? item.label : undefined}
                                        className={`flex items-center group relative min-h-[48px] px-3.5 py-2.5 rounded-2xl transition-all duration-300 ${
                                            isActive 
                                                ? 'shadow-md shadow-primary-500/10 font-black' 
                                                : 'hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-500 dark:text-slate-400'
                                        } ${isCollapsed ? 'justify-center' : 'justify-start gap-3.5'}`}
                                        style={{ 
                                            backgroundColor: isActive ? `${colors.primary}18` : 'transparent',
                                            color: isActive ? colors.primary : colors.textSecondary
                                        }}
                                    >
                                        {isActive && (
                                            <div 
                                                className={`absolute left-0 top-2.5 bottom-2.5 rounded-r-full transition-all duration-500 ${
                                                    isCollapsed ? 'w-1' : 'w-1.5'
                                                }`} 
                                                style={{ 
                                                    backgroundColor: colors.primary, 
                                                    boxShadow: `0 0 16px ${colors.primary}` 
                                                }} 
                                            />
                                        )}
                                        <div 
                                            className={`flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-115 ${
                                                isActive ? 'scale-105' : 'opacity-80 group-hover:opacity-100'
                                            }`} 
                                            style={{ color: isActive ? colors.primary : 'currentColor' }}
                                        >
                                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                        </div>
                                        {!isCollapsed && (
                                            <span className="text-[0.88rem] truncate tracking-tight">
                                                {item.label}
                                            </span>
                                        )}
                                        
                                        {item.badge !== undefined && item.badge > 0 && (
                                            isCollapsed ? (
                                                <div 
                                                    className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 animate-pulse" 
                                                    style={{ boxShadow: `0 0 0 2px ${colors.bgSecondary}` }} 
                                                />
                                            ) : (
                                                <span className="ml-auto px-2 py-0.5 text-[10px] font-black bg-red-500 text-white rounded-lg shadow-md shadow-red-500/30">
                                                    {item.badge > 99 ? '99+' : item.badge}
                                                </span>
                                            )
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    ))}
                </nav>

                {/* Profil Utilisateur & Déconnexion */}
                <div className="p-3.5 mt-auto border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/10">
                    <div className={`flex items-center gap-3 p-2.5 rounded-2xl mb-2 transition-all bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 ${isCollapsed ? 'justify-center' : ''}`}>
                        <div 
                            className="flex items-center justify-center flex-shrink-0 text-sm font-black text-white w-9 h-9 rounded-xl shadow-md" 
                            style={{ backgroundColor: colors.primary }}
                        >
                            {(displayName || 'U').charAt(0).toUpperCase()}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0 overflow-hidden animate-in fade-in duration-300">
                                <p className="text-xs font-black truncate">{displayName}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[9px] tracking-wider font-black text-slate-400">{roleLabel}</p>
                                </div>
                                {user?.schoolName && (
                                    <p className="text-[10px] font-bold text-sky-400 truncate mt-1" title={user.schoolName}>
                                        🏫 {user.schoolName}
                                    </p>
                                )}
                                {user?.grade && (
                                    <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-black rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        Classe : {user.grade}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={handleLogout} 
                        title={isCollapsed ? formatLabel(t('nav.logout')) : undefined}
                        className={`flex items-center w-full px-3 py-2.5 text-xs font-black text-red-500 transition-all rounded-xl hover:bg-red-500/10 active:scale-95 group touch-target ${isCollapsed ? 'justify-center' : 'gap-3'}`}
                    >
                        <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                        {!isCollapsed && <span className="tracking-wider text-[11px]">{formatLabel(t('nav.logout'))}</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main 
                className={`flex flex-col flex-1 min-h-screen transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    sidebarCollapsed ? 'lg:ml-24' : 'lg:ml-[290px]'
                }`}
            >
                {/* Bandeau Hors-Ligne */}
                {!isOnline && (
                    <div className="bg-amber-500/90 text-slate-950 px-4 py-2 text-center text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-md z-50">
                        <span>📶 Mode hors-ligne actif</span>
                        <span className="opacity-80 font-medium">— vos consultations restent disponibles depuis le cache local pwa</span>
                    </div>
                )}
                {/* Header Moderne */}
                <header 
                    className="sticky top-0 z-30 h-16 md:h-18 px-4 md:px-8 flex items-center justify-between backdrop-blur-2xl border-b border-slate-200/60 dark:border-white/5" 
                    style={{ backgroundColor: `${colors.bg}ee` }}
                >
                    <div className="flex items-center gap-3 md:gap-5 min-w-0">
                        {/* Bouton Hamburger Mobile */}
                        <button 
                            onClick={() => setMobileMenuOpen(true)} 
                            className="p-2.5 transition-all rounded-xl bg-slate-100 dark:bg-white/5 lg:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 shadow-sm touch-target shrink-0"
                            title="Ouvrir le menu"
                        >
                            <Menu size={20}/>
                        </button>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-base md:text-2xl font-black tracking-tight truncate max-w-[160px] sm:max-w-[240px] md:max-w-none">
                                {allNavItems.find(i => i.path === location.pathname)?.label || 'Cnive'}
                            </h2>
                            <div className="hidden sm:flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.1em] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Plateforme nationale • sénégal
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                        {/* Sélecteur de langue */}
                        <div className="relative hidden sm:block">
                            <button 
                                onClick={() => setLangMenuOpen(!langMenuOpen)}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-black transition-all bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 touch-target"
                            >
                                <Languages size={15} style={{ color: colors.primary }} />
                                <span className="hidden md:inline tracking-widest">{formatLabel(i18n.language)}</span>
                            </button>
                            {langMenuOpen && (
                                <div 
                                    className="absolute top-[calc(100%+10px)] right-0 p-2 min-w-[170px] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/5 animate-in zoom-in-95 fade-in duration-200 z-[100]"
                                    style={{ backgroundColor: colors.card }}
                                >
                                    <button onClick={() => changeLanguage('fr')} className={`flex items-center gap-3 w-full p-2.5 text-xs font-black tracking-wider rounded-xl transition-all ${i18n.language === 'fr' ? 'bg-primary-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                        <span className="text-base">🇫🇷</span> Français
                                    </button>
                                    <button onClick={() => changeLanguage('es')} className={`flex items-center gap-3 w-full p-2.5 text-xs font-black tracking-wider rounded-xl transition-all mt-1 ${i18n.language === 'es' ? 'bg-primary-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                        <span className="text-base">🇪🇸</span> Español
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Thème Clair / Sombre */}
                        <button 
                            onClick={toggleTheme} 
                            className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 transition-all bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl hover:scale-105 active:scale-95 text-base md:text-lg shadow-sm touch-target"
                            title="Basculer le thème"
                        >
                            {mode === 'light' ? '🌙' : '☀️'}
                        </button>
                        
                        {/* Avatar */}
                        <div className="hidden sm:block w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-0.5 overflow-hidden">
                            <div className="w-full h-full rounded-[9px] flex items-center justify-center font-black text-white text-xs shadow-sm" style={{ backgroundColor: colors.primary }}>
                                {(displayName || 'U').charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Contenu Page avec cloisonnement ErrorBoundary */}
                <div className="flex-1 p-4 md:p-8 lg:p-10 pb-24 lg:pb-8 animate-in fade-in zoom-in-95 duration-500">
                    <ErrorBoundary key={location.pathname} fallbackTitle="Interruption sur cette page">
                        <Outlet />
                    </ErrorBoundary>
                </div>
            </main>

            {/* Barre de navigation mobile inférieure */}
            <nav 
                className="bottom-nav lg:hidden"
                style={{ 
                    backgroundColor: `${colors.bgSecondary}f5`,
                    borderColor: colors.border
                }}
            >
                <div className="flex items-stretch px-2 py-1">
                    {bottomNavItems.map((item) => {
                        const isActive = location.pathname === item.path
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="bottom-nav-item"
                                style={{ 
                                    color: isActive ? colors.primary : colors.textSecondary,
                                    backgroundColor: isActive ? `${colors.primary}15` : 'transparent'
                                }}
                            >
                                {isActive && (
                                    <div 
                                        className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: colors.primary }}
                                    />
                                )}
                                <div className="relative">
                                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span className="absolute -top-2 -right-2 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-black bg-red-500 text-white rounded-full px-1 shadow-lg">
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    )}
                                </div>
                                <span 
                                    className="bottom-nav-label"
                                    style={{ color: isActive ? colors.primary : colors.textSecondary }}
                                >
                                    {item.label && item.label.length > 7 ? `${item.label.slice(0, 7)}.` : item.label}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}

export default Layout
