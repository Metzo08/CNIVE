import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../context/ThemeContext'
import ConfirmModal from '../components/ConfirmModal'
import apiClient from '../api/client'
import { useTranslation } from 'react-i18next'
import { getPortalContainer } from '../utils/domSafety'
import { 
    ChevronLeft, ChevronRight, X, AlertTriangle, Plus, 
    Activity, History, Clock, CheckCircle2, User, 
    Building, Calendar, Info, Loader2, Trash2 
} from 'lucide-react'

interface Pupil {
    id: string
    cnive_id: string
    first_name: string
    last_name: string
}

interface Intervention {
    id: string
    pupil_id: string
    pupil_name: string
    intervention_type: string
    title: string
    description?: string
    status: string
    priority: string
    scheduled_date?: string
    assigned_to?: string
    partner_organization?: string
    created_at: string
    updated_at?: string
}

const InterventionsPage: React.FC = () => {
    const { t } = useTranslation()
    const { colors, mode } = useTheme()
    const [interventions, setInterventions] = useState<Intervention[]>([])
    const [pupils, setPupils] = useState<Pupil[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [filter, setFilter] = useState('all')
    const [stats, setStats] = useState({ total: 0, planned: 0, in_progress: 0, completed: 0, urgent_pending: 0 })
    const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null)
    const [logs, setLogs] = useState<any[]>([])
    const [newNote, setNewNote] = useState('')
    const [success, setSuccess] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [availableUsers, setAvailableUsers] = useState<any[]>([])

    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    const fetchStats = async () => {
        try {
            const response = await apiClient.get('/interventions/stats')
            const data = response.data
            setStats({
                total: data.total || 0,
                planned: data.by_status?.planned || data.by_status?.pending || 0,
                in_progress: data.by_status?.in_progress || 0,
                completed: data.by_status?.completed || 0,
                urgent_pending: data.urgent_pending || 0
            })
        } catch (error) {}
    }

    const fetchInterventions = useCallback(async () => {
        setLoading(true)
        try {
            const skip = (page - 1) * pageSize
            const statusParam = filter !== 'all' && filter !== 'urgent' ? `&status=${filter}` : ''
            const priorityParam = filter === 'urgent' ? '&priority=urgent' : ''
            
            const response = await apiClient.get(`/interventions/?skip=${skip}&limit=${pageSize}${statusParam}${priorityParam}`)
            const data = Array.isArray(response.data) ? response.data : (response.data?.interventions || [])
            setInterventions(data)
            
            // Re-fetch stats to ensure they are up to date and we can use them for total count
            const statsRes = await apiClient.get('/interventions/stats')
            const st = statsRes.data
            setStats({
                total: st.total || 0,
                planned: st.by_status?.planned || st.by_status?.pending || 0,
                in_progress: st.by_status?.in_progress || 0,
                completed: st.by_status?.completed || 0,
                urgent_pending: st.urgent_pending || 0
            })
            
            let currentTotal = st.total || 0;
            if (filter === 'planned') currentTotal = st.by_status?.planned || st.by_status?.pending || 0
            if (filter === 'in_progress') currentTotal = st.by_status?.in_progress || 0
            if (filter === 'completed') currentTotal = st.by_status?.completed || 0
            if (filter === 'urgent') currentTotal = st.urgent_pending || 0
            
            setTotalCount(currentTotal)
            
        } catch (error) {
            console.error('Error fetching interventions:', error)
        } finally {
            setLoading(false)
        }
    }, [page, filter, pageSize])

    const fetchPupils = async () => {
        try {
            const response = await apiClient.get('/pupils/', { params: { limit: 1000 } })
            setPupils(Array.isArray(response.data) ? response.data : (response.data?.pupils || []))
        } catch (error) {}
    }

    const fetchUsers = async () => {
        try {
            const response = await apiClient.get('/team/')
            setAvailableUsers(Array.isArray(response.data?.members) ? response.data.members : [])
        } catch (error) {}
    }

    useEffect(() => {
        fetchInterventions()
    }, [fetchInterventions])

    useEffect(() => {
        fetchPupils()
        fetchStats()
        fetchUsers()
    }, [])

    const [formData, setFormData] = useState({
        pupil_id: '',
        intervention_type: 'health',
        title: '',
        description: '',
        priority: 'medium',
        scheduled_date: new Date().toISOString().split('T')[0],
        partner_organization: '',
        assigned_to: ''
    })

    const resetForm = () => {
        setFormData({
            pupil_id: '', intervention_type: 'health', title: '', description: '',
            priority: 'medium', scheduled_date: new Date().toISOString().split('T')[0],
            partner_organization: '', assigned_to: ''
        })
        setEditingId(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            if (editingId) {
                await apiClient.patch(`/interventions/${editingId}`, formData)
            } else {
                await apiClient.post('/interventions/', formData)
            }
            setSuccess(t('common.success'))
            setShowForm(false)
            fetchInterventions()
            fetchStats()
            resetForm()
            setTimeout(() => setSuccess(''), 3000)
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleUpdateStatus = async (newStatus: string) => {
        if (!selectedIntervention) return
        try {
            await apiClient.patch(`/interventions/${selectedIntervention.id}`, { status: newStatus })
            setSuccess(t('common.success'))
            fetchInterventions()
            fetchStats()
            setSelectedIntervention({ ...selectedIntervention, status: newStatus })
            setTimeout(() => setSuccess(''), 3000)
        } catch (error) {}
    }

    const handleDelete = async (id?: string) => {
        const idToDelete = id || selectedIntervention?.id;
        if (!idToDelete) return
        setShowDeleteConfirm(false)
        try {
            await apiClient.delete(`/interventions/${idToDelete}`)
            setSuccess(t('common.success'))
            setSelectedIntervention(null)
            fetchInterventions()
            fetchStats()
            setTimeout(() => setSuccess(''), 3000)
        } catch (error) {}
    }

    const fetchLogs = async (id: string) => {
        try {
            const response = await apiClient.get(`/interventions/${id}/logs`)
            setLogs(Array.isArray(response.data) ? response.data : [])
        } catch (error) {}
    }

    const handleAddNote = async () => {
        if (!selectedIntervention || !newNote.trim()) return
        try {
            await apiClient.post(`/interventions/${selectedIntervention.id}/log`, { action: 'note', notes: newNote })
            setNewNote('')
            fetchLogs(selectedIntervention.id)
        } catch (error) {}
    }

    const handleEdit = () => {
        if (!selectedIntervention) return
        setEditingId(selectedIntervention.id)
        setFormData({
            pupil_id: selectedIntervention.pupil_id,
            intervention_type: selectedIntervention.intervention_type,
            title: selectedIntervention.title,
            description: selectedIntervention.description || '',
            priority: selectedIntervention.priority,
            scheduled_date: selectedIntervention.scheduled_date || new Date().toISOString().split('T')[0],
            partner_organization: selectedIntervention.partner_organization || '',
            assigned_to: selectedIntervention.assigned_to || ''
        })
        setSelectedIntervention(null)
        setShowForm(true)
    }

    const openDetail = (intervention: Intervention) => {
        setSelectedIntervention(intervention)
        fetchLogs(intervention.id)
    }

    const getTypeIcon = (type: string) => {
        const t = type?.toLowerCase()
        const icons: Record<string, string> = {
            'health': '🏥', 'social': '👨‍👩‍👧', 'education': '📚', 'educational': '📚',
            'psychological': '🧠', 'economic': '💰', 'financial': '💰'
        }
        return icons[t] || '📋'
    }

    const getPriorityColors = (priority: string) => {
        const p = priority?.toLowerCase()
        const config: Record<string, any> = { 
            'urgent': { text: '#ef4444', bg: '#ef444415' }, 
            'high': { text: '#f97316', bg: '#f9731615' }, 
            'medium': { text: '#f59e0b', bg: '#f59e0b15' }, 
            'low': { text: '#10b981', bg: '#10b98115' } 
        }
        return config[p] || { text: '#64748b', bg: '#64748b15' }
    }

    const getStatusColors = (status: string) => {
        const s = status?.toLowerCase()
        const config: Record<string, any> = { 
            'completed': { text: '#10b981', bg: '#10b98115' }, 
            'in_progress': { text: '#3b82f6', bg: '#3b82f615' }, 
            'cancelled': { text: '#ef4444', bg: '#ef444415' }, 
            'planned': { text: '#f59e0b', bg: '#f59e0b15' } 
        }
        return config[s] || { text: '#64748b', bg: '#64748b15' }
    }

    const inputClass = `w-full px-4 py-3 rounded-xl border transition-all outline-none focus:ring-4 focus:ring-primary-500/10 ${
        mode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
    }`

    const labelClass = `block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2`

    const formatLabel = (text: string) => {
        if (!text) return ""
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    }

    const totalPages = Math.ceil(totalCount / pageSize)

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-0 pb-20">
            {/* Success Toast */}
            {success && (
                <div className="fixed top-6 right-6 z-[1200] bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-black animate-in fade-in slide-in-from-top-4">
                    ✓ {success}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 md:mb-12">
                <div>
                    <h1 className="text-2xl md:text-3xl lg:text-5xl font-black tracking-tighter mb-2">{formatLabel(t('interventions.title'))}</h1>
                    <p className="text-slate-500 font-medium text-sm md:text-base">{formatLabel(t('interventions.subtitle'))}</p>
                </div>
                <button 
                    onClick={() => { setShowForm(true); resetForm(); }}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all shadow-xl shadow-primary-500/20 active:scale-95 flex items-center justify-center gap-2 md:gap-3 touch-target"
                >
                    <Plus size={16}/> {formatLabel(t('interventions.add_new'))}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4 mb-8 md:mb-12">
                {[
                    { value: stats.total, label: t('interventions.total'), color: colors.primary, filterId: 'all' },
                    { value: stats.planned, label: t('interventions.planned'), color: '#f59e0b', filterId: 'planned' },
                    { value: stats.in_progress, label: t('interventions.in_progress'), color: '#3b82f6', filterId: 'in_progress' },
                    { value: stats.completed, label: t('interventions.completed'), color: '#10b981', filterId: 'completed' },
                    { value: stats.urgent_pending, label: t('interventions.urgent'), color: '#ef4444', filterId: 'urgent' }
                ].map((stat, i) => (
                    <div key={i} onClick={() => { setFilter(stat.filterId); setPage(1); }}
                        className="p-3 md:p-6 rounded-2xl md:rounded-3xl cursor-pointer transition-all duration-300 border-2 text-center flex flex-col justify-center min-h-[90px] md:min-h-[140px] hover:shadow-xl touch-target"
                        style={
                            filter === stat.filterId 
                            ? { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: '2px', boxShadow: `0 10px 15px -3px ${colors.primary}15` } 
                            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: '2px' }
                        }
                    >
                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-tight">{formatLabel(stat.label)}</p>
                        <p className="text-2xl md:text-4xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters Bar */}
            <div className="flex gap-2 mb-10 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                {[
                    { id: 'all', label: t('interventions.total') }, { id: 'planned', label: t('interventions.planned') },
                    { id: 'in_progress', label: t('interventions.in_progress') }, { id: 'completed', label: t('interventions.completed') },
                    { id: 'urgent', label: t('interventions.urgent') }
                ].map(f => (
                    <button 
                        key={f.id} 
                        onClick={() => { setFilter(f.id); setPage(1); }} 
                        className="whitespace-nowrap px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                        style={
                            filter === f.id 
                            ? { backgroundColor: colors.primary, color: '#ffffff', boxShadow: `0 10px 15px -3px ${colors.primary}40` } 
                            : { backgroundColor: colors.card, borderColor: colors.border, color: colors.textSecondary, borderWidth: '1px' }
                        }
                    >
                        {formatLabel(f.label)}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    [1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded-3xl animate-pulse"></div>)
                ) : interventions.length === 0 ? (
                    <div className="py-20 text-center bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem]">
                        <p className="text-slate-500 font-bold">{formatLabel(t('interventions.empty'))}</p>
                    </div>
                ) : (
                    interventions.map((intervention) => {
                        const priorityColors = getPriorityColors(intervention.priority)
                        const statusColors = getStatusColors(intervention.status)
                        return (
                            <div 
                                key={intervention.id} 
                                onClick={() => openDetail(intervention)}
                                className="border p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-[2rem] flex items-center gap-3 md:gap-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-500/5 group"
                                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                            >
                                <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl lg:text-3xl shadow-inner shrink-0 group-hover:scale-110 transition-transform"
                                     style={{ backgroundColor: statusColors.bg }}>
                                    {getTypeIcon((intervention as any).type || intervention.intervention_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-base md:text-lg lg:text-xl mb-1 truncate" style={{ color: colors.text }}>
                                        {intervention.title}
                                    </h3>
                                    <p className="text-slate-500 font-bold text-xs md:text-sm truncate">
                                        {intervention.pupil_name} <span className="hidden sm:inline mx-1 text-slate-300">•</span> <span className="hidden sm:inline text-primary-500 uppercase text-[10px] tracking-widest">{t(`interventions.types.${((intervention as any).type || intervention.intervention_type)?.toLowerCase()}`)}</span>
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 shrink-0">
                                    <span className="hidden sm:inline px-3 md:px-4 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border"
                                          style={{ backgroundColor: priorityColors.bg, color: priorityColors.text, borderColor: `${priorityColors.text}20` }}>
                                        {t(`interventions.priorities.${intervention.priority?.toLowerCase()}`)}
                                    </span>
                                    <span className="px-3 md:px-4 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border"
                                          style={{ backgroundColor: statusColors.bg, color: statusColors.text, borderColor: `${statusColors.text}20` }}>
                                        {t(`interventions.status.${intervention.status?.toLowerCase()}`)}
                                    </span>
                                    <div className="hidden md:flex w-10 h-10 rounded-xl items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-all border"
                                         style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-2">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                        disabled={page === 1}
                        className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 flex items-center justify-center transition-all hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2).map((p, i, arr) => {
                        if (i > 0 && p - arr[i - 1] > 1) {
                            return <span key={`ellipsis-${p}`} className="px-2 text-slate-400 font-bold">...</span>;
                        }
                        return (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`w-12 h-12 rounded-2xl font-black text-sm transition-all shadow-sm ${
                                    page === p 
                                    ? 'bg-primary-600 text-white border-primary-600 shadow-primary-500/20 scale-110' 
                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                {p}
                            </button>
                        );
                    })}

                    <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                        disabled={page === totalPages}
                        className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 flex items-center justify-center transition-all hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* Form Modal */}
            {showForm && createPortal(
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setShowForm(false); resetForm(); }} />
                    <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl border"
                         style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <div className="sticky top-0 z-10 px-8 py-6 bg-primary-600 text-white flex items-center justify-between">
                            <h2 className="text-xl font-black uppercase tracking-tighter">
                                {editingId ? formatLabel(t('interventions.form_edit')) : formatLabel(t('interventions.form_new'))}
                            </h2>
                            <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                <X size={24}/>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={labelClass}>{formatLabel(t('interventions.pupil'))} *</label>
                                    <select value={formData.pupil_id} onChange={(e) => setFormData({ ...formData, pupil_id: e.target.value })} className={inputClass} required>
                                        <option value="">{formatLabel(t('vulnerability.choose_pupil'))}</option>
                                        {pupils.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>{formatLabel(t('interventions.type'))} *</label>
                                    <select value={formData.intervention_type} onChange={(e) => setFormData({ ...formData, intervention_type: e.target.value })} className={inputClass}>
                                        <option value="health">{formatLabel(t('interventions.types.health'))}</option>
                                        <option value="social">{formatLabel(t('interventions.types.social'))}</option>
                                        <option value="education">{formatLabel(t('interventions.types.education'))}</option>
                                        <option value="psychological">{formatLabel(t('interventions.types.psychological'))}</option>
                                        <option value="economic">{formatLabel(t('interventions.types.economic'))}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>{formatLabel(t('interventions.priority'))}</label>
                                    <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className={inputClass}>
                                        <option value="low">{formatLabel(t('interventions.priorities.low'))}</option>
                                        <option value="medium">{formatLabel(t('interventions.priorities.medium'))}</option>
                                        <option value="high">{formatLabel(t('interventions.priorities.high'))}</option>
                                        <option value="urgent">{formatLabel(t('interventions.priorities.urgent'))}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelClass}>{formatLabel(t('interventions.form.title'))} *</label>
                                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputClass} placeholder={formatLabel(t('interventions.form.title_placeholder'))} required />
                                </div>
                                <div>
                                    <label className={labelClass}>{formatLabel(t('interventions.scheduled_date'))}</label>
                                    <input type="date" value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>{formatLabel(t('interventions.assigned_to'))}</label>
                                    <select value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })} className={inputClass}>
                                        <option value="">{formatLabel(t('interventions.detail.not_assigned'))}</option>
                                        {availableUsers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>{formatLabel(t('interventions.description'))}</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputClass} min-h-[120px]`} placeholder={formatLabel(t('interventions.form.description_placeholder'))} />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button type="submit" disabled={submitting} className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/20 active:scale-95 disabled:opacity-50">
                                    {submitting ? <Loader2 className="animate-spin mx-auto" size={20}/> : (editingId ? formatLabel(t('interventions.save_changes')) : formatLabel(t('interventions.save')))}
                                </button>
                                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">
                                    {formatLabel(t('interventions.cancel'))}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                getPortalContainer()
            )}

            {/* Detail Modal */}
            {selectedIntervention && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" onClick={() => setSelectedIntervention(null)} />
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl border p-6 md:p-12"
                         style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <button onClick={() => setSelectedIntervention(null)} className="absolute top-6 right-6 p-3 rounded-2xl hover:scale-110 transition-transform border"
                                style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                            <X size={24}/>
                        </button>

                        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center mb-12">
                            <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner shrink-0"
                                 style={{ backgroundColor: getStatusColors(selectedIntervention.status).bg }}>
                                {getTypeIcon(selectedIntervention.intervention_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-2xl md:text-4xl font-black tracking-tighter mb-3 leading-tight">
                                    {selectedIntervention.title}
                                </h2>
                                <div className="flex flex-wrap items-center gap-4 text-slate-500 font-bold text-sm">
                                    <span className="text-primary-500 uppercase tracking-widest text-[10px] bg-primary-500/10 px-3 py-1 rounded-lg">{formatLabel(t(`interventions.types.${selectedIntervention.intervention_type?.toLowerCase()}`))}</span>
                                    <span className="hidden sm:inline opacity-30">•</span>
                                    <span className="flex items-center gap-2"><Calendar size={14}/> {new Date(selectedIntervention.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                            <div className="p-6 rounded-3xl border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                <p className={labelClass}>{formatLabel(t('interventions.pupil'))}</p>
                                <p className="text-xl font-black">{selectedIntervention.pupil_name}</p>
                            </div>
                            <div className="p-6 rounded-3xl border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                <p className={labelClass}>{formatLabel(t('interventions.assigned_to'))}</p>
                                <p className="text-xl font-black">{selectedIntervention.assigned_to || formatLabel(t('interventions.detail.not_assigned'))}</p>
                            </div>
                        </div>

                        <div className="mb-12">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{formatLabel(t('interventions.description'))}</h3>
                            <div className="p-8 rounded-[2rem] border leading-relaxed font-medium"
                                 style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}>
                                {selectedIntervention.description || t('interventions.detail.no_description')}
                            </div>
                        </div>

                        <div className="mb-12">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                <History size={14}/> {formatLabel(t('interventions.detail.history'))}
                            </h3>
                            <div className="space-y-4 mb-8">
                                {logs.map((log) => (
                                    <div key={log.id} className="p-6 rounded-2xl border-l-4 border-primary-500 border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-black uppercase text-primary-500 tracking-tighter">{formatLabel(t(`interventions.logs.${log.action_type.toLowerCase()}`) || log.action_type)}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm font-bold leading-relaxed">{log.details}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input 
                                    type="text" 
                                    value={newNote} 
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder={formatLabel(t('interventions.detail.note_placeholder'))}
                                    className="flex-1 px-5 py-4 border rounded-2xl outline-none focus:border-primary-500 transition-all font-medium text-sm"
                                    style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                                />
                                <button onClick={handleAddNote} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-primary-500/20 shrink-0">
                                    {formatLabel(t('interventions.detail.publish'))}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-100 dark:border-white/5">
                            <button onClick={() => handleUpdateStatus('completed')} className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                                <CheckCircle2 size={18}/> {formatLabel(t('interventions.status.completed'))}
                            </button>
                            <button onClick={handleEdit} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">
                                {formatLabel(t('interventions.actions.edit'))}
                            </button>
                            <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 bg-red-500/10 text-red-500 border border-red-500/10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-500 hover:text-white transition-all">
                                {formatLabel(t('interventions.actions.delete'))}
                            </button>
                        </div>
                    </div>
                </div>,
                getPortalContainer()
            )}

            <ConfirmModal
                isOpen={showDeleteConfirm}
                title={formatLabel(t('interventions.actions.confirm_delete_title'))}
                message={formatLabel(t('interventions.actions.confirm_delete_msg'))}
                confirmText={formatLabel(t('interventions.actions.delete'))}
                cancelText={formatLabel(t('common.cancel'))}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    )
}

export default InterventionsPage
