import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import apiClient from '../api/client'
import { useTranslation } from 'react-i18next'
import { 
    Users, AlertCircle, Activity, CreditCard, 
    BarChart3, Zap, Map, Stethoscope, Plus, 
    LayoutDashboard, School, BrainCircuit, Info 
} from 'lucide-react'

interface Stats {
    totalPupils: number
    criticalCases: number
    highCases: number
    moderateCases: number
    lowCases: number
    totalInterventions: number
    schools: number
    cards: number
}

interface RecentActivity {
    id: string
    type: string
    message: string
    time: string
    icon: React.ReactNode
    pupil_id?: string
}

interface StatsError {
    pupils?: boolean
    vulnerabilities?: boolean
    schools?: boolean
    cards?: boolean
    interventions?: boolean
}

const Dashboard: React.FC = () => {
    const { t } = useTranslation()
    const { colors } = useTheme()
    const [stats, setStats] = useState<Stats>({
        totalPupils: 0, criticalCases: 0, highCases: 0, moderateCases: 0, lowCases: 0,
        totalInterventions: 0, schools: 0, cards: 0
    })
    const [errors, setErrors] = useState<StatsError>({})
    const [loading, setLoading] = useState(true)
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])

    const formatLabel = (text: string) => {
        if (!text) return ""
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pupilsRes, vulnRes, schoolsRes, cardsRes, interventionsRes] = await Promise.allSettled([
                    apiClient.get('/pupils/count'),
                    apiClient.get('/vulnerabilities/stats/overview'),
                    apiClient.get('/schools/count'),
                    apiClient.get('/cards/stats'),
                    apiClient.get('/interventions/stats')
                ])

                const getData = (res: any) => res.status === 'fulfilled' ? res.value.data : {}

                const pupilsData = getData(pupilsRes)
                const vulnData = getData(vulnRes)
                const schoolsData = getData(schoolsRes)
                const cardsData = getData(cardsRes)
                const interventionsData = getData(interventionsRes)

                setErrors({
                    pupils: pupilsRes.status === 'rejected',
                    vulnerabilities: vulnRes.status === 'rejected',
                    schools: schoolsRes.status === 'rejected',
                    cards: cardsRes.status === 'rejected',
                    interventions: interventionsRes.status === 'rejected'
                })

                const newStats = {
                    totalPupils: Number(pupilsData?.count || 0),
                    criticalCases: Number(vulnData?.by_classification?.CRITICAL || 0),
                    highCases: Number(vulnData?.by_classification?.HIGH || 0),
                    moderateCases: Number(vulnData?.by_classification?.MODERATE || 0),
                    lowCases: Number(vulnData?.by_classification?.LOW || 0),
                    totalInterventions: Number(interventionsData?.total || 0),
                    schools: Number(schoolsData?.count || 0),
                    cards: Number(cardsData?.total_cards || 0)
                }
                setStats(newStats)

                const activities: RecentActivity[] = []
                if (newStats.criticalCases > 0) {
                    activities.push({ 
                        id: '1', 
                        type: 'alert', 
                        message: `${newStats.criticalCases} ${formatLabel(t('dashboard.activity.critical_alert'))}`, 
                        time: formatLabel(t('dashboard.activity.now')), 
                        icon: <AlertCircle className="text-red-500" /> 
                    })
                }
                activities.push({ 
                    id: '3', 
                    type: 'system', 
                    message: formatLabel(t('dashboard.activity.system_ok')), 
                    time: formatLabel(t('dashboard.activity.online')), 
                    icon: <Zap className="text-emerald-500" /> 
                })
                setRecentActivity(activities)

            } catch (error) {
                console.error('Error fetching dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [t])

    const mainCards = [
        { title: formatLabel(t('dashboard.stats.total_pupils')), value: stats.totalPupils, icon: <Users size={24} />, link: '/pupils', color: colors.primary, bg: `${colors.primary}10`, hasError: errors.pupils },
        { title: formatLabel(t('dashboard.stats.vulnerable')), value: stats.criticalCases, icon: <AlertCircle size={24} />, link: '/pupils?status=critical', color: '#ef4444', bg: '#ef444410', hasError: errors.vulnerabilities },
        { title: formatLabel(t('dashboard.stats.interventions')), value: stats.totalInterventions, icon: <Activity size={24} />, link: '/interventions', color: '#f59e0b', bg: '#f59e0b10', hasError: errors.interventions },
        { title: formatLabel(t('dashboard.stats.schools')), value: stats.schools, icon: <School size={24} />, link: '/map', color: colors.accent, bg: `${colors.accent}10`, hasError: errors.schools }
    ]

    const vulnerabilityTotal = stats.criticalCases + stats.highCases + stats.moderateCases + stats.lowCases

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 md:mb-10">
                <p className="text-[10px] tracking-[0.2em] font-black text-slate-500 mb-1">{formatLabel(t('dashboard.location'))}</p>
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tighter mb-2">{formatLabel(t('dashboard.title'))}</h1>
                <p className="text-slate-500 font-medium text-sm md:text-base">{t('dashboard.subtitle', { count: stats.totalPupils })}</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
                {mainCards.map((card, i) => (
                    <Link key={i} to={card.link} className="block no-underline group h-full">
                        <div className="p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-[2.5rem] h-full border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary-500/5 relative overflow-hidden shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                            <div className="absolute top-4 right-4 md:top-6 md:right-6 opacity-20 group-hover:scale-125 transition-transform" style={{ color: card.color }}>{card.icon}</div>
                            <p className="text-[9px] md:text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 mb-2 md:mb-4 leading-tight">{card.title}</p>
                            <div className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter" style={{ color: card.color }}>
                                {loading ? '...' : (card.hasError ? <span className="text-sm md:text-lg font-bold text-red-500 flex items-center gap-1"><AlertCircle size={16} /> Err.</span> : card.value)}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                <div className="lg:col-span-2 rounded-2xl md:rounded-[3rem] p-5 md:p-8 lg:p-12 border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <div className="flex justify-between items-start md:items-end mb-6 md:mb-12">
                        <div>
                            <h3 className="text-base md:text-xl font-black tracking-tight mb-1 text-slate-800 dark:text-white">{formatLabel(t('dashboard.sections.vulnerability'))}</h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest">{formatLabel(t('dashboard.sections.distribution'))}</p>
                        </div>
                        <Link to="/vulnerability" className="text-[10px] font-black tracking-widest text-primary-500 hover:underline shrink-0 ml-4">{formatLabel(t('common.view_all'))}</Link>
                    </div>

                    {errors.vulnerabilities ? (
                        <div className="text-center py-10 text-red-500 font-semibold flex flex-col items-center justify-center gap-2">
                            <AlertCircle size={36} className="text-red-500 animate-pulse" />
                            <span>Erreur lors du chargement des données de vulnérabilité</span>
                        </div>
                    ) : (
                        <div className="space-y-8">
                        {vulnerabilityTotal === 0 && (
                            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 text-xs font-semibold flex items-center gap-3">
                                <Info size={20} className="shrink-0" />
                                <span>Cohorte pilote active (1 478 élèves). les évaluations fev débuteront dès la validation définitive de la grille ministérielle.</span>
                            </div>
                        )}
                        {[
                            { label: t('vulnerability.levels.critical'), count: stats.criticalCases, color: '#ef4444' },
                            { label: t('vulnerability.levels.high'), count: stats.highCases, color: '#f97316' },
                            { label: t('vulnerability.levels.moderate'), count: stats.moderateCases, color: '#f59e0b' },
                            { label: t('vulnerability.levels.low'), count: stats.lowCases, color: '#10b981' }
                        ].map((level, i) => {
                            const percent = vulnerabilityTotal > 0 ? (level.count / vulnerabilityTotal * 100) : 0
                            return (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-black tracking-tight text-slate-700 dark:text-slate-200">{formatLabel(level.label)}</span>
                                        <span className="text-sm font-black" style={{ color: level.color }}>{level.count} ({percent.toFixed(0)}%)</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%`, backgroundColor: level.color }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    )}
                </div>

                <div className="lg:col-span-1 rounded-2xl md:rounded-[3rem] p-5 md:p-8 lg:p-12 border shadow-sm flex flex-col" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <h3 className="text-base md:text-xl font-black tracking-tight mb-6 md:mb-10 text-slate-800 dark:text-white">{formatLabel(t('dashboard.sections.activity'))}</h3>
                    <div className="space-y-4 md:space-y-6 flex-1">
                        {recentActivity.map((activity) => (
                            <div key={activity.id} className="flex gap-4 group cursor-pointer transition-all">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    {activity.icon}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight mb-1">{formatLabel(activity.message)}</p>
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-500">{formatLabel(activity.time)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
