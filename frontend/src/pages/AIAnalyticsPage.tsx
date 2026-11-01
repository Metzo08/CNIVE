import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import apiClient from '../api/client'
import { useTranslation } from 'react-i18next'
import { 
    BrainCircuit, Target, BarChart3, Activity, AlertTriangle, 
    CheckCircle2, ChevronRight, Cpu, Sparkles, Loader2, Search, 
    X, TrendingUp, TrendingDown, Minus, ShieldAlert
} from 'lucide-react'

interface Pupil {
    id: string
    first_name: string
    last_name: string
    cnive_id: string
    grade?: string
}

interface PredictionResult {
    pupil_id: string
    pupil_name: string
    cnive_id?: string
    risk_score: number
    risk_level: string
    trajectory?: string
    factors: string[]
    recommendations: string[]
    alerts?: Record<string, string>
    vulnerability_classification?: string
    synthese_diagnostique?: string
    llm_provider?: string
    is_live_llm?: boolean
    latency_ms?: number
    signals?: {
        fev_total_score?: number
        absences_unjustified?: number
        academic_score?: number
        completed_interventions?: number
    }
}

interface DashboardData {
    total_pupils: number
    total_assessments: number
    at_risk_count: number
    classification_distribution: Record<string, number>
    dimension_averages: Record<string, number>
    interventions: {
        total: number
        completed: number
        success_rate: number
    }
}

