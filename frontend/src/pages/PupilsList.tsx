import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import apiClient from '../api/client'
import { useTranslation } from 'react-i18next'
import { Search, Plus, UserCircle, ChevronLeft, ChevronRight, Filter, AlertTriangle, Users, Edit, Trash2, Calendar, X, Archive } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import { getPortalContainer } from '../utils/domSafety'

interface Pupil {
    id: string
    cnive_id: string
    first_name: string
    last_name: string
    birth_date: string
    gender: string
    status: string
    photo_url?: string
    academic_score?: number
}

const PupilsList: React.FC = () => {
    const { t } = useTranslation()
    const { colors } = useTheme()
    const [pupils, setPupils] = useState<Pupil[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    
    const [page, setPage] = useState(1)
    const [pageSize] = useState(24)
    const [searchValue, setSearchValue] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
    const [pupilToDelete, setPupilToDelete] = useState<string | null>(null)
    const [pupilToArchive, setPupilToArchive] = useState<string | null>(null)
    
    // Absence State
    const [showAbsenceModal, setShowAbsenceModal] = useState(false)
    const [selectedPupil, setSelectedPupil] = useState<Pupil | null>(null)
    const [absenceData, setAbsenceData] = useState({
        date: new Date().toISOString().split('T')[0],
        reason: 'sickness',
        duration_days: 1,
        is_justified: false,
        notes: ''
    })
    const [success, setSuccess] = useState('')

    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const urlStatus = searchParams.get('status')
    const urlSearch = searchParams.get('search')

    useEffect(() => {
        setSearchValue(urlSearch || '')
        setDebouncedSearch(urlSearch || '')
    }, [urlSearch])

    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchValue !== debouncedSearch) {
                setDebouncedSearch(searchValue)
                setPage(1)
            }
        }, 500)
        return () => clearTimeout(handler)
    }, [searchValue, debouncedSearch])

    const fetchPupils = useCallback(async () => {
        setLoading(true)
        try {
            const skip = (page - 1) * pageSize
            const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''
            const statusParam = urlStatus ? `&status=${encodeURIComponent(urlStatus)}` : ''
            
            const pupilsUrl = `/pupils?skip=${skip}&limit=${pageSize}${searchParam}${statusParam}`
            
            const countParams = []
            if (urlStatus) countParams.push(`status=${encodeURIComponent(urlStatus)}`)
            if (debouncedSearch) countParams.push(`search=${encodeURIComponent(debouncedSearch)}`)
            const countUrl = `/pupils/count${countParams.length > 0 ? '?' + countParams.join('&') : ''}`
            
            const [pupilsRes, countRes] = await Promise.all([
                apiClient.get(pupilsUrl),
                apiClient.get(countUrl)
            ])

            const pupilsData = Array.isArray(pupilsRes.data) ? pupilsRes.data : (pupilsRes.data?.pupils || [])
            const serverCount = countRes.data?.count ?? (debouncedSearch || urlStatus ? pupilsData.length : 0)
            
            setPupils(pupilsData)
            setTotalCount(serverCount)
            
        } catch (err) {
            console.error('Fetch error:', err)
            setPupils([])
            setTotalCount(0)
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, debouncedSearch, urlStatus])

    useEffect(() => {
        fetchPupils()
    }, [fetchPupils])

    const handleDelete = async () => {
        if (!pupilToDelete) return
        try {
            await apiClient.delete(`/pupils/${pupilToDelete}`)
            fetchPupils()
            setShowDeleteConfirm(false)
            setPupilToDelete(null)
            setSuccess(t('common.deleted') || 'Élève supprimé')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error(err)
        }
    }

    const handleArchive = async () => {
        if (!pupilToArchive) return
        try {
            await apiClient.post(`/pupils/${pupilToArchive}/anonymize`)
            fetchPupils()
            setShowArchiveConfirm(false)
            setPupilToArchive(null)
            setSuccess('Élève archivé et anonymisé (RGPD)')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error(err)
        }
    }

    const handleMarkAbsence = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPupil) return
        try {
            await apiClient.post('/absences/', {
                pupil_id: selectedPupil.id,
                ...absenceData,
                duration_days: parseInt(absenceData.duration_days.toString())
            })
            setShowAbsenceModal(false)
            setSuccess(t('absences.success'))
            setTimeout(() => setSuccess(''), 3000)
            setAbsenceData({
                date: new Date().toISOString().split('T')[0],
                reason: 'sickness',
                duration_days: 1,
                is_justified: false,
                notes: ''
            })
        } catch (err) {
            console.error('Error marking absence:', err)
        }
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

    const getInitials = (firstName: string = '', lastName: string = '') => {
        const f = firstName?.charAt(0) || ''
        const l = lastName?.charAt(0) || ''
        return (f + l).toUpperCase() || '??'
    }

    const getAvatarColor = (name: string = '') => {
        const colorsList = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
        const charCode = name?.charCodeAt(0) || 0
        return colorsList[charCode % colorsList.length]
    }

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-0">
            {success && (
                <div className="fixed top-6 right-6 z-[3000] bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-black animate-in fade-in slide-in-from-top-4">
                    ✓ {success}
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-2">{t('pupils.title')}</h1>
                    <p className="font-medium" style={{ color: colors.textSecondary }}>
                        {totalCount} {t('pupils.subtitle').split(' ')[1] || 'élèves enregistrés'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/pupils/new')}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary-500/20 active:scale-95"
                >
                    <Plus size={20} /> {t('pupils.add_new')}
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('pupils.search_placeholder')}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="w-full border rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none focus:ring-4 focus:ring-primary-500/10 transition-all" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                    />
                </div>
                <select 
                    value={urlStatus || ''} 
                    onChange={(e) => {
                        const val = e.target.value;
                        const params = new URLSearchParams();
                        if (val) params.set('status', val);
                        if (searchValue) params.set('search', searchValue);
                        navigate(params.toString() ? `/pupils?${params.toString()}` : '/pupils');
                        setPage(1);
                    }}
                    className="border rounded-2xl px-6 py-4 font-bold text-sm outline-none cursor-pointer focus:ring-4 focus:ring-primary-500/10 transition-all" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                >
                    <option value="">{t('common.all')}</option>
                    <option value="ACTIVE">{t('status.active')}</option>
                    <option value="TRANSFERRED">{t('status.transferred')}</option>
                    <option value="DROPOUT">{t('status.dropout')}</option>
                    <option value="CRITICAL">{t('vulnerability.critical')}</option>
                    <option value="HIGH">{t('vulnerability.high')}</option>
                </select>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="h-64 rounded-3xl animate-pulse" style={{ backgroundColor: colors.card }}></div>
                    ))}
                </div>
            ) : (
                <>
                    {pupils.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed rounded-[2.5rem]" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                            <Users size={64} className="mx-auto text-slate-300 mb-6" />
                            <h3 className="text-xl font-black mb-2">{t('common.no_data')}</h3>
                            <p className="font-medium" style={{ color: colors.textSecondary }}>{t('pupils.search_empty') || 'Aucun élève ne correspond à vos critères.'}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pupils.map((pupil) => (
                                <div
                                    key={pupil.id}
                                    onClick={() => navigate(`/pupils/${pupil.id}`)}
                                    className="group relative border p-6 rounded-[2rem] cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl active:scale-95" style={{ backgroundColor: colors.card, borderColor: colors.border }}
                                >
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedPupil(pupil); setShowAbsenceModal(true); }}
                                            className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 hover:scale-110 active:scale-90 transition-all"
                                            title="Marquer une absence"
                                        >
                                            <Calendar size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/pupils/edit/${pupil.id}`); }}
                                            className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/20 hover:scale-110 active:scale-90 transition-all"
                                            title="Modifier l'élève"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPupilToArchive(pupil.id); setShowArchiveConfirm(true); }}
                                            className="w-10 h-10 rounded-xl bg-slate-500 text-white flex items-center justify-center shadow-lg shadow-slate-500/20 hover:scale-110 active:scale-90 transition-all"
                                            title="Archiver (Anonymiser RGPD)"
                                        >
                                            <Archive size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPupilToDelete(pupil.id); setShowDeleteConfirm(true); }}
                                            className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20 hover:scale-110 active:scale-90 transition-all"
                                            title="Supprimer l'élève"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-5 mb-6">
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white overflow-hidden shadow-inner shrink-0" 
                                             style={{ backgroundColor: getAvatarColor(pupil.first_name) }}>
                                            {pupil.photo_url ? (
                                                <img src={pupil.photo_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                getInitials(pupil.first_name, pupil.last_name)
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-lg truncate pr-12">{pupil.first_name} {pupil.last_name}</h3>
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">ID: #{pupil.cnive_id.slice(-6)}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl p-4 flex justify-between items-center mb-6 border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: colors.textSecondary }}>{t('pupils.last_assessment') || 'Dernière éval.'}</p>
                                            <p className="text-xl font-black" style={{ color: colors.text }}>
                                                {pupil.academic_score != null ? pupil.academic_score.toFixed(1) : 'N/A'} <span className="text-xs opacity-30">/ 20</span>
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full border-4 border-primary-500/20 flex items-center justify-center">
                                            <div className="w-4 h-4 rounded-full bg-primary-500 animate-pulse" />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                            pupil.status === 'ACTIVE' 
                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                        }`}>
                                            {pupil.status === 'ACTIVE' 
                                                ? (pupil.gender === 'F' ? t('status.active_f') : t('status.active_m')) 
                                                : (pupil.status === 'TRANSFERRED' ? t('status.transferred') : (pupil.status === 'DROPOUT' ? t('status.dropout') : t('status.inactive')))}
                                        </span>
                                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-primary-500/10 text-primary-500 border border-primary-500/20">
                                            {pupil.gender === 'F' ? t('gender.female') : t('gender.male')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="mt-16 flex items-center justify-center gap-6">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p-1))} 
                                disabled={page === 1}
                                className="w-14 h-14 rounded-2xl border flex items-center justify-center transition-all hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed" style={{ backgroundColor: colors.card, borderColor: colors.border }}
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <span className="text-sm font-black" style={{ color: colors.text }}>
                                {page} <span className="mx-2" style={{ color: colors.textSecondary }}>/</span> {totalPages}
                            </span>
                            <button 
                                onClick={() => setPage(p => Math.min(totalPages, p+1))} 
                                disabled={page === totalPages}
                                className="w-14 h-14 rounded-2xl border flex items-center justify-center transition-all hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed" style={{ backgroundColor: colors.card, borderColor: colors.border }}
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    )}
                </>
            )}
            
            <ConfirmModal 
                isOpen={showDeleteConfirm}
                onCancel={() => { setShowDeleteConfirm(false); setPupilToDelete(null); }}
                onConfirm={handleDelete}
                title={t('common.delete') || 'Supprimer'}
                message={t('common.confirm_delete') || 'Êtes-vous sûr de vouloir supprimer cet élève ?'}
            />

            <ConfirmModal 
                isOpen={showArchiveConfirm}
                onCancel={() => { setShowArchiveConfirm(false); setPupilToArchive(null); }}
                onConfirm={handleArchive}
                title="Archiver l'élève"
                message="Êtes-vous sûr de vouloir archiver cet élève ? Ses données personnelles (nom, adresse, téléphone) seront effacées définitivement (RGPD)."
                confirmText="Archiver"
                confirmColor="#64748b"
                icon="📦"
            />

            {/* Absence Modal */}
            {showAbsenceModal && selectedPupil && createPortal(
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border flex flex-col max-h-[90vh]" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <div className="p-6 md:p-8 border-b" style={{ borderColor: colors.border }}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black tracking-tight" style={{ color: colors.text }}>{t('absences.mark')}</h2>
                                <button onClick={() => setShowAbsenceModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors" style={{ color: colors.textSecondary }}><X size={20}/></button>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: colors.bg }}>
                                <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white font-black text-xs" style={{ backgroundColor: getAvatarColor(selectedPupil.first_name) }}>
                                    {getInitials(selectedPupil.first_name, selectedPupil.last_name)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black truncate" style={{ color: colors.text }}>{selectedPupil.first_name} {selectedPupil.last_name}</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.textSecondary }}>ID: {selectedPupil.cnive_id}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                            <form id="absence-form" onSubmit={handleMarkAbsence} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: colors.textSecondary }}>{t('absences.date')}</label>
                                        <input type="date" required className="w-full px-5 py-3.5 border rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all" style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }} value={absenceData.date} onChange={e => setAbsenceData({...absenceData, date: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: colors.textSecondary }}>{t('absences.duration')}</label>
                                        <input type="number" min="1" required className="w-full px-5 py-3.5 border rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all" style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }} value={absenceData.duration_days} onChange={e => setAbsenceData({...absenceData, duration_days: parseInt(e.target.value)})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: colors.textSecondary }}>{t('absences.reason')}</label>
                                    <select className="w-full px-5 py-3.5 border rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all" style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }} value={absenceData.reason} onChange={e => setAbsenceData({...absenceData, reason: e.target.value})}>
                                        <option value="sickness">{t('absences.reasons.sickness')}</option>
                                        <option value="family">{t('absences.reasons.family')}</option>
                                        <option value="transport">{t('absences.reasons.transport')}</option>
                                        <option value="other">{t('absences.reasons.other')}</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: colors.bg }}>
                                    <input type="checkbox" id="justified" className="w-4 h-4 rounded border-2 border-primary-500 text-primary-600 focus:ring-primary-500/20" checked={absenceData.is_justified} onChange={e => setAbsenceData({...absenceData, is_justified: e.target.checked})} />
                                    <label htmlFor="justified" className="text-xs font-bold cursor-pointer" style={{ color: colors.text }}>{t('absences.justified')}</label>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: colors.textSecondary }}>{t('absences.notes')}</label>
                                    <textarea className="w-full px-5 py-3.5 border rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all min-h-[80px] resize-none" style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }} value={absenceData.notes} onChange={e => setAbsenceData({...absenceData, notes: e.target.value})} placeholder="..." />
                                </div>
                            </form>
                        </div>

                        <div className="p-6 md:p-8 border-t flex gap-3" style={{ borderColor: colors.border }}>
                            <button form="absence-form" type="submit" className="flex-1 bg-primary-600 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary-500/20 active:scale-95 transition-all">{t('common.save')}</button>
                            <button type="button" onClick={() => setShowAbsenceModal(false)} className="flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all border" style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.textSecondary }}>{t('common.cancel')}</button>
                        </div>
                    </div>
                </div>,
                getPortalContainer()
            )}
        </div>
    )
}

export default PupilsList
