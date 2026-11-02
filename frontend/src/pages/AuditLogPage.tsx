import React, { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import { ClipboardList, Shield, Search, Terminal, Globe, Activity, ShieldCheck, ShieldAlert, Lock } from 'lucide-react'

interface AuditLog {
    id: string
    user_id?: string
    user_email?: string
    action: string
    resource_type?: string
    resource_id?: string
    ip_address?: string
    user_agent?: string
    metadata?: string
    timestamp: string
}

const AuditLogPage: React.FC = () => {
    const { t, i18n } = useTranslation()
    const { colors } = useTheme()
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<any>(null)
    const [filter, setFilter] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [days, setDays] = useState(7)
    const [page, setPage] = useState(1)
    const [totalLogs, setTotalLogs] = useState(0)
    const limit = 25

    useEffect(() => {
        fetchLogs()
        fetchStats()
    }, [days, page])

    const fetchLogs = async () => {
        setLoading(true)
        setError(null)
        try {
            const skip = (page - 1) * limit
            const response = await apiClient.get(`/audit/`, {
                params: {
                    days,
                    skip,
                    limit
                }
            })
            const data = response.data
            setLogs(data.logs || [])
            setTotalLogs(data.total || 0)
        } catch (error: any) {
            console.error('Error fetching audit logs:', error)
            const detail = error.response?.data?.detail
            setError(detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : t('audit.loading_error'))
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        try {
            const response = await apiClient.get(`/audit/stats?days=${days}`)
            setStats(response.data)
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    const handleDaysChange = (newDays: number) => {
        setDays(newDays)
        setPage(1)
    }

    const getActionConfig = (action: string) => {
        const a = action.toUpperCase()
        if (a.includes('DELETE') || a.includes('FAILED')) {
            return { color: '#ef4444', icon: <ShieldAlert size={16}/>, bg: '#ef444415', label: t('audit.categories.critical') }
        }
        if (a.includes('LOGIN') || a.includes('MFA')) {
            return { color: '#10b981', icon: <Lock size={16}/>, bg: '#10b98115', label: t('audit.categories.access') }
        }
        if (a.includes('EDIT') || a.includes('CREATE')) {
            return { color: '#f59e0b', icon: <Activity size={16}/>, bg: '#f59e0b15', label: t('audit.categories.modification') }
        }
        if (a.includes('VIEW')) {
            return { color: '#3b82f6', icon: <Globe size={16}/>, bg: '#3b82f615', label: t('audit.categories.consultation') }
        }
        return { color: '#6366f1', icon: <ClipboardList size={16}/>, bg: '#6366f115', label: t('audit.categories.system') }
    }

    const filteredLogs = filter
        ? logs.filter(l => l.action.toLowerCase().includes(filter.toLowerCase()) || l.user_email?.toLowerCase().includes(filter.toLowerCase()))
        : logs

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <div className="rounded-3xl md:rounded-[32px] p-6 sm:p-8 md:p-12 mb-8 md:mb-10 relative overflow-hidden shadow-xl"
                 style={{
                     background: 'linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 100%)',
                     boxShadow: '0 20px 40px rgba(30, 41, 59, 0.2)'
                 }}>
                <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-6">
                    <div className="flex items-center gap-4 md:gap-8">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                            <Shield size={36} />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">{t('audit.title')}</h1>
                            <p className="text-white/90 text-sm sm:text-base md:text-lg font-medium">{t('audit.subtitle')}</p>
                        </div>
                    </div>
                    <select value={days} onChange={e => handleDaysChange(Number(e.target.value))}
                        className="px-5 py-3.5 rounded-2xl font-extrabold text-sm cursor-pointer outline-none w-full md:w-auto"
                        style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                        <option value={7} style={{ color: '#1e293b' }}>{t('audit.last_7_days')}</option>
                        <option value={30} style={{ color: '#1e293b' }}>{t('audit.last_30_days')}</option>
                        <option value={90} style={{ color: '#1e293b' }}>{t('audit.last_90_days')}</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
                {[
                    { label: t('audit.stats.total_events'), value: stats?.total_logs || 0, color: '#6366f1', icon: <Terminal/> },
                    { label: t('audit.stats.authorized_access'), value: stats?.logins || 0, color: '#10b981', icon: <ShieldCheck/> },
                    { label: t('audit.stats.security_failures'), value: stats?.failed_logins || 0, color: '#ef4444', icon: <ShieldAlert/> },
                    { label: t('audit.stats.data_access'), value: stats?.data_access || 0, color: '#f59e0b', icon: <Globe/> }
                ].map((s, i) => (
                    <div key={i} className="rounded-3xl p-5 md:p-8 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                        <div className="flex justify-between mb-3 md:mb-4">
                            <div style={{ color: s.color }}>{s.icon}</div>
                            <div className="text-2xl md:text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
                        </div>
                        <p className="m-0 text-[10px] md:text-xs font-extrabold tracking-wider" style={{ color: colors.textSecondary }}>{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="relative mb-6 md:mb-8">
                <Search style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary }} size={20}/>
                <input type="text" placeholder={t('audit.filter_placeholder')} value={filter} onChange={e => setFilter(e.target.value)}
                    className="w-full py-4 pr-6 pl-14 rounded-2xl md:rounded-3xl font-semibold text-sm md:text-base outline-none shadow-sm border"
                    style={{ backgroundColor: colors.card, borderColor: `${colors.border}10`, color: colors.text }}/>
            </div>

            <div className="rounded-3xl md:rounded-[32px] p-2 sm:p-3 border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                {loading ? (
                    <div className="p-16 text-center" style={{ color: colors.textSecondary }}>{t('audit.loading')}</div>
                ) : error ? (
                    <div className="p-16 text-center text-red-500 font-semibold">
                        <ShieldAlert size={48} className="mx-auto mb-4 opacity-50" />
                        {error}
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-16 text-center" style={{ color: colors.textSecondary }}>{t('audit.empty')}</div>
                ) : (
                    <>
                        <div className="flex flex-col">
                            {filteredLogs.map((log, i) => {
                                const config = getActionConfig(log.action)
                                const isCritical = log.action.includes('DELETE') || log.action.includes('FAILED')
                                const actionLabel = t(`audit.actions.${log.action}`) || log.action.replace(/_/g, ' ')
                                return (
                                    <div key={log.id}
                                         className="grid grid-cols-1 md:grid-cols-[260px_1fr_130px_120px] gap-3 md:gap-6 items-start md:items-center p-4 sm:p-6 transition-colors"
                                         style={{
                                             borderBottom: i < filteredLogs.length - 1 ? `1px solid ${colors.border}08` : 'none',
                                             borderLeft: isCritical ? `6px solid #ef4444` : 'none',
                                             backgroundColor: isCritical ? '#ef444405' : 'transparent'
                                         }}
                                         onMouseEnter={e => e.currentTarget.style.backgroundColor = isCritical ? '#ef444410' : colors.bg}
                                         onMouseLeave={e => e.currentTarget.style.backgroundColor = isCritical ? '#ef444405' : 'transparent'}>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: config.bg, color: config.color }}>
                                                    {config.icon}
                                                </div>
                                                <span className="font-extrabold text-sm" style={{ color: config.color }}>{actionLabel}</span>
                                            </div>
                                            <span className="text-[10px] font-extrabold pl-11" style={{ color: config.color }}>{config.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0" style={{ backgroundColor: colors.bg }}>
                                                {log.user_email?.[0].toUpperCase() || '?'}
                                            </div>
                                            <span className="font-semibold text-sm truncate">{log.user_email || t('audit.actions.SYSTEM')}</span>
                                        </div>
                                        <div className="flex md:block items-center justify-between w-full text-xs font-bold font-mono" style={{ color: colors.textSecondary }}>
                                            <span>{log.ip_address || '--'}</span>
                                            <span className="md:hidden font-sans">{new Date(log.timestamp).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'fr-FR')}</span>
                                        </div>
                                        <div className="hidden md:block text-right text-xs font-semibold" style={{ color: colors.textSecondary }}>
                                            {new Date(log.timestamp).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'fr-FR')}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Pagination Controls */}
                        {Math.ceil(totalLogs / limit) > 1 && (
                            <div className="flex flex-wrap justify-center items-center gap-4 p-6 border-t" style={{ borderColor: `${colors.border}08` }}>
                                <button 
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    style={{
                                        padding: '10px 20px', borderRadius: '12px', border: 'none',
                                        backgroundColor: page === 1 ? 'transparent' : colors.primary + '20',
                                        color: page === 1 ? colors.textSecondary : colors.primary,
                                        fontWeight: 700, cursor: page === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {t('common.previous')}
                                </button>
                                <span className="font-extrabold text-sm">
                                    {t('common.page')} {page} {t('common.of')} {Math.ceil(totalLogs / limit)}
                                </span>
                                <button 
                                    disabled={page === Math.ceil(totalLogs / limit)}
                                    onClick={() => setPage(p => Math.min(Math.ceil(totalLogs / limit), p + 1))}
                                    style={{
                                        padding: '10px 20px', borderRadius: '12px', border: 'none',
                                        backgroundColor: page === Math.ceil(totalLogs / limit) ? 'transparent' : colors.primary + '20',
                                        color: page === Math.ceil(totalLogs / limit) ? colors.textSecondary : colors.primary,
                                        fontWeight: 700, cursor: page === Math.ceil(totalLogs / limit) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {t('common.next')}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default AuditLogPage
