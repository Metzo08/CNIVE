import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import { 
    User, Calendar, MapPin, Phone, Shield, 
    Activity, AlertTriangle, ArrowLeft, Edit3, 
    FileText, Heart, Plus, ChevronRight, Clock,
    CheckCircle2, AlertCircle, BarChart3, BrainCircuit,
    DollarSign, BookOpen, HeartPulse, Users, ShieldAlert, Leaf
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getPupilPhotoUrl } from '../utils/imageUtils'

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
    const { colors, mode } = useTheme()
    const { t, i18n } = useTranslation()
    const [activeTab, setActiveTab] = useState('info')

    const { data: pupil, isLoading: loadingPupil } = useQuery({
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
        <div className="max-w-7xl mx-auto px-4 md:px-0 pb-20">
            {/* Header / Profile Summary */}
            <div className="bg-primary-600 rounded-[3rem] p-8 md:p-12 text-white mb-10 shadow-2xl shadow-primary-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
                
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-white p-1 shadow-2xl overflow-hidden shrink-0 relative flex items-center justify-center">
                        {pupil.photo_url ? (
                            <img 
                                src={getPupilPhotoUrl(pupil.photo_url)} 
                                className="w-full h-full object-cover rounded-[2.2rem] absolute inset-0" 
                                alt={`${pupil.first_name} ${pupil.last_name}`}
                                referrerPolicy="no-referrer"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        ) : null}
                        <div className="w-full h-full bg-primary-100 rounded-[2.2rem] flex items-center justify-center text-primary-600 text-5xl font-black select-none">
                            {pupil.first_name[0]}{pupil.last_name[0]}
                        </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 text-center md:text-left">
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-2 truncate">
                            {`${pupil.first_name} ${pupil.last_name}`}
                        </h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                                ID: {pupil.cnive_id}
                            </span>
                            <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <Shield size={14}/> {pupil.grade}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => navigate(`/pupils/edit/${id}`)} className="bg-white text-primary-600 p-4 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all">
                            <Edit3 size={20}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                {[
                    { id: 'info', label: t('pupils.tabs.info') },
                    { id: 'vulnerability', label: t('pupils.tabs.vulnerability') },
                    { id: 'interventions', label: t('pupils.tabs.interventions') },
                    { id: 'absences', label: t('pupils.tabs.absences') },
                    { id: 'ai', label: t('pupils.tabs.ai_analysis') }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`whitespace-nowrap px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
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
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[3rem] p-8 md:p-12 shadow-sm min-h-[400px]">
                {activeTab === 'info' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-500">
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">{t('pupils.civil_state')}</h3>
                            <div className="space-y-6">
                                <div><p className="text-[10px] font-black text-primary-500 uppercase tracking-wider mb-1">{t('pupils.form.first_name')}</p><p className="text-xl font-black">{pupil.first_name}</p></div>
                                <div><p className="text-[10px] font-black text-primary-500 uppercase tracking-wider mb-1">{t('pupils.form.last_name')}</p><p className="text-xl font-black">{pupil.last_name}</p></div>
                                <div><p className="text-[10px] font-black text-primary-500 uppercase tracking-wider mb-1">{t('pupils.form.gender')}</p><p className="text-xl font-black">{pupil.gender === 'F' ? t('gender.female') : t('gender.male')}</p></div>
                                <div><p className="text-[10px] font-black text-primary-500 uppercase tracking-wider mb-1">{t('pupils.form.birth_date')}</p><p className="text-xl font-black">{new Date(pupil.birth_date).toLocaleDateString()}</p></div>
                            </div>
                        </div>
                        <div className="border-t lg:border-t-0 lg:border-l border-slate-200/50 dark:border-white/5 pt-12 lg:pt-0 lg:pl-12">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">{t('pupils.schooling')}</h3>
                            <div className="space-y-6">
                                <div><p className="text-[10px] font-black text-primary-500 uppercase tracking-wider mb-1">{t('pupils.form.grade')}</p><p className="text-xl font-black">{pupil.grade}</p></div>
                                <div><p className="text-[10px] font-black text-primary-500 uppercase tracking-wider mb-1">{t('pupils.cnive_id')}</p><p className="text-xl font-black text-primary-600">{pupil.cnive_id}</p></div>
                                <div><p className="text-[10px] font-black text-primary-500 uppercase tracking-wider mb-1">{t('common.status')}</p>
                                <p className={`text-xl font-black ${pupil.status === 'ACTIVE' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {pupil.status === 'ACTIVE' 
                                        ? (pupil.gender === 'F' ? t('status.active_f') : t('status.active_m')) 
                                        : t(`status.${pupil.status.toLowerCase()}`)}
                                </p></div>
                                <div><p className="text-[10px] font-black text-primary-500 uppercase tracking-wider mb-1">{t('pupils.form.address')}</p><p className="text-xl font-black">{pupil.address || '---'}</p></div>
                                <div>
                                    <p className="text-[10px] font-black text-primary-500 uppercase tracking-wider mb-1">Contact Tuteur / Parent</p>
                                    <p className="text-xl font-black flex items-center gap-3">
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
                        {loadingVulnerability ? (
                            <div className="py-20 text-center"><Activity className="animate-spin mx-auto text-primary-500" /></div>
                        ) : !latestAssessment ? (
                            <div className="py-20 text-center opacity-40">
                                <Shield size={64} className="mx-auto mb-6" />
                                <p className="text-xl font-black tracking-tight">{t('vulnerability.empty')}</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 bg-slate-50 dark:bg-white/5 rounded-[2.5rem]">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('vulnerability.classification')}</p>
                                        <div className="flex items-center gap-4">
                                            <div className={`px-6 py-2 rounded-2xl text-xl font-black border ${
                                                latestAssessment.classification === 'CRITICAL' ? 'bg-red-500 text-white border-red-600' :
                                                latestAssessment.classification === 'HIGH' ? 'bg-orange-500 text-white border-orange-600' :
                                                latestAssessment.classification === 'MODERATE' ? 'bg-amber-500 text-white border-amber-600' :
                                                'bg-emerald-500 text-white border-emerald-600'
                                            }`}>
                                                {t(`vulnerability.${latestAssessment.classification.toLowerCase()}`)}
                                            </div>
                                            <p className="text-4xl font-black opacity-30">{latestAssessment.total_score} <span className="text-sm">pts</span></p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('vulnerability.last_update')}</p>
                                        <p className="text-lg font-black">{new Date(latestAssessment.assessment_date).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                {assessments && assessments.length > 1 && (
                                    <div className="p-6 md:p-8 bg-slate-50 dark:bg-white/5 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-white/5 mb-8">
                                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <BarChart3 size={16} className="text-primary-500"/> {formatLabel('Historique de vulnérabilité FEV')}
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

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
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
                                            <div key={i} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
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
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{dim.label}</p>
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
                        {loadingInterventions ? (
                            <div className="py-20 text-center"><Activity className="animate-spin mx-auto text-primary-500" /></div>
                        ) : pupilInterventions?.length === 0 ? (
                            <div className="py-20 text-center opacity-40">
                                <Heart size={64} className="mx-auto mb-6" />
                                <p className="text-xl font-black tracking-tight">{t('common.no_data')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pupilInterventions?.map(inv => {
                                    const statusColors = getStatusColors(inv.status)
                                    return (
                                        <div key={inv.id} className="p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0" style={{ backgroundColor: statusColors.bg }}>
                                                    {inv.intervention_type === 'health' ? '🏥' : inv.intervention_type === 'social' ? '👨‍👩‍👧' : '📋'}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-lg">{inv.title}</h4>
                                                    <p className="text-sm font-bold text-slate-500">{inv.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border`} style={{ backgroundColor: statusColors.bg, color: statusColors.text, borderColor: `${statusColors.text}20` }}>
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
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('absences.history')}</h3>
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
                                    <div key={abs.id} className="p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-primary-500/30 transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${abs.is_justified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {abs.is_justified ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
                                            </div>
                                            <div>
                                                <p className="font-black text-lg">{t(`absences.reasons.${abs.reason}`)}</p>
                                                <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                                    <Calendar size={12}/> {new Date(abs.date).toLocaleDateString()} • <Clock size={12}/> {abs.duration_days} {t('absences.duration').split(' ')[0]}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
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
                                <p className="text-xl font-black tracking-tight">Analyse IA non disponible</p>
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
                                        <div className={`flex flex-col md:flex-row gap-8 items-center p-8 text-white rounded-[2.5rem] shadow-xl ${riskBg} transition-colors duration-500`}>
                                            <div className="relative w-32 h-32 shrink-0">
                                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                                                    <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="8" strokeDasharray={`${aiData.risk_prediction.risk_score * 2.8} 282`} transform="rotate(-90 50 50)" strokeLinecap="round" />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <p className="text-3xl font-black">{aiData.risk_prediction.risk_score}%</p>
                                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">{t('ai.predict.score') || 'Score Risque'}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black mb-2">{t('ai.predict.level')} : {t(`ai.predict.levels.${level}`) || level}</h3>
                                                <p className="font-medium opacity-80 leading-relaxed">
                                                    {aiData.risk_prediction.risk_score > 0 
                                                        ? t('ai.predict.factors_found', { count: aiData.risk_prediction.factors.length })
                                                        : t('ai.predict.stable_desc')}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })()}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-slate-100 dark:border-white/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><AlertTriangle size={14}/> {t('ai.predict.factors')}</h4>
                                        <ul className="space-y-4">
                                            {aiData.risk_prediction.factors.map((f, i) => (
                                                <li key={i} className="flex gap-3 text-sm font-bold"><span className="text-primary-500">•</span> {f}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="p-8 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-[2.5rem] border border-emerald-500/20">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-6 flex items-center gap-2"><CheckCircle2 size={14}/> {t('ai.predict.recommendations')}</h4>
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
