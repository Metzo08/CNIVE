import React, { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import apiClient from '../api/client'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, BellRing, Filter, CheckCircle2, AlertTriangle, Info, ShieldAlert, Smartphone, Mail, MessageSquare, ChevronRight, Inbox, Loader2 } from 'lucide-react'

interface Alert {
    id: string
    pupil_id?: string
    school_id?: string
    alert_type: string
    level: string
    channel: string
    title: string
    message: string
    is_read: boolean
    is_escalated: boolean
    created_at: string
}

const AlertsPage: React.FC = () => {
    const { t, i18n } = useTranslation()
    const { colors, mode } = useTheme()
    const navigate = useNavigate()
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalAlerts, setTotalAlerts] = useState(0)
    const [unreadCount, setUnreadCount] = useState(0)
    const limit = 25

    const fetchAlerts = async () => {
        setLoading(true)
        try {
            const skip = (page - 1) * limit
            const unreadOnly = filter === 'unread'
            const response = await apiClient.get(`/alerts/`, {
                params: {
                    skip,
                    limit,
                    unread_only: unreadOnly,
                    level: (filter !== 'all' && filter !== 'unread') ? filter : undefined
                }
            })
            const data = response.data
            setAlerts(data.alerts || [])
            setTotalAlerts(data.total || 0)
        } catch (error) {} finally { setLoading(false) }
    }

    const fetchUnreadCount = async () => {
        try {
            const response = await apiClient.get('/alerts/unread-count')
            setUnreadCount(response.data?.count || 0)
        } catch (error) {}
    }

    useEffect(() => {
        fetchAlerts()
        fetchUnreadCount()
    }, [page, filter])

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter)
        setPage(1)
    }

    const handleAlertClick = async (alert: Alert) => {
        if (!alert.is_read) {
            try {
                await apiClient.post(`/alerts/${alert.id}/read`)
                setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_read: true } : a))
                setUnreadCount(prev => Math.max(0, prev - 1))
            } catch (err) {}
        }
        if (alert.pupil_id) {
            navigate(alert.alert_type === 'health' ? `/health?pupil=${alert.pupil_id}` : `/pupils/${alert.pupil_id}`)
        } else if (alert.alert_type === 'intervention') {
            navigate('/interventions')
        }
    }

    const markAllRead = async () => {
        try {
            await apiClient.post('/alerts/mark-all-read')
            setAlerts(alerts.map(a => ({ ...a, is_read: true })))
            setUnreadCount(0)
        } catch (err) {}
    }

    const getLevelConfig = (level: string) => {
        const upLevel = level?.toLowerCase() || ''
        if (upLevel === 'critical') return { color: '#ef4444', icon: <ShieldAlert size={18}/>, bg: '#ef444415', label: t('alerts.levels.critical') }
        if (upLevel === 'urgent') return { color: '#f97316', icon: <AlertTriangle size={18}/>, bg: '#f9731615', label: t('alerts.levels.urgent') }
        if (upLevel === 'warning') return { color: '#f59e0b', icon: <AlertTriangle size={18}/>, bg: '#f59e0b15', label: t('alerts.levels.warning') }
        return { color: '#3b82f6', icon: <Info size={18}/>, bg: '#3b82f615', label: t('alerts.levels.info') }
    }

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'email': return <Mail size={14}/>
            case 'sms': return <Smartphone size={14}/>
            default: return <MessageSquare size={14}/>
        }
    }

    const translateMessage = (alert: Alert) => {
        const titleLower = alert.title.toLowerCase()
        if (titleLower.includes('cmu non enrôlé') || titleLower.includes('cmu no inscrito')) {
            return { title: t('alerts.messages.cmu_not_enrolled'), message: t('alerts.messages.cmu_not_enrolled_desc') }
        }
        if (titleLower.includes('urgence: cas critique') || titleLower.includes('urgencia: caso crítico')) {
            return { title: t('alerts.messages.critical_vulnerability'), message: alert.message }
        }
        return { title: alert.title, message: alert.message }
    }

    const totalPages = Math.ceil(totalAlerts / limit) || 1

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-0 pb-20">
            {/* Premium Header */}
            <div className="relative overflow-hidden p-6 md:p-10 lg:p-14 rounded-2xl md:rounded-[2.5rem] mb-6 md:mb-10 shadow-2xl shadow-rose-500/20"
                 style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)' }}>
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-8">
                        <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                            <BellRing size={28} className="md:hidden" />
                            <BellRing size={40} className="hidden md:block" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter mb-1 md:mb-2">{t('alerts.title')}</h1>
                            <p className="text-white/80 text-sm md:text-base font-bold">{t('alerts.subtitle')}</p>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button onClick={markAllRead} className="bg-white text-rose-600 px-5 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2 md:gap-3 shrink-0">
                            <CheckCircle2 size={16} className="md:hidden"/> <CheckCircle2 size={20} className="hidden md:block"/> {t('alerts.mark_all_read')}
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile filter bar — horizontal scroll */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 lg:hidden">
                {[
                    { id: 'all', label: t('alerts.filters.all'), icon: <Inbox size={14}/> },
                    { id: 'unread', label: t('alerts.filters.unread'), icon: <Bell size={14}/> },
                    { id: 'critical', label: t('alerts.filters.critical'), icon: <ShieldAlert size={14}/> },
                    { id: 'warning', label: t('alerts.filters.warning'), icon: <AlertTriangle size={14}/> }
                ].map(f => {
                    const isActive = filter === f.id
                    return (
                        <button key={f.id} onClick={() => handleFilterChange(f.id)}
                            className={`whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0 ${
                                isActive 
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' 
                                : 'border'
                            }`}
                            style={isActive ? {} : { backgroundColor: colors.card, borderColor: colors.border, color: colors.textSecondary }}>
                            {f.icon} <span>{f.label}</span>
                        </button>
                    )
                })}
                <div className="shrink-0 flex items-center px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest" 
                     style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textSecondary }}>
                    {totalAlerts} {t('common.total') || 'total'}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
                {/* Sidebar filters — desktop only */}
                <div className="hidden lg:block lg:col-span-1 space-y-8">
                    <div className="rounded-[2.5rem] p-8 h-fit lg:sticky lg:top-24 border transition-all duration-300"
                         style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-3"
                            style={{ color: colors.textSecondary }}><Filter size={14}/> {t('alerts.filters.title')}</h3>
                        <div className="flex flex-col gap-2">
                            {[
                                { id: 'all', label: t('alerts.filters.all'), icon: <Inbox size={18}/> },
                                { id: 'unread', label: t('alerts.filters.unread'), icon: <Bell size={18}/> },
                                { id: 'critical', label: t('alerts.filters.critical'), icon: <ShieldAlert size={18}/> },
                                { id: 'warning', label: t('alerts.filters.warning'), icon: <AlertTriangle size={18}/> }
                            ].map(f => {
                                const isActive = filter === f.id
                                return (
                                    <button key={f.id} onClick={() => handleFilterChange(f.id)}
                                        className={`w-full px-4 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 ${
                                            isActive 
                                            ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20' 
                                            : 'hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                        style={isActive ? {} : { color: colors.textSecondary }}>
                                        <div className="shrink-0">{f.icon}</div>
                                        <span className="truncate">{f.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                        <div className="mt-10 pt-8 text-center border-t" style={{ borderColor: colors.border }}>
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.textSecondary }}>{t('alerts.total_count', { count: totalAlerts })}</p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-4">
                    {loading ? (
                        <div className="py-20 text-center">
                            <Loader2 className="animate-spin text-primary-500 mx-auto" size={48} />
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="border-2 border-dashed rounded-[3rem] p-20 text-center"
                             style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                            <Bell size={64} className="mx-auto mb-6 opacity-30" style={{ color: colors.textSecondary }}/>
                            <h3 className="text-xl font-black mb-2" style={{ color: colors.text }}>{t('alerts.empty.title')}</h3>
                            <p className="font-bold" style={{ color: colors.textSecondary }}>{t('alerts.empty.desc')}</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {alerts.map(alert => {
                                    const config = getLevelConfig(alert.level)
                                    const translated = translateMessage(alert)
                                    return (
                                        <div key={alert.id} onClick={() => handleAlertClick(alert)}
                                            className={`p-6 md:p-8 rounded-[2rem] cursor-pointer relative overflow-hidden flex flex-col sm:flex-row gap-6 border transition-all duration-300 hover:shadow-2xl group ${
                                                alert.is_read ? 'opacity-60' : 'shadow-lg shadow-primary-500/5'
                                            }`}
                                            style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                            {!alert.is_read && <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: config.color }} />}
                                            
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform"
                                                 style={{ backgroundColor: config.bg, color: config.color }}>
                                                {config.icon}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                                                    <h4 className="text-lg font-black tracking-tight leading-tight" style={{ color: alert.is_read ? colors.textSecondary : colors.text }}>{translated.title}</h4>
                                                    <span className="text-[10px] font-black uppercase shrink-0" style={{ color: colors.textSecondary }}>{new Date(alert.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="font-medium text-sm md:text-base leading-relaxed mb-6" style={{ color: colors.textSecondary }}>{translated.message}</p>
                                                
                                                <div className="flex flex-wrap gap-3">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border"
                                                         style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.textSecondary }}>
                                                        {getChannelIcon(alert.channel)} {alert.channel === 'email' ? 'E-mail' : alert.channel === 'sms' ? 'Sms' : alert.channel === 'in_app' ? 'In-app' : alert.channel}
                                                    </div>
                                                    <div className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border"
                                                         style={{ backgroundColor: config.bg, color: config.color, borderColor: `${config.color}20` }}>
                                                        {config.label}
                                                    </div>
                                                    {alert.is_escalated && (
                                                        <div className="px-3 py-1.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                            {t('alerts.escalated')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="hidden md:flex items-center group-hover:translate-x-1 transition-all"
                                                 style={{ color: colors.textSecondary }}>
                                                <ChevronRight size={24}/>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-10 p-4 border rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-6"
                                     style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                    <button 
                                        disabled={page === 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        className="w-full sm:w-auto px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-30 transition-all border"
                                        style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.textSecondary }}
                                    >
                                        {t('common.previous')}
                                    </button>
                                    <span className="font-black text-xs uppercase tracking-tighter" style={{ color: colors.text }}>
                                        Page <span style={{ color: colors.primary }}>{page}</span> <span className="mx-2 opacity-20" style={{ color: colors.textSecondary }}>/</span> {totalPages}
                                    </span>
                                    <button 
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        className="w-full sm:w-auto px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-30 transition-all border"
                                        style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.textSecondary }}
                                    >
                                        {t('common.next')}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AlertsPage
