import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import ConfirmModal from '../components/ConfirmModal'
import { getPortalContainer } from '../utils/domSafety'
import { Users, UserPlus, Shield, Activity, Lock, Mail, Calendar, Edit3, UserMinus, Search, X, CheckCircle2, Eye, EyeOff, Camera, Loader2 } from 'lucide-react'
import { compressImage } from '../utils/imageUtils'

interface TeamMember {
    id: string
    email: string
    first_name: string
    last_name: string
    role: string
    school_id: string | null
    is_active: boolean
    mfa_enabled: boolean
    last_login: string | null
    created_at: string | null
    photo_url?: string
}

interface TeamStats {
    total: number
    active: number
    inactive: number
    mfa_enabled: number
    by_role: Record<string, number>
}

const TeamPage: React.FC = () => {
    const { t, i18n } = useTranslation()
    const { colors, mode } = useTheme()
    const { user } = useAuth()
    const [members, setMembers] = useState<TeamMember[]>([])
    const [stats, setStats] = useState<TeamStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [memberToDelete, setMemberToDelete] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState({
        email: '', password: '', first_name: '', last_name: '',
        role: 'TEACHER', school_id: '', is_active: true, photo_url: ''
    })

    const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
        GTE_ADMIN: { label: t('team.roles.GTE_ADMIN'), icon: <Shield size={18}/>, color: '#8b5cf6' },
        SCHOOL_DIRECTOR: { label: t('team.roles.TEACHER'), icon: <Shield size={18}/>, color: '#3b82f6' },
        SOCIAL_WORKER: { label: t('team.roles.SOCIAL_WORKER'), icon: <Users size={18}/>, color: '#f59e0b' },
        HEALTH_WORKER: { label: t('team.roles.HEALTH_WORKER'), icon: <Activity size={18}/>, color: '#10b981' },
        TEACHER: { label: t('team.roles.TEACHER'), icon: <Users size={18}/>, color: '#06b6d4' },
    }

    const fetchAll = async () => {
        setLoading(true)
        setError('')
        try {
            const [membersRes, statsRes] = await Promise.all([
                apiClient.get('/team/', { params: { role: roleFilter || undefined, search: search || undefined } }),
                apiClient.get('/team/stats')
            ])
            setMembers(Array.isArray(membersRes.data?.members) ? membersRes.data.members : [])
            setStats(statsRes.data)
        } catch (err: any) {
            console.error('Error fetching team data:', err)
            setError(err.response?.data?.detail || t('common.error'))
        } finally { setLoading(false) }
    }

    useEffect(() => { fetchAll() }, [roleFilter, search])

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            try {
                setUploadingPhoto(true)
                const compressed = await compressImage(file, 512, 0.7)
                setPhotoFile(compressed)
                const reader = new FileReader()
                reader.onload = (e) => setPhotoPreview(e.target?.result as string)
                reader.readAsDataURL(compressed)
            } catch (err) {
                setError("Erreur compression")
            } finally { setUploadingPhoto(false) }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError('')
        try {
            let memberId = ''
            if (editingMember) {
                const payload: any = { first_name: formData.first_name, last_name: formData.last_name, role: formData.role, is_active: formData.is_active }
                if (formData.password) payload.password = formData.password
                if (formData.school_id) payload.school_id = formData.school_id
                await apiClient.put(`/team/${editingMember.id}`, payload)
                memberId = editingMember.id
            } else {
                const res = await apiClient.post('/team/', formData)
                memberId = res.data.id
            }

            if (photoFile && memberId) {
                const uploadData = new FormData()
                uploadData.append('file', photoFile)
                await apiClient.post(`/uploads/photo/user/${memberId}`, uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
            }

            setSuccess(t('common.success'))
            setShowModal(false)
            fetchAll()
            setTimeout(() => setSuccess(''), 3000)
        } catch (err: any) {
            setError(err.response?.data?.detail || t('common.error'))
        } finally { setSubmitting(false) }
    }

    const handleDeactivate = (id: string) => {
        setMemberToDelete(id)
        setShowDeleteConfirm(true)
    }

    const confirmDeactivate = async () => {
        if (!memberToDelete) return
        try {
            await apiClient.delete(`/team/${memberToDelete}`)
            setSuccess(t('common.success'))
            fetchAll()
            setShowDeleteConfirm(false)
            setMemberToDelete(null)
            setTimeout(() => setSuccess(''), 3000)
        } catch (err: any) { setError(t('common.action_impossible')) }
    }

    const getRoleMeta = (role: string) => ROLE_META[role] || { label: role, icon: <Users size={18}/>, color: '#6b7280' }

    const inputClass = `w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-primary-500/10 transition-all text-slate-800 dark:text-white`
    const labelClass = `block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3`

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-0 pb-20">
            {/* Success Toast */}
            {success && (
                <div className="fixed top-6 right-6 z-[1200] bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-black animate-in fade-in slide-in-from-top-4">
                    ✓ {success}
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="fixed top-6 right-6 z-[1200] bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-black animate-in fade-in slide-in-from-top-4">
                    ✕ {error}
                </div>
            )}

            <div className="relative overflow-hidden p-6 md:p-10 lg:p-14 rounded-2xl md:rounded-[2.5rem] mb-6 md:mb-10 shadow-2xl shadow-primary-500/20"
                 style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)' }}>
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5">
                    <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-8 text-center sm:text-left">
                        <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                            <Users size={28} className="md:hidden" />
                            <Users size={40} className="hidden md:block" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-3xl md:text-5xl font-black text-white tracking-tighter mb-1 md:mb-2">{t('team.title')}</h1>
                            <p className="text-white/80 text-sm md:text-base font-bold">{t('team.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={() => { setEditingMember(null); setPhotoPreview(null); setPhotoFile(null); setFormData({ email: '', password: '', first_name: '', last_name: '', role: 'TEACHER', school_id: '', is_active: true, photo_url: '' }); setShowModal(true); }}
                        className="bg-white text-indigo-600 px-5 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2 md:gap-3 shrink-0">
                        <UserPlus size={16}/> {t('team.add_new')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-6 mb-8 md:mb-12">
                {[
                    { label: t('status.active'), value: stats?.active || 0, color: '#10b981', icon: <CheckCircle2 size={20}/> },
                    { label: t('common.mfa'), value: stats?.mfa_enabled || 0, color: '#8b5cf6', icon: <Lock size={20}/> },
                    { label: t('common.total'), value: stats?.total || 0, color: colors.primary, icon: <Users size={20}/> }
                ].map((s, i) => (
                    <div key={i} className="border rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div style={{ color: s.color }}>{s.icon}</div>
                            <div className="text-2xl md:text-4xl font-black" style={{ color: s.color }}>{s.value}</div>
                        </div>
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 leading-tight">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <div className="relative flex-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                    <input type="text" placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full border rounded-2xl py-4 pl-14 pr-4 text-sm font-medium outline-none focus:ring-4 focus:ring-primary-500/10 transition-all text-slate-800 dark:text-white" style={{ backgroundColor: colors.card, borderColor: colors.border }}/>
                </div>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                    className="border rounded-2xl px-6 py-4 font-bold text-sm outline-none cursor-pointer focus:ring-4 focus:ring-primary-500/10 transition-all text-slate-800 dark:text-white" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <option value="">{t('common.all')}</option>
                    {Object.entries(ROLE_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map(m => {
                    const meta = getRoleMeta(m.role)
                    return (
                        <div key={m.id} className="border p-8 rounded-[2rem] shadow-sm relative transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                            <div className="flex items-center gap-5 mb-8">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white overflow-hidden shadow-inner shrink-0"
                                     style={{ backgroundColor: `${meta.color}20`, color: meta.color }}>
                                    {m.photo_url ? (
                                        <img src={m.photo_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <>{m.first_name[0]}{m.last_name[0]}</>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black text-lg truncate">{m.first_name} {m.last_name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`w-2 h-2 rounded-full ${m.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{m.is_active ? t('status.active') : t('status.inactive')}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                                    <Mail size={16} className="shrink-0"/> <span className="truncate">{m.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-bold" style={{ color: meta.color }}>
                                    <Shield size={16} className="shrink-0"/> <span className="uppercase tracking-widest text-[10px]">{meta.label}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                    <Calendar size={16} className="shrink-0"/> {m.last_login ? new Date(m.last_login).toLocaleDateString() : '---'}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => { 
                                    setEditingMember(m); 
                                    setPhotoPreview(m.photo_url || null);
                                    setPhotoFile(null);
                                    setFormData({ email: m.email, password: '', first_name: m.first_name, last_name: m.last_name, role: m.role, school_id: m.school_id || '', is_active: m.is_active, photo_url: m.photo_url || '' }); 
                                    setShowModal(true); 
                                }}
                                    className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary-500 hover:text-white hover:border-primary-500 transition-all flex items-center justify-center gap-2">
                                    <Edit3 size={14}/> {t('common.edit')}
                                </button>
                                {m.email !== user?.email && (
                                    <button onClick={() => handleDeactivate(m.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                        <UserMinus size={18}/>
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Modal */}
            {showModal && createPortal(
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl border p-8 md:p-12" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors"><X size={24}/></button>
                        <h2 className="text-2xl font-black tracking-tighter mb-2">{editingMember ? t('common.edit') : t('team.add_new')}</h2>
                        <p className="text-slate-500 font-bold text-sm mb-10">{t('team.subtitle')}</p>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="flex justify-center">
                                <div onClick={() => !uploadingPhoto && fileInputRef.current?.click()} 
                                    className="w-32 h-32 rounded-[2rem] border-4 border-dashed border-slate-200 dark:border-white/5 flex items-center justify-center cursor-pointer overflow-hidden relative hover:border-primary-500 transition-colors bg-slate-50 dark:bg-slate-900">
                                    {uploadingPhoto ? (
                                        <Loader2 className="animate-spin text-primary-500" size={24}/>
                                    ) : photoPreview ? (
                                        <img src={photoPreview} className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="text-slate-400" size={24}/>
                                    )}
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} accept="image/*" className="hidden" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>{t('pupils.form.first_name')}</label>
                                    <input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className={inputClass} placeholder="Ex: Moussa" required />
                                </div>
                                <div>
                                    <label className={labelClass}>{t('pupils.form.last_name')}</label>
                                    <input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className={inputClass} placeholder="Ex: Diop" required />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Email</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={!!editingMember} className={inputClass} placeholder="email@exemple.com" required />
                            </div>
                            <div>
                                <label className={labelClass}>Mot de passe {editingMember && t('common.optional')}</label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className={`${inputClass} pr-14`} placeholder="••••••••" required={!editingMember} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                        {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>{t('common.role')}</label>
                                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className={inputClass}>
                                        {Object.entries(ROLE_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>{t('common.status')}</label>
                                    <select value={formData.is_active ? 'true' : 'false'} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'true' })} className={inputClass}>
                                        <option value="true">{t('status.active')}</option>
                                        <option value="false">{t('status.inactive')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button type="submit" disabled={submitting} className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/20 active:scale-95 disabled:opacity-50">
                                    {submitting ? t('common.loading') : t('common.save')}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                getPortalContainer()
            )}
            <ConfirmModal isOpen={showDeleteConfirm} title={t('common.confirm')} message={t('common.confirm_question')} confirmText={t('common.delete')} confirmColor="#ef4444" onConfirm={confirmDeactivate} onCancel={() => { setShowDeleteConfirm(false); setMemberToDelete(null); }} />
        </div>
    )
}

export default TeamPage
