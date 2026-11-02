import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import { 
    Calendar, Shield, 
    Activity, AlertTriangle, ArrowLeft, Edit3, 
    Heart, Plus, Clock,
    CheckCircle2, AlertCircle, BarChart3, BrainCircuit,
    DollarSign, BookOpen, HeartPulse, Users, ShieldAlert, Leaf,
    Stethoscope, CreditCard, ClipboardCheck
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getPupilPhotoUrl, handlePupilPhotoError } from '../utils/imageUtils'

interface Pupil {
    id: string
    cnive_id: string
    first_name: string
    last_name: string
    birth_date: string
    gender: string
    address: string
    grade: string
    status: string
    photo_url?: string
    academic_score?: number
    contact_parent1_name?: string
    contact_parent1_phone?: string
}

interface Absence {
    id: string
    date: string
    reason: string
    is_justified: boolean
    duration_days: number
    notes: string
    created_at: string
}

interface VulnerabilityAssessment {
    id: string
    classification: string
    total_score: number
    assessment_date: string
    economic_score: number
    school_score: number
    health_nutrition_score: number
    family_social_score: number
    protection_score: number
    environmental_score: number
}

interface Intervention {
    id: string
    title: string
    intervention_type: string
    status: string
    priority: string
    description: string
}

interface AIAnalysis {
    risk_prediction: {
        risk_score: number
        risk_level: string
        factors: string[]
        recommendations: string[]
    }
    insights: string[]
}

const PupilProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { colors, mode } = useTheme()
    const { t, i18n } = useTranslation()
    const initialTab = searchParams.get('tab') || 'info'
    const [activeTab, setActiveTab] = useState(initialTab)

    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam)
        }
    }, [searchParams])

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId)
        setSearchParams({ tab: tabId }, { replace: true })
    }

    const { data: pupil, isLoading: loadingPupil } = useQuery<Pupil>({
        queryKey: ['pupil', id],
        queryFn: async () => {
            const res = await apiClient.get(`/pupils/${id}`)
            return res.data
        }
    })

    const { data: assessments, isLoading: loadingVulnerability } = useQuery({
        queryKey: ['vulnerabilities', id],
        queryFn: async () => {
            try {
                const res = await apiClient.get(`/vulnerabilities/${id}`)
                return res.data as VulnerabilityAssessment[]
            } catch (e) { return [] }
        },
        enabled: activeTab === 'vulnerability'
    })

    const latestAssessment = assessments && assessments.length > 0 ? assessments[0] : null

    const { data: pupilInterventions, isLoading: loadingInterventions } = useQuery({
        queryKey: ['interventions', id],
        queryFn: async () => {
            const res = await apiClient.get(`/interventions/?pupil_id=${id}`)
            return res.data as Intervention[]
        },
        enabled: activeTab === 'interventions'
    })

    const { data: aiData, isLoading: loadingAI } = useQuery({
        queryKey: ['ai-analysis', id],
        queryFn: async () => {
            const res = await apiClient.get(`/ai/analyze/${id}`)
            return res.data as AIAnalysis
        },
        enabled: activeTab === 'ai'
    })

    const { data: absences, isLoading: loadingAbsences } = useQuery({
        queryKey: ['absences', id],
        queryFn: async () => {
            const res = await apiClient.get(`/absences/pupil/${id}`)
            return res.data as Absence[]
        },
        enabled: activeTab === 'absences'
    })

    const formatLabel = (text: string) => {
        if (!text) return ""
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
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

    if (loadingPupil) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Activity className="animate-spin text-primary-500" size={48} />
        </div>
    )

    if (!pupil) return (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <AlertTriangle size={64} className="mx-auto text-amber-500 mb-6" />
            <h2 className="text-2xl font-black mb-4">{formatLabel(t('pupils.not_found'))}</h2>
            <button onClick={() => navigate('/pupils')} className="text-primary-600 font-bold flex items-center gap-2 mx-auto hover:underline">
                <ArrowLeft size={20}/> {formatLabel(t('common.back_to_list'))}
            </button>
        </div>
    )

    return (
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-0 pb-20">
            {/* Bouton Retour */}
            <div className="mb-4">
                <button
                    onClick={() => navigate('/pupils')}
                    className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-primary-600 transition-colors px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
                >
                    <ArrowLeft size={16} /> {formatLabel(t('common.back_to_list'))}
                </button>
            </div>

            {/* Header / Profile Summary */}
            <div className="bg-primary-600 rounded-3xl md:rounded-[3rem] p-6 sm:p-8 md:p-12 text-white mb-8 shadow-2xl shadow-primary-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
                
                <div className="flex flex-col lg:flex-row items-center gap-6 md:gap-8 relative z-10">
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl md:rounded-[2.5rem] bg-white p-1 shadow-2xl overflow-hidden shrink-0 relative flex items-center justify-center">
                        <div className="w-full h-full bg-primary-100 rounded-[1.4rem] md:rounded-[2.2rem] flex items-center justify-center text-primary-600 text-4xl md:text-5xl font-black select-none relative z-0">
                            {pupil.first_name?.[0]}{pupil.last_name?.[0]}
                        </div>
                        {pupil.photo_url ? (
                            <img 
                                src={getPupilPhotoUrl(pupil.photo_url)} 
                                className="w-full h-full object-cover rounded-[1.4rem] md:rounded-[2.2rem] absolute inset-0 z-10" 
                                alt={`${pupil.first_name} ${pupil.last_name}`}
                                referrerPolicy="no-referrer"
                                onError={(e) => handlePupilPhotoError(e, pupil.photo_url)}
                            />
                        ) : null}
                    </div>
                    
                    <div className="flex-1 min-w-0 text-center lg:text-left">
                        <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tighter mb-3 truncate">
                            {`${pupil.first_name} ${pupil.last_name}`}
                        </h1>
                        <div className="flex flex-wrap justify-center lg:justify-start gap-2.5">
                            <span className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wider">
                                Id : {pupil.cnive_id}
                            </span>
                            <span className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wider flex items-center gap-1.5">
                                <Shield size={14}/> {pupil.grade || 'Non assigné'}
                            </span>
                        </div>
                    </div>

                    {/* Actions rapides interconnectées */}
                    <div className="flex flex-wrap justify-center gap-2.5 shrink-0">
                        <button
                            onClick={() => navigate(`/vulnerability?pupil=${id}`)}
                            className="bg-white/15 hover:bg-white/25 text-white px-4 py-3 rounded-2xl font-black text-xs flex items-center gap-2 backdrop-blur-md transition-all active:scale-95"
                            title="Évaluer la vulnérabilité fev"
                        >
                            <ClipboardCheck size={16} /> <span>Évaluer fev</span>
                        </button>
                        <button
                            onClick={() => navigate(`/health?pupil=${id}`)}
                            className="bg-white/15 hover:bg-white/25 text-white px-4 py-3 rounded-2xl font-black text-xs flex items-center gap-2 backdrop-blur-md transition-all active:scale-95"
                            title="Ouvrir le dossier médical"
                        >
                            <Stethoscope size={16} /> <span>Dossier santé</span>
                        </button>
                        <button
                            onClick={() => navigate(`/cards?pupil=${id}`)}
                            className="bg-white/15 hover:bg-white/25 text-white px-4 py-3 rounded-2xl font-black text-xs flex items-center gap-2 backdrop-blur-md transition-all active:scale-95"
                            title="Voir ou imprimer la carte cnive"
                        >
                            <CreditCard size={16} /> <span>Carte cnive</span>
                        </button>
                        <button
                            onClick={() => navigate(`/pupils/edit/${id}`)}
                            className="bg-white text-primary-600 px-4 py-3 rounded-2xl font-black text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            title="Modifier la fiche de l'élève"
                        >
                            <Edit3 size={16}/> <span>Modifier</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 md:mb-8 overflow-x-auto pb-2 no-scrollbar -mx-2 px-2 md:mx-0 md:px-0">
                {[
                    { id: 'info', label: t('pupils.tabs.info') },
                    { id: 'vulnerability', label: t('pupils.tabs.vulnerability') },
                    { id: 'interventions', label: t('pupils.tabs.interventions') },
                    { id: 'absences', label: t('pupils.tabs.absences') },
                    { id: 'ai', label: t('pupils.tabs.ai_analysis') }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`whitespace-nowrap px-5 md:px-6 py-3.5 rounded-2xl font-black text-xs tracking-wider transition-all ${
                            activeTab === tab.id 
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' 
                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:bg-slate-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-3xl md:rounded-[3rem] p-6 sm:p-8 md:p-12 shadow-sm min-h-[400px]">
                {activeTab === 'info' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 animate-in fade-in duration-500">
                        <div>
                            <h3 className="text-xs font-black text-slate-400 tracking-wider mb-6 md:mb-8">{t('pupils.civil_state')}</h3>
                            <div className="space-y-6">
                                <div><p className="text-xs font-black text-primary-500 tracking-wider mb-1">{t('pupils.form.first_name')}</p><p className="text-lg md:text-xl font-black">{pupil.first_name}</p></div>
                                <div><p className="text-xs font-black text-primary-500 tracking-wider mb-1">{t('pupils.form.last_name')}</p><p className="text-lg md:text-xl font-black">{pupil.last_name}</p></div>
                                <div><p className="text-xs font-black text-primary-500 tracking-wider mb-1">{t('pupils.form.gender')}</p><p className="text-lg md:text-xl font-black">{pupil.gender === 'F' ? t('gender.female') : t('gender.male')}</p></div>
                                <div><p className="text-xs font-black text-primary-500 tracking-wider mb-1">{t('pupils.form.birth_date')}</p><p className="text-lg md:text-xl font-black">{new Date(pupil.birth_date).toLocaleDateString()}</p></div>
                            </div>
                        </div>
                        <div className="border-t lg:border-t-0 lg:border-l border-slate-200/50 dark:border-white/5 pt-8 lg:pt-0 lg:pl-12">
                            <h3 className="text-xs font-black text-slate-400 tracking-wider mb-6 md:mb-8">{t('pupils.schooling')}</h3>
                            <div className="space-y-6">
                                <div><p className="text-xs font-black text-primary-500 tracking-wider mb-1">{t('pupils.form.grade')}</p><p className="text-lg md:text-xl font-black">{pupil.grade}</p></div>
                                <div><p className="text-xs font-black text-primary-500 tracking-wider mb-1">{t('pupils.cnive_id')}</p><p className="text-lg md:text-xl font-black text-primary-600">{pupil.cnive_id}</p></div>
                                <div><p className="text-xs font-black text-primary-500 tracking-wider mb-1">{t('common.status')}</p>
                                <p className={`text-lg md:text-xl font-black ${pupil.status === 'ACTIVE' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {pupil.status === 'ACTIVE' 
                                        ? (pupil.gender === 'F' ? t('status.active_f') : t('status.active_m')) 
                                        : t(`status.${pupil.status.toLowerCase()}`)}
                                </p></div>
                                <div><p className="text-xs font-black text-primary-500 tracking-wider mb-1">{t('pupils.form.address')}</p><p className="text-lg md:text-xl font-black">{pupil.address || '---'}</p></div>
                                <div>
                                    <p className="text-xs font-black text-primary-500 tracking-wider mb-1">Contact tuteur / parent</p>
                                    <p className="text-lg md:text-xl font-black flex flex-wrap items-center gap-3">
                                        <span>{pupil.contact_parent1_name || 'Tuteur'}</span>
                                        {pupil.contact_parent1_phone && (
                                            <a 
                                                href={`tel:${pupil.contact_parent1_phone}`} 
                                                className="text-sm font-bold px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all inline-flex items-center gap-1.5"
                                                title={`Appeler le ${pupil.contact_parent1_phone}`}
                                            >
                                                <span>📞</span>
                                                <span>{pupil.contact_parent1_phone}</span>
                                            </a>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'vulnerability' && (
                    <div className="animate-in fade-in duration-500">
                        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                            <h3 className="text-xs font-black text-slate-400 tracking-wider">Bilan multidimensionnel fev</h3>
                            <button
                                onClick={() => navigate(`/vulnerability?pupil=${id}`)}
                                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-all active:scale-95"
                            >
                                <Plus size={16} /> Nouvelle évaluation fev
                            </button>
                        </div>
                        {loadingVulnerability ? (
                            <div className="py-20 text-center"><Activity className="animate-spin mx-auto text-primary-500" /></div>
                        ) : !latestAssessment ? (
                            <div className="py-16 text-center">
                                <Shield size={64} className="mx-auto mb-6 opacity-30" />
                                <p className="text-xl font-black tracking-tight opacity-50 mb-6">{t('vulnerability.empty')}</p>
                                <button
                                    onClick={() => navigate(`/vulnerability?pupil=${id}`)}
                                    className="px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xs inline-flex items-center gap-2 shadow-xl shadow-primary-500/20"
                                >
                                    <ClipboardCheck size={16} /> Lancer la première évaluation fev
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 md:p-8 bg-slate-50 dark:bg-white/5 rounded-3xl md:rounded-[2.5rem]">
                                    <div>
                                        <p className="text-xs font-black text-slate-400 tracking-wider mb-2">{t('vulnerability.classification')}</p>
                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className={`px-6 py-2 rounded-2xl text-lg md:text-xl font-black border ${
                                                latestAssessment.classification === 'CRITICAL' ? 'bg-red-500 text-white border-red-600' :
                                                latestAssessment.classification === 'HIGH' ? 'bg-orange-500 text-white border-orange-600' :
                                                latestAssessment.classification === 'MODERATE' ? 'bg-amber-500 text-white border-amber-600' :
                                                'bg-emerald-500 text-white border-emerald-600'
                                            }`}>
                                                {t(`vulnerability.${latestAssessment.classification.toLowerCase()}`)}
                                            </div>
                                            <p className="text-3xl md:text-4xl font-black opacity-30">{latestAssessment.total_score} <span className="text-sm">Pts</span></p>
                                        </div>
                                    </div>
                                    <div className="md:text-right">
                                        <p className="text-xs font-black text-slate-400 tracking-wider mb-2">{t('vulnerability.last_update')}</p>
                                        <p className="text-lg font-black">{new Date(latestAssessment.assessment_date).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                {assessments && assessments.length > 1 && (
                                    <div className="p-6 md:p-8 bg-slate-50 dark:bg-white/5 rounded-3xl md:rounded-[2.5rem] border border-slate-100 dark:border-white/5 mb-8">
                                        <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 tracking-wider mb-6 flex items-center gap-2">
                                            <BarChart3 size={16} className="text-primary-500"/> {formatLabel('Historique de vulnérabilité fev')}
                                        </h4>
                                        <div style={{ height: '240px', width: '100%', overflow: 'hidden' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={[...assessments].reverse().map(a => ({
                                                    date: new Date(a.assessment_date).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'fr-FR', { month: 'short', year: '2-digit' }),
                                                    score: a.total_score
                                                }))}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                                    <XAxis dataKey="date" tick={{ fill: mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                    <YAxis domain={[0, 120]} tick={{ fill: mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', color: mode === 'dark' ? '#ffffff' : '#000000', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                                    <Line type="monotone" dataKey="score" stroke={colors.primary} strokeWidth={3} dot={{ r: 6, fill: colors.primary }} activeDot={{ r: 8 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                    {[
                                        { label: t('vulnerability.economic'), score: latestAssessment.economic_score, icon: <DollarSign size={24}/> },
                                        { label: t('vulnerability.school'), score: latestAssessment.school_score, icon: <BookOpen size={24}/> },
                                        { label: t('vulnerability.health'), score: latestAssessment.health_nutrition_score, icon: <HeartPulse size={24}/> },
                                        { label: t('vulnerability.social'), score: latestAssessment.family_social_score, icon: <Users size={24}/> },
                                        { label: t('vulnerability.protection'), score: latestAssessment.protection_score, icon: <ShieldAlert size={24}/> },
                                        { label: t('vulnerability.environmental'), score: latestAssessment.environmental_score, icon: <Leaf size={24}/> }
                                    ].map((dim, i) => {
                                        const percentage = (dim.score / 20) * 100;
                                        const colorClass = dim.score >= 15 ? 'text-red-500 bg-red-500' : dim.score >= 10 ? 'text-amber-500 bg-amber-500' : 'text-emerald-500 bg-emerald-500';
                                        const iconColor = dim.score >= 15 ? 'text-red-500' : dim.score >= 10 ? 'text-amber-500' : 'text-emerald-500';
                                        const bgLight = dim.score >= 15 ? 'bg-red-500/10' : dim.score >= 10 ? 'bg-amber-500/10' : 'bg-emerald-500/10';

                                        return (
                                            <div key={i} className="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-2xl ${bgLight} ${iconColor} group-hover:scale-110 transition-transform`}>
                                                        {dim.icon}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-2xl font-black ${iconColor}`}>{dim.score}</span>
                                                        <span className="text-xs font-bold text-slate-400"> /20</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-500 tracking-wider mb-3">{dim.label}</p>
                                                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full ${colorClass.split(' ')[1]} transition-all duration-1000`} style={{ width: `${percentage}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'interventions' && (
                    <div className="animate-in fade-in duration-500">
                        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                            <h3 className="text-xs font-black text-slate-400 tracking-wider">Suivi des interventions sociales et sanitaires</h3>
                            <button
                                onClick={() => navigate(`/interventions?pupil=${id}`)}
                                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-all active:scale-95"
                            >
                                <Plus size={16} /> Planifier une intervention
                            </button>
                        </div>
                        {loadingInterventions ? (
                            <div className="py-20 text-center"><Activity className="animate-spin mx-auto text-primary-500" /></div>
                        ) : pupilInterventions?.length === 0 ? (
                            <div className="py-16 text-center">
                                <Heart size={64} className="mx-auto mb-6 opacity-30" />
                                <p className="text-xl font-black tracking-tight opacity-50 mb-6">{t('common.no_data')}</p>
                                <button
                                    onClick={() => navigate(`/interventions?pupil=${id}`)}
                                    className="px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xs inline-flex items-center gap-2 shadow-xl shadow-primary-500/20"
                                >
                                    <Plus size={16} /> Créer une intervention pour cet élève
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pupilInterventions?.map(inv => {
                                    const statusColors = getStatusColors(inv.status)
                                    return (
                                        <div key={inv.id} className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex items-center gap-4 md:gap-6">
                                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0" style={{ backgroundColor: statusColors.bg }}>
                                                    {inv.intervention_type === 'health' ? '🏥' : inv.intervention_type === 'social' ? '👨‍👩‍👧' : '📋'}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-base md:text-lg">{inv.title}</h4>
                                                    <p className="text-xs md:text-sm font-bold text-slate-500">{inv.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="px-4 py-1.5 rounded-xl text-xs font-black tracking-wider border" style={{ backgroundColor: statusColors.bg, color: statusColors.text, borderColor: `${statusColors.text}20` }}>
                                                    {t(`interventions.status.${inv.status}`)}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'absences' && (
                    <div className="animate-in fade-in duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xs font-black text-slate-400 tracking-wider">{t('absences.history')}</h3>
                        </div>
                        
                        {loadingAbsences ? (
                            <div className="py-20 text-center"><Activity className="animate-spin mx-auto text-primary-500" /></div>
                        ) : absences?.length === 0 ? (
                            <div className="py-20 text-center opacity-40">
                                <Calendar size={48} className="mx-auto mb-4" />
                                <p className="font-black">{t('absences.empty')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {absences?.map(abs => (
                                    <div key={abs.id} className="p-5 md:p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-primary-500/30 transition-all">
                                        <div className="flex items-center gap-4 md:gap-6">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${abs.is_justified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {abs.is_justified ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
                                            </div>
                                            <div>
                                                <p className="font-black text-base md:text-lg">{t(`absences.reasons.${abs.reason}`)}</p>
                                                <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                                    <Calendar size={12}/> {new Date(abs.date).toLocaleDateString()} • <Clock size={12}/> {abs.duration_days} {t('absences.duration').split(' ')[0]}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="sm:text-right">
                                            <span className={`px-4 py-1.5 rounded-xl text-xs font-black tracking-wider border inline-block ${
                                                abs.is_justified ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>
                                                {abs.is_justified ? t('absences.justified') : t('absences.not_justified')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="animate-in fade-in duration-500">
                        {loadingAI ? (
                            <div className="py-20 text-center"><Activity className="animate-spin mx-auto text-primary-500" /></div>
                        ) : !aiData ? (
                            <div className="py-20 text-center opacity-40">
                                <BrainCircuit size={64} className="mx-auto mb-6" />
                                <p className="text-xl font-black tracking-tight">Analyse ia non disponible</p>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {(() => {
                                    const level = aiData.risk_prediction.risk_level;
                                    const riskBg = level === 'CRITICAL' ? 'bg-red-500 shadow-red-500/20' :
                                                   level === 'HIGH' ? 'bg-orange-500 shadow-orange-500/20' :
                                                   level === 'MODERATE' ? 'bg-amber-500 shadow-amber-500/20' :
                                                   'bg-emerald-500 shadow-emerald-500/20';
                                    return (
                                        <div className={`flex flex-col md:flex-row gap-6 md:gap-8 items-center p-6 md:p-8 text-white rounded-3xl md:rounded-[2.5rem] shadow-xl ${riskBg} transition-colors duration-500`}>
                                            <div className="relative w-32 h-32 shrink-0">
                                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                                                    <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="8" strokeDasharray={`${aiData.risk_prediction.risk_score * 2.8} 282`} transform="rotate(-90 50 50)" strokeLinecap="round" />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <p className="text-3xl font-black">{aiData.risk_prediction.risk_score}%</p>
                                                    <p className="text-[9px] font-black tracking-wider opacity-80">{t('ai.predict.score') || 'Score de risque'}</p>
                                                </div>
                                            </div>
                                            <div className="text-center md:text-left">
                                                <h3 className="text-xl md:text-2xl font-black mb-2">{t('ai.predict.level')} : {t(`ai.predict.levels.${level}`) || level}</h3>
                                                <p className="font-medium opacity-80 leading-relaxed text-sm md:text-base">
                                                    {aiData.risk_prediction.risk_score > 0 
                                                        ? t('ai.predict.factors_found', { count: aiData.risk_prediction.factors.length })
                                                        : t('ai.predict.stable_desc')}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })()}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                    <div className="p-6 md:p-8 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
                                        <h4 className="text-xs font-black tracking-wider text-slate-400 mb-6 flex items-center gap-2"><AlertTriangle size={14}/> {t('ai.predict.factors')}</h4>
                                        <ul className="space-y-4">
                                            {aiData.risk_prediction.factors.map((f, i) => (
                                                <li key={i} className="flex gap-3 text-sm font-bold"><span className="text-primary-500">•</span> {f}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="p-6 md:p-8 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                                        <h4 className="text-xs font-black tracking-wider text-emerald-600 dark:text-emerald-400 mb-6 flex items-center gap-2"><CheckCircle2 size={14}/> {t('ai.predict.recommendations')}</h4>
                                        <ul className="space-y-4">
                                            {aiData.risk_prediction.recommendations.map((r, i) => (
                                                <li key={i} className="flex gap-3 text-sm font-bold text-emerald-800 dark:text-emerald-300"><span className="text-emerald-500">✓</span> {r}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default PupilProfile
