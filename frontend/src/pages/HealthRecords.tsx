import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import ConfirmModal from '../components/ConfirmModal'
import { getPortalContainer } from '../utils/domSafety'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    X, Shield, Activity, Syringe, User, ChevronRight, 
    FileText, Heart, Calendar, MapPin, AlertCircle, 
    Archive, Save, Edit3, Trash2, CheckCircle2, 
    Clock, Plus, Search, Stethoscope, Building,
    ChevronLeft
} from 'lucide-react'

const HealthRecords: React.FC = () => {
    const { t } = useTranslation()
    const { colors, mode } = useTheme()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    
    const [activeTab, setActiveTab] = useState('overview')
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [page, setPage] = useState(1)
    const limit = 24

    const [showRecordModal, setShowRecordModal] = useState(false)
    const [showVaccinationModal, setShowVaccinationModal] = useState(false)
    const [showConsultationModal, setShowConsultationModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [itemToDelete, setMemberToDelete] = useState<{id: string, type: 'record' | 'vaccination' | 'consultation'} | null>(null)
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
    const [pupilToArchive, setPupilToArchive] = useState<string | null>(null)
    const [editingItem, setEditingItem] = useState<any>(null)
    
    const [formData, setFormData] = useState<any>({
        pupil_id: '',
        blood_group: '',
        allergies: '',
        chronic_conditions: '',
        cmu_status: 'not_enrolled',
        health_facility: '',
        vaccine_name: '',
        dose_number: 1,
        administered_date: new Date().toISOString().split('T')[0],
        consultation_type: '',
        consultation_date: new Date().toISOString().split('T')[0],
        diagnosis: '',
        treatment: '',
        practitioner: ''
    })

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== debouncedSearch) {
                setDebouncedSearch(searchQuery)
                setPage(1)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery, debouncedSearch])

    // Queries
    const { data: statsData } = useQuery({
        queryKey: ['healthStats'],
        queryFn: async () => {
            const res = await apiClient.get('/health-records/stats')
            return res.data
        }
    })

    // Only fetch pupils for the modal dropdown (limit to avoid performance issues, ideally this would be a searchable select)
    const { data: pupilsData } = useQuery({
        queryKey: ['pupilsMini'],
        queryFn: async () => {
            const res = await apiClient.get('/pupils/', { params: { limit: 200 } })
            return Array.isArray(res.data) ? res.data : (res.data?.pupils || [])
        }
    })

    // Main data fetching based on active tab
    const { data: currentData, isLoading, refetch } = useQuery({
        queryKey: ['healthData', activeTab, page, debouncedSearch],
        queryFn: async () => {
            const skip = (page - 1) * limit
            // If searching, we fetch a large batch to filter client-side since the backend doesn't support text search on these nested models yet
            const fetchLimit = debouncedSearch ? 1000 : limit
            const fetchSkip = debouncedSearch ? 0 : skip

            let endpoint = '/health-records/'
            if (activeTab === 'vaccinations') endpoint = '/health-records/vaccinations'
            if (activeTab === 'consultations') endpoint = '/health-records/consultations'
            
            const res = await apiClient.get(endpoint, { params: { skip: fetchSkip, limit: fetchLimit } })
            const total = parseInt(res.headers['x-total-count'] || '0')
            let items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
            
            if (debouncedSearch) {
                const searchLower = debouncedSearch.toLowerCase()
                items = items.filter((item: any) => {
                    let name = ''
                    if (item.pupil) {
                        name = `${item.pupil.first_name} ${item.pupil.last_name}`.toLowerCase()
                    } else {
                        // Fallback to local pupils array if embedded object is missing
                        const p = pupilsData?.find((p: any) => p.id === item.pupil_id)
                        if (p) name = `${p.first_name} ${p.last_name}`.toLowerCase()
                    }
                    return name.includes(searchLower)
                })
                // Apply manual pagination to the filtered results
                const filteredTotal = items.length
                items = items.slice(skip, skip + limit)
                return { items, total: filteredTotal }
            }
            
            return { items, total }
        }
    })

    const healthStats = statsData || {
        cmu_enrolled: 0,
        cmu_not_enrolled: 0,
        cmu_pending: 0,
        vaccinations_recorded: 0
    }

    const pupils = pupilsData || []
    const items = currentData?.items || []
    const totalCount = currentData?.total || 0
    const totalPages = Math.max(1, Math.ceil(totalCount / limit))

    const formatLabel = (text: string) => {
        if (!text) return ""
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    }

    const resetForm = () => {
        setEditingItem(null)
        setFormData({
            pupil_id: '', blood_group: '', allergies: '', chronic_conditions: '',
            cmu_status: 'not_enrolled', health_facility: '', vaccine_name: '',
            dose_number: 1, administered_date: new Date().toISOString().split('T')[0],
            consultation_type: '', consultation_date: new Date().toISOString().split('T')[0],
            diagnosis: '', treatment: '', practitioner: ''
        })
    }

    const createMutation = useMutation({
        mutationFn: async ({ endpoint, payload, isPut }: { endpoint: string, payload: any, isPut?: boolean }) => {
            if (isPut && editingItem) {
                return apiClient.put(`${endpoint}/${editingItem.id}`, payload)
            }
            return apiClient.post(endpoint, payload)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['healthData'] })
            queryClient.invalidateQueries({ queryKey: ['healthStats'] })
            setShowRecordModal(false)
            setShowVaccinationModal(false)
            setShowConsultationModal(false)
            resetForm()
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (endpoint: string) => apiClient.delete(endpoint),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['healthData'] })
            queryClient.invalidateQueries({ queryKey: ['healthStats'] })
            setShowDeleteConfirm(false)
        }
    })

    const archiveMutation = useMutation({
        mutationFn: async ({ pupil_id, archive }: { pupil_id: string, archive: boolean }) => 
            apiClient.put(`/health-records/${pupil_id}/archive?archive=${archive}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['healthData'] })
            setShowArchiveConfirm(false)
            setPupilToArchive(null)
        }
    })

    const handleArchiveClick = (pupil_id: string) => {
        setPupilToArchive(pupil_id)
        setShowArchiveConfirm(true)
    }

    const confirmArchive = () => {
        if (!pupilToArchive) return
        archiveMutation.mutate({ pupil_id: pupilToArchive, archive: true })
    }

    const handleCreateRecord = (e: React.FormEvent) => {
        e.preventDefault()
        createMutation.mutate({
            endpoint: '/health-records/',
            payload: {
                pupil_id: formData.pupil_id, blood_group: formData.blood_group,
                allergies: formData.allergies, chronic_conditions: formData.chronic_conditions,
                cmu_status: formData.cmu_status, health_facility: formData.health_facility,
                cmu_number: formData.cmu_number
            }
        })
    }

    const handleCreateVaccination = (e: React.FormEvent) => {
        e.preventDefault()
        createMutation.mutate({
            endpoint: '/health-records/vaccinations',
            isPut: !!editingItem,
            payload: {
                pupil_id: formData.pupil_id, vaccine_name: formData.vaccine_name,
                dose_number: parseInt(formData.dose_number), administered_date: formData.administered_date,
                facility: formData.health_facility
            }
        })
    }

    const handleCreateConsultation = (e: React.FormEvent) => {
        e.preventDefault()
        createMutation.mutate({
            endpoint: '/health-records/consultations',
            isPut: !!editingItem,
            payload: {
                pupil_id: formData.pupil_id, consultation_date: formData.consultation_date,
                consultation_type: formData.consultation_type, diagnosis: formData.diagnosis,
                treatment: formData.treatment, practitioner: formData.practitioner,
                facility: formData.health_facility
            }
        })
    }

    const handleEdit = (item: any, type: 'record' | 'vaccination' | 'consultation') => {
        setEditingItem(item)
        setFormData({
            ...formData, ...item,
            administered_date: item.administered_date ? new Date(item.administered_date).toISOString().split('T')[0] : formData.administered_date,
            consultation_date: item.consultation_date ? new Date(item.consultation_date).toISOString().split('T')[0] : formData.consultation_date,
        })
        if (type === 'record') setShowRecordModal(true)
        else if (type === 'vaccination') setShowVaccinationModal(true)
        else setShowConsultationModal(true)
    }

    const handleDeleteClick = (id: string, type: 'record' | 'vaccination' | 'consultation') => {
        setMemberToDelete({ id, type })
        setShowDeleteConfirm(true)
    }

    const confirmDelete = () => {
        if (!itemToDelete) return
        const endpoint = itemToDelete.type === 'record' ? `/health-records/${itemToDelete.id}` :
                       itemToDelete.type === 'vaccination' ? `/health-records/vaccinations/${itemToDelete.id}` :
                       `/health-records/consultations/${itemToDelete.id}`
        deleteMutation.mutate(endpoint)
    }

    const getPupilName = (record: any) => {
        if (record?.pupil && record.pupil.first_name) {
            return `${record.pupil.first_name} ${record.pupil.last_name}`
        }
        const p = pupils.find((p: any) => p.id === record?.pupil_id)
        return p ? `${p.first_name} ${p.last_name}` : 'Inconnu'
    }

    const healthCards = [
        { label: formatLabel(t('health.stats.cmu_enrolled')), value: healthStats.cmu_enrolled, color: '#10b981', icon: <Shield size={24}/> },
        { label: formatLabel(t('health.stats.not_enrolled')), value: healthStats.cmu_not_enrolled, color: '#ef4444', icon: <AlertCircle size={24}/> },
        { label: formatLabel(t('health.stats.pending')), value: healthStats.cmu_pending, color: '#f59e0b', icon: <Clock size={24}/> },
        { label: formatLabel(t('health.stats.vaccinations')), value: healthStats.vaccinations_recorded, color: '#3b82f6', icon: <Syringe size={24}/> }
    ]

    const renderCards = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1,2,3,4,5,6,7,8].map(i => (
                        <div key={i} className="h-64 rounded-[2rem] animate-pulse border" style={{ backgroundColor: colors.card, borderColor: colors.border }}></div>
                    ))}
                </div>
            )
        }

        if (items.length === 0) {
            return (
                <div className="py-20 text-center border-2 border-dashed rounded-[3rem]" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <Stethoscope size={64} className="mx-auto mb-6" style={{ color: colors.textSecondary }} />
                    <p className="text-xl font-black tracking-tight" style={{ color: colors.text }}>{t('common.no_data')}</p>
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((item: any) => {
                    const pupilName = getPupilName(item)
                    const initial = pupilName.charAt(0) || '?'

                    if (activeTab === 'overview') {
                        return (
                            <div key={item.id} className="group relative p-6 rounded-[2rem] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer border" style={{ backgroundColor: colors.card, borderColor: colors.border }} onClick={() => handleEdit(item, 'record')}>
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={(e) => { e.stopPropagation(); handleArchiveClick(item.pupil_id); }} className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all" title={t('common.archive')}><Archive size={16}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.pupil_id, 'record'); }} className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all" title={t('common.delete')}><Trash2 size={16}/></button>
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0" style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}>
                                        {initial}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-lg truncate pr-16 group-hover:text-primary-500 transition-colors" style={{ color: colors.text }}>{pupilName}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: colors.textSecondary }}>ID: {item.pupil?.cnive_id || '---'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="p-3 rounded-2xl border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: colors.textSecondary }}>{t('health.blood_group')}</p>
                                        <p className="font-black text-lg" style={{ color: colors.primary }}>{item.blood_group || '---'}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl border flex flex-col justify-center" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                        <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: colors.textSecondary }}>{t('health.cmu_status')}</p>
                                        <span className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-block text-center ${
                                            item.cmu_status === 'enrolled' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                            item.cmu_status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                            'bg-red-500/10 text-red-500 border-red-500/20'
                                        }`}>
                                            {t(`health.status.${item.cmu_status}`)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold p-3 rounded-2xl border" style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.textSecondary }}>
                                    <Building size={14} className="shrink-0" style={{ color: colors.textSecondary }}/>
                                    <span className="truncate">{item.health_facility || t('common.not_specified')}</span>
                                </div>
                            </div>
                        )
                    } else if (activeTab === 'vaccinations') {
                        return (
                            <div key={item.id} className="group relative p-6 rounded-[2rem] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer border" style={{ backgroundColor: colors.card, borderColor: colors.border }} onClick={() => handleEdit(item, 'vaccination')}>
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id, 'vaccination'); }} className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all"><Trash2 size={16}/></button>
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0" style={{ backgroundColor: '#3b82f615', color: '#3b82f6' }}>
                                        {initial}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-lg truncate pr-16 group-hover:text-blue-500 transition-colors" style={{ color: colors.text }}>{pupilName}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: colors.textSecondary }}>{new Date(item.administered_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl border mb-4" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><Syringe size={16}/></div>
                                        <span className="font-black truncate" style={{ color: colors.text }}>{item.vaccine_name}</span>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-500 text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-md shadow-blue-500/20 inline-block">
                                        {t('health.vaccination.dose_num', { num: item.dose_number })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: colors.textSecondary }}>
                                    <Building size={14} className="shrink-0" style={{ color: colors.textSecondary }}/>
                                    <span className="truncate">{item.facility || t('common.not_specified')}</span>
                                </div>
                            </div>
                        )
                    } else if (activeTab === 'consultations') {
                        return (
                            <div key={item.id} className="group relative p-6 rounded-[2rem] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer border" style={{ backgroundColor: colors.card, borderColor: colors.border }} onClick={() => handleEdit(item, 'consultation')}>
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id, 'consultation'); }} className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all"><Trash2 size={16}/></button>
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0" style={{ backgroundColor: '#10b98115', color: '#10b981' }}>
                                        {initial}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-lg truncate pr-16 group-hover:text-emerald-500 transition-colors" style={{ color: colors.text }}>{pupilName}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: colors.textSecondary }}>{new Date(item.consultation_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl border mb-4" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0"><Stethoscope size={16}/></div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: colors.textSecondary }}>{t('health.consultation.reason')}</p>
                                            <span className="font-black line-clamp-2 leading-snug" style={{ color: colors.text }}>{item.consultation_type}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold p-3 rounded-2xl border" style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.textSecondary }}>
                                    <Building size={14} className="shrink-0" style={{ color: colors.textSecondary }}/>
                                    <span className="truncate">{item.facility || t('common.not_specified')}</span>
                                </div>
                            </div>
                        )
                    }
                })}
            </div>
        )
    }

    const inputClass = `w-full px-6 py-4 border rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${
        mode === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
    }`
    const labelClass = "text-[10px] font-black uppercase tracking-widest mb-2 block"

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-0 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 md:mb-12">
                <div>
                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter mb-1 md:mb-2" style={{ color: colors.text }}>{formatLabel(t('health.title'))}</h1>
                    <p className="font-medium text-sm md:text-base" style={{ color: colors.textSecondary }}>{formatLabel(t('health.subtitle'))}</p>
                </div>
                <button 
                    onClick={() => {
                        resetForm();
                        if (activeTab === 'overview') setShowRecordModal(true)
                        else if (activeTab === 'vaccinations') setShowVaccinationModal(true)
                        else setShowConsultationModal(true)
                    }}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all shadow-xl shadow-primary-500/20 active:scale-95 flex items-center justify-center gap-2 md:gap-3 touch-target"
                >
                    <Plus size={16}/> {
                        activeTab === 'overview' ? formatLabel(t('health.new_record')) :
                        activeTab === 'vaccinations' ? formatLabel(t('health.vaccination.new')) :
                        formatLabel(t('health.consultation.new'))
                    }
                </button>
            </div>

            {/* Modals */}
            {showRecordModal && createPortal(
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border max-h-[90vh] flex flex-col" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <div className="p-8 md:p-10 border-b shrink-0" style={{ borderColor: colors.border }}>
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-black tracking-tight" style={{ color: colors.text }}>{editingItem ? t('common.edit') : t('health.new_record')}</h2>
                                <button onClick={() => { setShowRecordModal(false); resetForm(); }} className="p-2 rounded-full transition-colors" style={{ color: colors.textSecondary }}><X size={24}/></button>
                            </div>
                        </div>
                        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar">
                            <form id="recordForm" onSubmit={handleCreateRecord} className="space-y-6">
                                {(formData.pupil_id || editingItem?.pupil) && (() => {
                                    const p = editingItem?.pupil || pupils.find((p: any) => p.id === formData.pupil_id);
                                    if (!p) return null;
                                    return (
                                        <div className="flex items-center gap-4 p-4 rounded-2xl border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                            <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center text-white font-black">
                                                {p.first_name?.[0]}{p.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black" style={{ color: colors.text }}>{p.first_name} {p.last_name}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.textSecondary }}>ID: {p.cnive_id}</p>
                                            </div>
                                        </div>
                                    )
                                })()}
                                
                                {!editingItem && (
                                    <div>
                                        <label className={labelClass} style={{ color: colors.textSecondary }}>{t('interventions.pupil')}</label>
                                        <select required className={inputClass} value={formData.pupil_id} onChange={e => setFormData({...formData, pupil_id: e.target.value})}>
                                            <option value="">{t('health.form.choose_pupil')}</option>
                                            {pupils.map((p: any) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                                        </select>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass} style={{ color: colors.textSecondary }}>{t('health.blood_group')}</label>
                                        <select className={inputClass} value={formData.blood_group} onChange={e => setFormData({...formData, blood_group: e.target.value})}>
                                            <option value="">{t('health.form.blood_group_unknown')}</option>
                                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass} style={{ color: colors.textSecondary }}>{t('health.cmu_status')}</label>
                                        <select className={inputClass} value={formData.cmu_status} onChange={e => setFormData({...formData, cmu_status: e.target.value})}>
                                            <option value="enrolled">{t('health.status.enrolled')}</option>
                                            <option value="pending">{t('health.status.pending')}</option>
                                            <option value="not_enrolled">{t('health.status.not_enrolled')}</option>
                                        </select>
                                    </div>
                                </div>
                                {formData.cmu_status !== 'not_enrolled' && (
                                    <div>
                                        <label className={labelClass} style={{ color: colors.textSecondary }}>Numéro CMU</label>
                                        <input type="text" className={inputClass} value={formData.cmu_number || ''} onChange={e => setFormData({...formData, cmu_number: e.target.value})} placeholder="Numéro d'affiliation..." />
                                    </div>
                                )}
                                <div>
                                    <label className={labelClass} style={{ color: colors.textSecondary }}>{t('health.facility')}</label>
                                    <input type="text" className={inputClass} value={formData.health_facility} onChange={e => setFormData({...formData, health_facility: e.target.value})} placeholder={t('health.vaccination.facility_placeholder')} />
                                </div>
                            </form>
                        </div>
                        <div className="p-8 md:p-10 border-t shrink-0 flex gap-4" style={{ borderColor: colors.border }}>
                            <button type="submit" form="recordForm" className="flex-1 bg-primary-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-500/20 active:scale-95 transition-all">{t('common.save')}</button>
                            <button type="button" onClick={() => { setShowRecordModal(false); resetForm(); }} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all border" style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}>{t('common.cancel')}</button>
                        </div>
                    </div>
                </div>,
                getPortalContainer()
            )}

            {showVaccinationModal && createPortal(
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border max-h-[90vh] flex flex-col" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <div className="p-8 md:p-10 border-b shrink-0" style={{ borderColor: colors.border }}>
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-black tracking-tight" style={{ color: colors.text }}>{editingItem ? t('health.vaccination.edit') : t('health.vaccination.new')}</h2>
                                <button onClick={() => { setShowVaccinationModal(false); resetForm(); }} className="p-2 rounded-full transition-colors" style={{ color: colors.textSecondary }}><X size={24}/></button>
                            </div>
                        </div>
                        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar">
                            <form id="vaccForm" onSubmit={handleCreateVaccination} className="space-y-6">
                                {(formData.pupil_id || editingItem?.pupil) && (() => {
                                    const p = editingItem?.pupil || pupils.find((p: any) => p.id === formData.pupil_id);
                                    if (!p) return null;
                                    return (
                                        <div className="flex items-center gap-4 p-4 rounded-2xl border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white font-black">
                                                {p.first_name?.[0]}{p.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black" style={{ color: colors.text }}>{p.first_name} {p.last_name}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.textSecondary }}>ID: {p.cnive_id}</p>
                                            </div>
                                        </div>
                                    )
                                })()}
                                
                                {!editingItem && (
                                    <div>
                                        <label className={labelClass} style={{ color: colors.textSecondary }}>{t('interventions.pupil')}</label>
                                        <select required className={inputClass} value={formData.pupil_id} onChange={e => setFormData({...formData, pupil_id: e.target.value})}>
                                            <option value="">{t('health.form.choose_pupil')}</option>
                                            {pupils.map((p: any) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className={labelClass} style={{ color: colors.textSecondary }}>{t('health.vaccination.vaccine_name')}</label>
                                    <input required type="text" className={inputClass} value={formData.vaccine_name} onChange={e => setFormData({...formData, vaccine_name: e.target.value})} placeholder={t('health.vaccination.vaccine_placeholder')} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass} style={{ color: colors.textSecondary }}>{t('health.vaccination.dose')}</label>
                                        <input required type="number" className={inputClass} value={formData.dose_number} onChange={e => setFormData({...formData, dose_number: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={{ color: colors.textSecondary }}>{t('health.vaccination.date')}</label>
                                        <input required type="date" className={inputClass} value={formData.administered_date} onChange={e => setFormData({...formData, administered_date: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass} style={{ color: colors.textSecondary }}>{t('health.facility')}</label>
                                    <input type="text" className={inputClass} value={formData.health_facility} onChange={e => setFormData({...formData, health_facility: e.target.value})} placeholder={t('health.vaccination.facility_placeholder')} />
                                </div>
                            </form>
                        </div>
                        <div className="p-8 md:p-10 border-t shrink-0 flex gap-4" style={{ borderColor: colors.border }}>
                            <button type="submit" form="vaccForm" className="flex-1 bg-primary-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-500/20 active:scale-95 transition-all">{t('common.save')}</button>
                            <button type="button" onClick={() => { setShowVaccinationModal(false); resetForm(); }} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all border" style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}>{t('common.cancel')}</button>
                        </div>
                    </div>
                </div>,
                getPortalContainer()
            )}

            {showConsultationModal && createPortal(
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border max-h-[90vh] flex flex-col" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <div className="p-8 md:p-10 border-b shrink-0" style={{ borderColor: colors.border }}>
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-black tracking-tight" style={{ color: colors.text }}>{editingItem ? t('health.consultation.edit') : t('health.consultation.new')}</h2>
                                <button onClick={() => { setShowConsultationModal(false); resetForm(); }} className="p-2 rounded-full transition-colors" style={{ color: colors.textSecondary }}><X size={24}/></button>
                            </div>
                        </div>
                        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar">
                            <form id="consForm" onSubmit={handleCreateConsultation} className="space-y-6">
                                {(formData.pupil_id || editingItem?.pupil) && (() => {
                                    const p = editingItem?.pupil || pupils.find((p: any) => p.id === formData.pupil_id);
                                    if (!p) return null;
                                    return (
                                        <div className="flex items-center gap-4 p-4 rounded-2xl border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black">
                                                {p.first_name?.[0]}{p.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black" style={{ color: colors.text }}>{p.first_name} {p.last_name}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.textSecondary }}>ID: {p.cnive_id}</p>
                                            </div>
                                        </div>
                                    )
                                })()}

                                {!editingItem && (
                                    <div>
                                        <label className={labelClass} style={{ color: colors.textSecondary }}>{t('interventions.pupil')}</label>
                                        <select required className={inputClass} value={formData.pupil_id} onChange={e => setFormData({...formData, pupil_id: e.target.value})}>
                                            <option value="">{t('health.form.choose_pupil')}</option>
                                            {pupils.map((p: any) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className={labelClass} style={{ color: colors.textSecondary }}>{t('health.consultation.reason')}</label>
                                    <input required type="text" className={inputClass} value={formData.consultation_type} onChange={e => setFormData({...formData, consultation_type: e.target.value})} placeholder={t('health.consultation.reason_placeholder')} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass} style={{ color: colors.textSecondary }}>{t('health.consultation.date')}</label>
                                        <input required type="date" className={inputClass} value={formData.consultation_date} onChange={e => setFormData({...formData, consultation_date: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={{ color: colors.textSecondary }}>{t('health.consultation.diagnosis')}</label>
                                        <input type="text" className={inputClass} value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} placeholder={t('health.consultation.diagnosis_placeholder')} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass} style={{ color: colors.textSecondary }}>Praticien</label>
                                        <input type="text" className={inputClass} value={formData.practitioner} onChange={e => setFormData({...formData, practitioner: e.target.value})} placeholder="Nom du médecin..." />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={{ color: colors.textSecondary }}>{t('health.facility')}</label>
                                        <input type="text" className={inputClass} value={formData.health_facility} onChange={e => setFormData({...formData, health_facility: e.target.value})} placeholder={t('health.vaccination.facility_placeholder')} />
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-8 md:p-10 border-t shrink-0 flex gap-4" style={{ borderColor: colors.border }}>
                            <button type="submit" form="consForm" className="flex-1 bg-primary-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-500/20 active:scale-95 transition-all">{t('common.save')}</button>
                            <button type="button" onClick={() => { setShowConsultationModal(false); resetForm(); }} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all border" style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}>{t('common.cancel')}</button>
                        </div>
                    </div>
                </div>,
                getPortalContainer()
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
                {healthCards.map((card, i) => (
                    <div key={i} className="p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-[2.5rem] shadow-sm relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl group border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <div className="absolute top-4 right-4 md:top-6 md:right-6 opacity-20 group-hover:scale-125 transition-transform" style={{ color: card.color }}>{card.icon}</div>
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 md:mb-2 leading-tight" style={{ color: colors.textSecondary }}>{card.label}</p>
                        <div className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter" style={{ color: card.color }}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-10">
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    {[
                        { id: 'overview', label: formatLabel(t('health.tabs.overview')), icon: <Activity size={16}/> },
                        { id: 'vaccinations', label: formatLabel(t('health.tabs.vaccinations')), icon: <Syringe size={16}/> },
                        { id: 'consultations', label: formatLabel(t('health.tabs.consultations')), icon: <Stethoscope size={16}/> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setPage(1); }}
                            className="whitespace-nowrap px-4 sm:px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border touch-target"
                            style={
                                activeTab === tab.id 
                                ? { backgroundColor: colors.primary, color: '#ffffff', borderColor: colors.primary, boxShadow: `0 10px 15px -3px ${colors.primary}40` } 
                                : { backgroundColor: colors.card, borderColor: colors.border, color: colors.textSecondary }
                            }
                        >
                            {tab.icon} <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
                
                <div className="relative sm:flex-1 sm:max-w-xs">
                    <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2" size={16} style={{ color: colors.textSecondary }}/>
                    <input 
                        type="text" 
                        placeholder={t('common.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 md:pl-14 pr-4 md:pr-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm border"
                        style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                    />
                </div>
            </div>

            {/* Content */}
            {renderCards()}

            {/* Pagination Controls */}
            {!isLoading && totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-2">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                        disabled={page === 1}
                        className="w-12 h-12 rounded-2xl border flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                        style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2).map((p, i, arr) => {
                        if (i > 0 && p - arr[i - 1] > 1) {
                            return <span key={`ellipsis-${p}`} className="px-2 font-bold" style={{ color: colors.textSecondary }}>...</span>;
                        }
                        return (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className="w-12 h-12 rounded-2xl font-black text-sm transition-all shadow-sm border"
                                style={
                                    page === p 
                                    ? { backgroundColor: colors.primary, color: '#ffffff', borderColor: colors.primary, transform: 'scale(1.1)' } 
                                    : { backgroundColor: colors.card, borderColor: colors.border, color: colors.textSecondary }
                                }
                            >
                                {p}
                            </button>
                        );
                    })}

                    <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                        disabled={page === totalPages}
                        className="w-12 h-12 rounded-2xl border flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                        style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            <ConfirmModal 
                isOpen={showDeleteConfirm}
                title={t('common.delete')}
                message={t('common.confirm_delete')}
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />

            <ConfirmModal 
                isOpen={showArchiveConfirm}
                title={t('common.archive')}
                message={t('archives.confirm_archive')}
                onConfirm={confirmArchive}
                onCancel={() => setShowArchiveConfirm(false)}
            />
        </div>
    )
}

export default HealthRecords
