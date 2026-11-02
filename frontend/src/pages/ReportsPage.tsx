import React, { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import { FileText, Download, User, BarChart, Activity, Shield, Info, ArrowRight, ClipboardList, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

interface Pupil {
    id: string
    first_name: string
    last_name: string
    cnive_id: string
}

const ReportsPage: React.FC = () => {
    const { t } = useTranslation()
    const { colors } = useTheme()
    const [pupils, setPupils] = useState<Pupil[]>([])
    const [schools, setSchools] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [selectedEntity, setSelectedEntity] = useState('')
    const [reportType, setReportType] = useState('pupil_profile')

    useEffect(() => {
        Promise.all([
            apiClient.get('/pupils/'),
            apiClient.get('/schools/')
        ]).then(([pupilsRes, schoolsRes]) => {
            setPupils(Array.isArray(pupilsRes.data) ? pupilsRes.data : [])
            setSchools(Array.isArray(schoolsRes.data) ? schoolsRes.data : [])
        }).catch(console.error).finally(() => setLoading(false))
    }, [])

    const handleGenerateReport = async () => {
        if (!selectedEntity) return
        setGenerating(true)
        try {
            const response = await apiClient.post('/reports/generate', {
                report_type: reportType,
                entity_id: selectedEntity,
                include_charts: true
            }, { responseType: 'blob' })

            if (response.status === 200) {
                const contentType = response.headers['content-type']
                if (contentType?.includes('application/pdf')) {
                    const blob = new Blob([response.data], { type: 'application/pdf' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `rapport_${reportType}_${selectedEntity}.pdf`
                    a.click()
                    window.URL.revokeObjectURL(url)
                }
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setGenerating(false)
        }
    }

    const reportTypes = [
        { id: 'pupil_profile_full', name: "Profil complet", icon: <User size={24}/>, description: "Dossier intégral du bénéficiaire" },
        { id: 'pupil_profile_personal', name: "Informations personnelles", icon: <Info size={24}/>, description: "Données civiles et scolaires" },
        { id: 'vulnerability_summary', name: "Vulnérabilité", icon: <AlertTriangle size={24}/>, description: "Niveau de risque global" },
        { id: 'vulnerability_detailed', name: "Évaluation des 5 dimensions", icon: <Shield size={24}/>, description: "Détail des critères d'évaluation" },
        { id: 'health_summary', name: "Dossier santé", icon: <Activity size={24}/>, description: "État général et allergies" },
        { id: 'health_detailed', name: "Suivi médical et vaccins", icon: <CheckCircle2 size={24}/>, description: "Historique des vaccinations" },
        { id: 'school_summary_basic', name: "Synthèse école", icon: <ClipboardList size={24}/>, description: "Résumé par établissement" },
        { id: 'school_summary_global', name: "Statistiques globales", icon: <BarChart size={24}/>, description: "Indicateurs de performance" }
    ]

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-0 pb-20">
            <div className="relative overflow-hidden p-6 md:p-10 lg:p-14 rounded-2xl md:rounded-[2.5rem] mb-6 md:mb-10 shadow-2xl shadow-primary-500/20"
                 style={{ background: 'linear-gradient(135deg, #00A99D 0%, #0072BC 100%)' }}>
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5 md:gap-8 text-center sm:text-left">
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                        <FileText size={28} className="md:hidden" />
                        <FileText size={40} className="hidden md:block" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-3xl md:text-5xl font-black text-white tracking-tighter mb-1 md:mb-2">{t('reports.title')}</h1>
                        <p className="text-white/80 text-sm md:text-lg font-bold">{t('reports.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                <div className="lg:col-span-2 space-y-4 md:space-y-8">
                    <div className="border rounded-2xl md:rounded-[2.5rem] p-5 md:p-8 lg:p-10 shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <h3 className="text-base md:text-xl font-black mb-5 md:mb-8 flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-500 text-white text-xs font-black">1</span>
                            {t('reports.step1')}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {reportTypes.map((type, i) => (
                                <div key={i} onClick={() => setReportType(type.id)}
                                    className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer group flex flex-col gap-4 ${
                                        reportType === type.id 
                                        ? 'border-[#00A99D] bg-[#00A99D]/5' 
                                        : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}>
                                    <div className={`transition-transform duration-300 group-hover:scale-110 ${reportType === type.id ? 'text-[#00A99D]' : 'text-slate-400'}`}>{type.icon}</div>
                                    <div>
                                        <div className={`font-black text-sm  tracking-tight mb-1 ${reportType === type.id ? 'text-[#00A99D]' : ''}`}>{type.name}</div>
                                        <div className="text-[10px] font-bold text-slate-500 tracking-widest">{type.description}</div>
                                    </div>
                                    {reportType === type.id && <div className="ml-auto w-6 h-6 rounded-full bg-[#00A99D] text-white flex items-center justify-center shadow-lg shadow-[#00A99D]/30 animate-in zoom-in-50"><CheckCircle2 size={12}/></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border rounded-2xl md:rounded-[2.5rem] p-5 md:p-8 lg:p-10 shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <h3 className="text-base md:text-xl font-black mb-5 md:mb-8 flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-500 text-white text-xs font-black">2</span>
                            {t('reports.step2')}
                        </h3>
                        <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black tracking-[0.2em] text-slate-400 mb-3 ml-2">
                                    {reportType.startsWith('school_') ? "Sélection de l'établissement" : t('vulnerability.select_beneficiary')}
                                </label>
                                <select value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)} 
                                    className="w-full p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-[#00A99D]/10 transition-all">
                                    <option value="">
                                        {reportType.startsWith('school_') ? "Choisir une école" : t('vulnerability.choose_pupil')}
                                    </option>
                                    {reportType.startsWith('school_') 
                                        ? schools.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)
                                        : pupils.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.cnive_id})</option>)
                                    }
                                </select>
                            </div>
                            <button onClick={handleGenerateReport} disabled={!selectedEntity || generating}
                                className="w-full py-5 text-white rounded-2xl font-black text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-4 shadow-2xl disabled:opacity-30 disabled:grayscale disabled:shadow-none active:scale-[0.98]"
                                style={{ 
                                    background: selectedEntity ? 'linear-gradient(135deg, #00A99D, #F39200)' : '#64748b',
                                    boxShadow: selectedEntity ? '0 15px 30px rgba(0, 169, 157, 0.3)' : 'none'
                                }}>
                                {generating ? <Loader2 className="animate-spin" size={20}/> : <Download size={20}/>}
                                {generating ? t('common.loading') : t('reports.pdf_download')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-8">
                    <div className="border rounded-2xl md:rounded-[2.5rem] p-5 md:p-8 lg:p-10 shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <h3 className="text-xs font-black tracking-widest text-slate-400 mb-8 flex items-center gap-3">
                            <Info size={18} className="text-[#00A99D]"/> {t('reports.specifications')}
                        </h3>
                        <div className="space-y-6">
                            <p className="text-sm font-bold text-slate-500 leading-relaxed italic">
                                "{t('reports.spec_desc')}"
                            </p>
                            <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                                <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1">{t('reports.format')}</p>
                                <p className="text-sm font-black text-[#F39200] tracking-tighter">{t('reports.hq_pdf')}</p>
                            </div>
                            <div className="p-6 bg-[#00A99D]/5 rounded-2xl border border-[#00A99D]/10">
                                <p className="text-[10px] font-black text-[#00A99D] tracking-widest mb-2">Identité visuelle</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#00A99D]" title="Nous cims teal"></div>
                                    <div className="w-6 h-6 rounded-full bg-[#F39200]" title="Nous cims orange"></div>
                                    <span className="text-[10px] font-bold text-slate-500">Fondation nous cims</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ReportsPage
