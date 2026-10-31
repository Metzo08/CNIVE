import React, { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import { ClipboardList, Shield, Search, Filter, Calendar, Terminal, User, Globe, ArrowRight, Activity, ShieldCheck, ShieldAlert, Lock } from 'lucide-react'

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
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
            <div style={{
                background: 'linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 100%)',
                borderRadius: '32px', padding: '48px', marginBottom: '40px',
                position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(30, 41, 59, 0.2)'
            }}>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <Shield size={40} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>{t('audit.title')}</h1>
                            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', fontWeight: 500 }}>{t('audit.subtitle')}</p>
                        </div>
                    </div>
                    <select value={days} onChange={e => handleDaysChange(Number(e.target.value))}
                        style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: 'white', padding: '16px 24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.3)', fontWeight: 800, cursor: 'pointer', outline: 'none' }}>
                        <option value={7} style={{ color: '#1e293b' }}>{t('audit.last_7_days')}</option>
                        <option value={30} style={{ color: '#1e293b' }}>{t('audit.last_30_days')}</option>
                        <option value={90} style={{ color: '#1e293b' }}>{t('audit.last_90_days')}</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                {[
                    { label: t('audit.stats.total_events'), value: stats?.total_logs || 0, color: '#6366f1', icon: <Terminal/> },
                    { label: t('audit.stats.authorized_access'), value: stats?.logins || 0, color: '#10b981', icon: <ShieldCheck/> },
                    { label: t('audit.stats.security_failures'), value: stats?.failed_logins || 0, color: '#ef4444', icon: <ShieldAlert/> },
                    { label: t('audit.stats.data_access'), value: stats?.data_access || 0, color: '#f59e0b', icon: <Globe/> }
                ].map((s, i) => (
                    <div key={i} style={{ backgroundColor: colors.card, borderRadius: '24px', padding: '32px', border: `1px solid ${colors.border}10` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ color: s.color }}>{s.icon}</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: colors.textSecondary, letterSpacing: '1px' }}>{s.label}</p>
                    </div>
                ))}
            </div>

            <div style={{ position: 'relative', marginBottom: '32px' }}>
                <Search style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary }} size={20}/>
                <input type="text" placeholder={t('audit.filter_placeholder')} value={filter} onChange={e => setFilter(e.target.value)}
                    style={{ width: '100%', padding: '20px 24px 20px 64px', backgroundColor: colors.card, border: `1px solid ${colors.border}10`, borderRadius: '24px', color: colors.text, fontSize: '1.1rem', fontWeight: 600, outline: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}/>
            </div>

            <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '12px', border: `1px solid ${colors.border}10`, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '80px', textAlign: 'center', color: colors.textSecondary }}>{t('audit.loading')}</div>
                ) : error ? (
                    <div style={{ padding: '80px', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>
                        <ShieldAlert size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <br />
                        {error}
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: '80px', textAlign: 'center', color: colors.textSecondary }}>{t('audit.empty')}</div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {logs.map((log, i) => {
                                const config = getActionConfig(log.action)
                                const isCritical = log.action.includes('DELETE') || log.action.includes('FAILED')
                                const actionLabel = t(`audit.actions.${log.action}`) || log.action.replace(/_/g, ' ')
                                return (
                                    <div key={log.id} style={{
                                        display: 'grid', gridTemplateColumns: '300px 1fr 150px 150px', gap: '24px', alignItems: 'center',
                                        padding: '24px 32px', borderBottom: i < logs.length - 1 ? `1px solid ${colors.border}05` : 'none',
                                        transition: 'background 0.3s ease', cursor: 'default',
                                        borderLeft: isCritical ? `6px solid #ef4444` : 'none',
                                        backgroundColor: isCritical ? '#ef444405' : 'transparent'
                                    }} onMouseEnter={e => e.currentTarget.style.backgroundColor = isCritical ? '#ef444410' : colors.bg} onMouseLeave={e => e.currentTarget.style.backgroundColor = isCritical ? '#ef444405' : 'transparent'}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: config.bg, color: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {config.icon}
                                                </div>
                                                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: config.color }}>{actionLabel}</span>
                                            </div>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: config.color, paddingLeft: '44px' }}>{config.label}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>{log.user_email?.[0].toUpperCase() || '?'}</div>
                                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.user_email || t('audit.actions.SYSTEM')}</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: colors.textSecondary, fontWeight: 700, fontFamily: 'monospace' }}>{log.ip_address || '--'}</div>
                                        <div style={{ textAlign: 'right', fontSize: '0.85rem', color: colors.textSecondary, fontWeight: 600 }}>{new Date(log.timestamp).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'fr-FR')}</div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Pagination Controls */}
                        {Math.ceil(totalLogs / limit) > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', padding: '32px', borderTop: `1px solid ${colors.border}05` }}>
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
                                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
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