const AIAnalyticsPage: React.FC = () => {
    const { t } = useTranslation()
    const { colors } = useTheme()
    const [loading, setLoading] = useState(true)
    const [analyzing, setAnalyzing] = useState(false)
    const [searchingPupils, setSearchingPupils] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState<Pupil[]>([])
    const [selectedPupilObj, setSelectedPupilObj] = useState<Pupil | null>(null)
    const [prediction, setPrediction] = useState<PredictionResult | null>(null)
    const [activeTab, setActiveTab] = useState<'dashboard' | 'predict' | 'batch'>('dashboard')
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
    const [batchResults, setBatchResults] = useState<any>(null)
    const [batchPage, setBatchPage] = useState(1)
    const batchLimit = 15
    const [riskFilter, setRiskFilter] = useState<string | null>(null)

    const formatLabel = (text: string) => {
        if (!text) return ""
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    }

    const dimLabels: Record<string, string> = {
        economic: formatLabel('Économique'),
        school: formatLabel('Scolaire'),
        health_nutrition: formatLabel('Santé & nutrition'),
        family_social: formatLabel('Familiale & sociale'),
        protection: formatLabel('Protection'),
        environmental: formatLabel('Environnementale')
    }

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await apiClient.get('/ai/dashboard')
                setDashboardData(res.data)
            } catch (error) {
                console.error('Error loading AI dashboard:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboard()
    }, [])

    // Recherche asynchrone d'élèves adaptée à 100 000+ dossiers (avec debounce)
    useEffect(() => {
        if (!searchTerm.trim() || searchTerm.length < 2) {
            setSearchResults([])
            return
        }

        const delayDebounce = setTimeout(async () => {
            setSearchingPupils(true)
            try {
                const res = await apiClient.get(`/pupils/?search=${encodeURIComponent(searchTerm)}&limit=8`)
                setSearchResults(Array.isArray(res.data) ? res.data : [])
            } catch (err) {
                setSearchResults([])
            } finally {
                setSearchingPupils(false)
            }
        }, 300)

        return () => clearTimeout(delayDebounce)
    }, [searchTerm])

    const handleSelectPupil = (p: Pupil) => {
        setSelectedPupilObj(p)
        setSearchTerm('')
        setSearchResults([])
        setPrediction(null)
    }

    const handlePredict = async () => {
        if (!selectedPupilObj) return
        setAnalyzing(true)
        setPrediction(null)
        try {
            const res = await apiClient.get(`/ai/predict/dropout/${selectedPupilObj.id}`)
            setPrediction(res.data)
        } catch (error) {
            console.error('Error generating AI prediction:', error)
        } finally { 
            setAnalyzing(false) 
        }
    }

    const handleBatchPredict = async () => {
        setAnalyzing(true)
        try {
            const res = await apiClient.get('/ai/predict/batch?limit=100')
            setBatchResults(res.data)
            setBatchPage(1)
            setRiskFilter(null)
        } catch (error) {
            console.error('Error in batch prediction:', error)
        } finally { 
            setAnalyzing(false) 
        }
    }

    const getRiskColor = (level: string) => {
        const upLevel = level?.toUpperCase() || ''
        if (upLevel === 'CRITICAL') return '#ef4444'
        if (upLevel === 'HIGH') return '#f97316'
        if (upLevel === 'MODERATE') return '#10b981'
        if (upLevel === 'LOW') return '#3b82f6'
        return '#64748b'
    }

    const getRiskLabel = (level: string) => {
        const upLevel = level?.toUpperCase() || ''
        if (upLevel === 'CRITICAL') return 'Critique'
        if (upLevel === 'HIGH') return 'Élevé'
        if (upLevel === 'MODERATE') return 'Modéré'
        if (upLevel === 'LOW') return 'Faible'
        return level || 'Inconnu'
    }

    const filteredPredictions = batchResults?.predictions?.filter((p: PredictionResult) => {
        if (!riskFilter) return true
        return p.risk_level === riskFilter
    }) || []

    const currentBatchPredictions = filteredPredictions.slice((batchPage - 1) * batchLimit, batchPage * batchLimit) || []
    const totalBatchPages = Math.ceil(filteredPredictions.length / batchLimit) || 1

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-0 pb-20">
            {/* Header Bannière IA */}
            <div className="relative overflow-hidden p-6 md:p-10 lg:p-12 rounded-3xl mb-6 md:mb-10 shadow-2xl shadow-primary-500/15"
                 style={{ background: 'linear-gradient(135deg, #00A99D 0%, #008f85 50%, #005c55 100%)' }}>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-8 text-center md:text-left">
                    <div className="w-16 h-16 md:w-22 md:h-22 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                        <BrainCircuit size={40} />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-black uppercase tracking-widest">
                                CNIVE Intelligence v2.5
                            </span>
                            <span className="text-white/80 text-xs font-bold">• Échelle FEV Multidimensionnelle</span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Multi-LLM : Groq + OpenRouter + xKiro
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-white tracking-tight mb-2">
                            Analyse Prédictive & Détection Précoce
                        </h1>
                        <p className="text-white/85 text-xs md:text-sm font-semibold max-w-2xl leading-relaxed">
                            Moteur multimodal évaluant en continu les 6 dimensions CDC F2.1, l'absentéisme réel et la dynamique d'intervention.
                        </p>
                    </div>
                </div>
            </div>

            {/* Onglets */}
            <div className="flex gap-2 mb-6 md:mb-8 overflow-x-auto pb-2 no-scrollbar">
                {[
                    { id: 'dashboard', label: 'Vue d\'ensemble analytique', shortLabel: 'Vue', icon: <BarChart3 size={16}/> },
                    { id: 'predict', label: 'Diagnostic individuel', shortLabel: 'Diagnostic', icon: <Target size={16}/> },
                    { id: 'batch', label: 'Scanner de cohorte (Masse)', shortLabel: 'Masse', icon: <Cpu size={16}/> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className="whitespace-nowrap px-4 sm:px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95"
                        style={
                            activeTab === tab.id 
                            ? { backgroundColor: colors.primary, color: '#ffffff', boxShadow: `0 8px 20px ${colors.primary}35` } 
                            : { backgroundColor: colors.card, borderColor: colors.border, color: colors.textSecondary, borderWidth: '1px' }
                        }
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.shortLabel}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-24 text-center">
                    <Loader2 className="animate-spin text-primary-500 mx-auto mb-4" size={42} />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Chargement du moteur IA...</p>
                </div>
            ) : activeTab === 'dashboard' ? (
                /* TAB 1: DASHBOARD ANALYTIQUE */
                <div className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-8">
                        {[
                            { label: 'Élèves actifs suivis', value: dashboardData?.total_pupils || 0, color: '#3b82f6', icon: <Activity/>, link: '/pupils' },
                            { label: 'Évaluations FEV validées', value: dashboardData?.total_assessments || 0, color: '#10b981', icon: <Target/>, link: '/vulnerability' },
                            { label: 'Cas en vigilance / critique', value: dashboardData?.at_risk_count || 0, color: '#ef4444', icon: <AlertTriangle/>, link: '/pupils?status=critical' },
                            { label: 'Taux de succès interventions', value: `${(dashboardData?.interventions?.success_rate || 0).toFixed(0)}%`, color: '#8b5cf6', icon: <CheckCircle2/>, link: '/interventions' }
                        ].map((stat, i) => (
                            <Link key={i} to={stat.link} className="block no-underline group">
                                <div className="p-5 md:p-7 rounded-3xl h-full relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border" 
                                     style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                    <div className="absolute top-4 right-4 opacity-15 group-hover:scale-120 transition-transform" style={{ color: stat.color }}>{stat.icon}</div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 leading-tight">{stat.label}</p>
                                    <p className="text-2xl md:text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
                        <div className="rounded-3xl p-6 md:p-8 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                            <h3 className="text-base md:text-lg font-black flex items-center gap-3 mb-6">
                                <BarChart3 size={20} style={{ color: colors.primary }}/> Répartition par niveau de risque FEV
                            </h3>
                            <div className="space-y-6">
                                {dashboardData?.classification_distribution && Object.entries(dashboardData.classification_distribution).map(([level, count]) => {
                                    const total = Object.values(dashboardData.classification_distribution).reduce((a, b) => a + b, 0)
                                    const percent = total > 0 ? (count / total * 100) : 0
                                    const color = getRiskColor(level)
                                    return (
                                        <Link key={level} to={`/pupils?status=${level.toLowerCase()}`} className="block group no-underline">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs font-black uppercase tracking-tight">{getRiskLabel(level)}</span>
                                                <span className="text-xs font-black" style={{ color }}>{count} ({percent.toFixed(0)}%)</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${percent}%`, backgroundColor: color }} />
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="rounded-3xl p-6 md:p-8 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                            <h3 className="text-base md:text-lg font-black flex items-center gap-3 mb-6">
                                <Sparkles size={20} style={{ color: colors.primary }}/> Score moyen des 6 dimensions (sur 20)
                            </h3>
                            <div className="space-y-6">
                                {dashboardData?.dimension_averages && Object.entries(dashboardData.dimension_averages).map(([dim, avg]) => {
                                    const percent = Math.min(100, Math.max(0, ((avg - 5) / 15) * 100))
                                    const color = avg >= 15 ? '#ef4444' : avg >= 10 ? '#f59e0b' : '#3b82f6'
                                    return (
                                        <div key={dim}>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs font-black uppercase tracking-tight">{dimLabels[dim] || dim}</span>
                                                <span className="text-xs font-black">{avg.toFixed(1)} / 20</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${percent}%`, backgroundColor: color }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'predict' ? (
                /* TAB 2: DIAGNOSTIC INDIVIDUEL ADAPTÉ À 100K+ ÉLÈVES */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8 animate-in fade-in duration-300">
                    <div className="lg:col-span-1 border rounded-3xl p-6 md:p-8 h-fit" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <h3 className="text-base font-black uppercase tracking-wider mb-5 flex items-center gap-2">
                            <Target size={18} style={{ color: colors.primary }}/> Sélection de l'Élève
                        </h3>

                        {/* Recherche dynamique asynchrone */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Rechercher par nom ou CNIVE ID
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Tapez au moins 2 caractères..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-4 py-3.5 pl-10 border rounded-2xl outline-none font-bold text-sm focus:ring-4 focus:ring-primary-500/10 transition-all"
                                        style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }}
                                    />
                                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    {searchingPupils && (
                                        <Loader2 size={16} className="animate-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-primary-500" />
                                    )}
                                </div>
                            </div>

                            {/* Liste déroulante des résultats de recherche */}
                            {searchResults.length > 0 && (
                                <div className="border rounded-2xl overflow-hidden divide-y shadow-lg max-h-60 overflow-y-auto" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                    {searchResults.map((p) => (
                                        <div
                                            key={p.id}
                                            onClick={() => handleSelectPupil(p)}
                                            className="p-3 hover:bg-primary-500/10 cursor-pointer transition-colors flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="text-xs font-black">{p.first_name} {p.last_name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">{p.cnive_id} {p.grade ? `• ${p.grade}` : ''}</p>
                                            </div>
                                            <span className="text-[9px] font-black uppercase text-primary-600 px-2 py-0.5 rounded-md bg-primary-500/10">
                                                Choisir
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Élève actuellement sélectionné */}
                            {selectedPupilObj && (
                                <div className="p-4 rounded-2xl border flex items-center justify-between animate-in fade-in" style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs" style={{ backgroundColor: colors.primary }}>
                                            {selectedPupilObj.first_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black">{selectedPupilObj.first_name} {selectedPupilObj.last_name}</p>
                                            <p className="text-[10px] font-bold text-slate-500">{selectedPupilObj.cnive_id}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedPupilObj(null); setPrediction(null); }}
                                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400"
                                        title="Désélectionner"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handlePredict}
                                disabled={!selectedPupilObj || analyzing}
                                className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2.5 text-white shadow-xl mt-4"
                                style={{ background: selectedPupilObj ? 'linear-gradient(135deg, #00A99D, #008f85)' : '#64748b' }}
                            >
                                {analyzing ? <Loader2 className="animate-spin" size={16}/> : <BrainCircuit size={16}/>}
                                {analyzing ? 'Calcul en cours...' : 'Générer le diagnostic IA'}
                            </button>
                        </div>
                    </div>

                    {/* Zone de résultat du diagnostic */}
                    <div className="lg:col-span-2 border rounded-3xl p-6 md:p-8 min-h-[380px] flex flex-col justify-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        {prediction ? (
                            <div className="animate-in zoom-in-95 duration-400 space-y-8">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b" style={{ borderColor: colors.border }}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-xl font-black">{prediction.pupil_name}</h3>
                                            {prediction.cnive_id && (
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500">
                                                    {prediction.cnive_id}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 font-bold">Rapport d'analyse multidimensionnelle généré par l'IA</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-wider border"
                                              style={{ 
                                                  backgroundColor: getRiskColor(prediction.risk_level) + '15', 
                                                  color: getRiskColor(prediction.risk_level), 
                                                  borderColor: getRiskColor(prediction.risk_level) + '30' 
                                              }}>
                                            Niveau : {getRiskLabel(prediction.risk_level)}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                    {/* Jauge Risque Circulaire */}
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="relative w-40 h-40">
                                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="42" fill="none" className="stroke-slate-100 dark:stroke-white/5" strokeWidth="8" />
                                                <circle 
                                                    cx="50" cy="50" r="42" fill="none" 
                                                    stroke={getRiskColor(prediction.risk_level)} 
                                                    strokeWidth="8" 
                                                    strokeDasharray={`${prediction.risk_score * 2.64} 264`} 
                                                    strokeLinecap="round" 
                                                    transform="rotate(-90 50 50)"
                                                    className="transition-all duration-1000 ease-out"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-4xl font-black" style={{ color: getRiskColor(prediction.risk_level) }}>
                                                    {prediction.risk_score}%
                                                </span>
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Risque Décrochage</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Signaux de terrain multimodaux */}
                                    <div className="md:col-span-2 grid grid-cols-2 gap-3">
                                        <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                            <p className="text-[9px] font-black uppercase text-slate-400">Score FEV</p>
                                            <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                                                {prediction.signals?.fev_total_score ? `${prediction.signals.fev_total_score} / 120` : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                            <p className="text-[9px] font-black uppercase text-slate-400">Absences non justifiées</p>
                                            <p className="text-lg font-black" style={{ color: (prediction.signals?.absences_unjustified || 0) >= 5 ? '#ef4444' : '#10b981' }}>
                                                {prediction.signals?.absences_unjustified ?? 0} jour(s)
                                            </p>
                                        </div>
                                        <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                            <p className="text-[9px] font-black uppercase text-slate-400">Moyenne académique</p>
                                            <p className="text-lg font-black">
                                                {prediction.signals?.academic_score != null ? `${prediction.signals.academic_score.toFixed(1)} / 20` : 'Non renseignée'}
                                            </p>
                                        </div>
                                        <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                            <p className="text-[9px] font-black uppercase text-slate-400">Trajectoire</p>
                                            <div className="flex items-center gap-1.5 mt-0.5 font-black text-sm">
                                                {prediction.trajectory === 'AMELIORATION' && <><TrendingDown size={18} className="text-emerald-500"/> En progrès</>}
                                                {prediction.trajectory === 'AGGRAVATION' && <><TrendingUp size={18} className="text-red-500"/> En hausse</>}
                                                {(!prediction.trajectory || prediction.trajectory === 'STABLE') && <><Minus size={18} className="text-blue-500"/> Stable</>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Synthèse Psychosociale IA & Modèle actif */}
                                {prediction.synthese_diagnostique && (
                                    <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 via-emerald-500/10 to-transparent border border-sky-500/25 space-y-2">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                                                <Sparkles size={14} className="text-amber-400 animate-pulse" /> Expertise Diagnostique Psychosociale
                                            </span>
                                            {prediction.llm_provider && (
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                                    ⚡ Modèle actif : {prediction.llm_provider} {prediction.latency_ms ? `(${prediction.latency_ms} ms)` : ''}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs md:text-sm font-semibold leading-relaxed text-slate-200">
                                            {prediction.synthese_diagnostique}
                                        </p>
                                    </div>
                                )}

                                {/* Facteurs et Recommandations */}
                                <div className="space-y-4 pt-4 border-t" style={{ borderColor: colors.border }}>
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Facteurs prédominants détectés</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {prediction.factors.map((f, i) => (
                                                <span key={i} className="px-3.5 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-black">
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Plan d'action préconisé par l'IA</h4>
                                        <div className="space-y-2.5">
                                            {prediction.recommendations.map((r, i) => (
                                                <div key={i} className="p-3.5 rounded-2xl text-xs font-bold flex items-center gap-3 border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0"/> {r}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 opacity-35">
                                <BrainCircuit size={64} className="mx-auto mb-4" />
                                <p className="text-lg font-black">Prêt pour le diagnostic</p>
                                <p className="text-xs font-semibold max-w-sm mx-auto mt-1 text-slate-400">
                                    Recherchez un élève dans le panneau de gauche pour calculer en temps réel son indice de risque.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* TAB 3: SCANNER DE MASSE AVEC PAGINATION */
                <div className="border rounded-3xl p-6 md:p-10 animate-in fade-in duration-300" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b" style={{ borderColor: colors.border }}>
                        <div>
                            <h3 className="text-xl font-black">Scanner Global de Risque</h3>
                            <p className="text-slate-400 font-bold text-xs">Analyse batch paginée et optimisée pour de grands volumes d'élèves.</p>
                        </div>
                        <button
                            onClick={handleBatchPredict}
                            disabled={analyzing}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all active:scale-95 shadow-xl shadow-primary-500/25 flex items-center gap-2.5 disabled:opacity-50"
                        >
                            {analyzing ? <Loader2 className="animate-spin" size={16}/> : <Cpu size={16}/>}
                            {analyzing ? 'Analyse en cours...' : 'Lancer le scan de cohorte'}
                        </button>
                    </div>

                    {batchResults ? (
                        <div className="space-y-6">
                            {/* Filtres de niveau */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { id: null, label: 'Tous', value: batchResults.batch_analyzed, color: '#3b82f6' },
                                    { id: 'CRITICAL', label: 'Critiques', value: batchResults.global_distribution?.CRITICAL || 0, color: '#ef4444' },
                                    { id: 'HIGH', label: 'Élevés', value: batchResults.global_distribution?.HIGH || 0, color: '#f97316' },
                                    { id: 'MODERATE', label: 'Modérés', value: batchResults.global_distribution?.MODERATE || 0, color: '#10b981' }
                                ].map((stat, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => { setRiskFilter(stat.id); setBatchPage(1); }}
                                        className="p-4 rounded-2xl border text-center transition-all cursor-pointer"
                                        style={
                                            riskFilter === stat.id 
                                            ? { backgroundColor: `${colors.primary}15`, borderColor: colors.primary } 
                                            : { backgroundColor: colors.bg, borderColor: colors.border }
                                        }
                                    >
                                        <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                                        <p className="text-[10px] font-black uppercase text-slate-400 mt-0.5">{stat.label}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Liste des résultats */}
                            <div className="space-y-3">
                                {currentBatchPredictions.length === 0 ? (
                                    <p className="py-8 text-center text-xs text-slate-400 font-bold">Aucun élève ne correspond au filtre sélectionné.</p>
                                ) : (
                                    currentBatchPredictions.map((pred: PredictionResult, i: number) => (
                                        <Link key={i} to={`/pupils/${pred.pupil_id}`} className="block no-underline">
                                            <div className="p-4 md:p-5 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md"
                                                 style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                                <div>
                                                    <h4 className="text-sm font-black">{pred.pupil_name}</h4>
                                                    <p className="text-xs text-slate-400 font-semibold truncate max-w-xl">
                                                        {pred.factors.slice(0, 2).join(' • ')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <span className="text-xl font-black" style={{ color: getRiskColor(pred.risk_level) }}>{pred.risk_score}%</span>
                                                        <span className="text-[9px] uppercase font-black text-slate-400 block">Risque</span>
                                                    </div>
                                                    <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider min-w-[90px] text-center"
                                                          style={{ backgroundColor: getRiskColor(pred.risk_level) + '15', color: getRiskColor(pred.risk_level) }}>
                                                        {getRiskLabel(pred.risk_level)}
                                                    </span>
                                                    <ChevronRight size={18} className="text-slate-400" />
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>

                            {/* Pagination */}
                            {totalBatchPages > 1 && (
                                <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: colors.border }}>
                                    <button 
                                        disabled={batchPage === 1}
                                        onClick={() => setBatchPage(p => Math.max(1, p - 1))}
                                        className="px-4 py-2 border rounded-xl text-xs font-black disabled:opacity-30"
                                        style={{ borderColor: colors.border }}
                                    >
                                        Précédent
                                    </button>
                                    <span className="text-xs font-black text-slate-400">
                                        Page {batchPage} / {totalBatchPages}
                                    </span>
                                    <button 
                                        disabled={batchPage === totalBatchPages}
                                        onClick={() => setBatchPage(p => Math.min(totalBatchPages, p + 1))}
                                        className="px-4 py-2 border rounded-xl text-xs font-black disabled:opacity-30"
                                        style={{ borderColor: colors.border }}
                                    >
                                        Suivant
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-16 text-center opacity-35">
                            <Cpu size={60} className="mx-auto mb-3"/>
                            <p className="text-base font-black">Scanner prêt pour analyse</p>
                            <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto mt-1">
                                Lancez le scan pour évaluer automatiquement les élèves actifs de votre base.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default AIAnalyticsPage
