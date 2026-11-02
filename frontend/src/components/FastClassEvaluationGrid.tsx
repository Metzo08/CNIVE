import React, { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'
import { 
    Users, Save, CheckCircle2, AlertTriangle, 
    RefreshCw, BookOpen, Layers
} from 'lucide-react'
import { getPupilPhotoUrl, handlePupilPhotoError } from '../utils/imageUtils'

interface Pupil {
    id: string
    cnive_id: string
    first_name: string
    last_name: string
    grade: string | null
    photo_url: string | null
}

interface PupilDraftScore {
    economic: number
    school: number
    health_nutrition: number
    family_social: number
    protection: number
    environmental: number
    comments?: string
}

export const FastClassEvaluationGrid: React.FC = () => {
    const { colors } = useTheme()
    const { user } = useAuth()
    const [pupils, setPupils] = useState<Pupil[]>([])
    const [grades, setGrades] = useState<string[]>([])
    const [selectedGrade, setSelectedGrade] = useState<string>('')
    const [evaluations, setEvaluations] = useState<Record<string, PupilDraftScore>>({})
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Charger les élèves autorisés
    useEffect(() => {
        setLoading(true)
        apiClient.get('/pupils/?limit=3000')
            .then(res => {
                const list: Pupil[] = Array.isArray(res.data) ? res.data : (res.data?.pupils || [])
                setPupils(list)

                // Extraire les classes uniques
                const uniqueGrades = Array.from(new Set(list.map(p => p.grade).filter(Boolean))) as string[]
                uniqueGrades.sort()
                setGrades(uniqueGrades)

                // Si enseignant avec classe définie, pré-sélectionner sa classe
                if (user?.grade && uniqueGrades.includes(user.grade)) {
                    setSelectedGrade(user.grade)
                } else if (uniqueGrades.length > 0) {
                    setSelectedGrade(uniqueGrades[0])
                }
            })
            .catch(err => {
                console.error(err)
                setErrorMsg("Erreur lors du chargement des élèves.")
            })
            .finally(() => setLoading(false))
    }, [user])

    const classPupils = pupils.filter(p => p.grade === selectedGrade)

    // Initialiser les scores pour les élèves de la classe
    useEffect(() => {
        const initial: Record<string, PupilDraftScore> = {}
        classPupils.forEach(p => {
            if (!evaluations[p.id]) {
                initial[p.id] = {
                    economic: 5,
                    school: 5,
                    health_nutrition: 5,
                    family_social: 5,
                    protection: 5,
                    environmental: 5,
                    comments: ''
                }
            }
        })
        if (Object.keys(initial).length > 0) {
            setEvaluations(prev => ({ ...prev, ...initial }))
        }
    }, [selectedGrade, classPupils.length])

    // Appliquer un preset de risque rapide
    const applyPreset = (pupilId: string, level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL') => {
        const valMap = {
            LOW: 5,       // Total 30 (Faible)
            MODERATE: 10, // Total 60 (Modéré)
            HIGH: 14,     // Total 84 (Élevé)
            CRITICAL: 18  // Total 108 (Critique)
        }
        const val = valMap[level]
        setEvaluations(prev => ({
            ...prev,
            [pupilId]: {
                economic: val,
                school: val,
                health_nutrition: val,
                family_social: val,
                protection: val,
                environmental: val,
                comments: prev[pupilId]?.comments || ''
            }
        }))
    }

    const calculateTotal = (scores?: PupilDraftScore) => {
        if (!scores) return 30
        return scores.economic + scores.school + scores.health_nutrition + 
               scores.family_social + scores.protection + scores.environmental
    }

    const getPill = (total: number) => {
        if (total <= 45) return { label: 'Faible', color: '#10b981', bg: '#10b98115' }
        if (total <= 75) return { label: 'Modéré', color: '#3b82f6', bg: '#3b82f615' }
        if (total <= 105) return { label: 'Élevé', color: '#f97316', bg: '#f9731615' }
        return { label: 'Critique', color: '#ef4444', bg: '#ef444415' }
    }

    // Soumettre la campagne en masse
    const handleSubmitBatch = async () => {
        if (classPupils.length === 0) return
        setSubmitting(true)
        setSuccessMsg(null)
        setErrorMsg(null)

        try {
            const batchItems = classPupils.map(p => ({
                pupil_id: p.id,
                scores: evaluations[p.id] || {
                    economic: 5, school: 5, health_nutrition: 5, 
                    family_social: 5, protection: 5, environmental: 5
                },
                comments: evaluations[p.id]?.comments || `Campagne classe ${selectedGrade}`
            }))

            const res = await apiClient.post('/vulnerabilities/batch-assess', {
                assessments: batchItems
            })

            setSuccessMsg(`Succès : ${res.data.count} évaluations enregistrées pour la classe ${selectedGrade} !`)
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || "Erreur lors de l'enregistrement de la campagne.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header sélecteur de classe */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <BookOpen size={24} className="text-[#00A99D]" />
                    <div>
                        <h2 className="text-base font-black tracking-tight">Campagne d'évaluation par classe</h2>
                        <p className="text-xs text-slate-400">Évaluez l'ensemble des élèves de la classe en grille rapide</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Classe :</span>
                    <select
                        value={selectedGrade}
                        onChange={e => setSelectedGrade(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold text-xs focus:ring-2 focus:ring-[#00A99D]"
                    >
                        {grades.map(g => (
                            <option key={g} value={g}>Classe : {g}</option>
                        ))}
                    </select>
                </div>
            </div>

            {successMsg && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-2">
                    <CheckCircle2 size={18} /> {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center gap-2">
                    <AlertTriangle size={18} /> {errorMsg}
                </div>
            )}

            {/* Table des élèves */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400">
                        {classPupils.length} élèves dans la classe <strong className="text-white">{selectedGrade}</strong>
                    </span>
                    <button
                        onClick={handleSubmitBatch}
                        disabled={submitting || classPupils.length === 0}
                        className="px-5 py-2.5 rounded-xl bg-[#00A99D] hover:bg-[#008f85] text-white font-black text-xs tracking-wider flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all active:scale-95"
                    >
                        {submitting ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                        Enregistrer la classe ({classPupils.length})
                    </button>
                </div>

                {classPupils.length === 0 ? (
                    <p className="text-xs text-slate-500 py-10 text-center">Aucun élève trouvé pour cette classe.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 text-[10px] tracking-wider">
                                    <th className="pb-3 font-black">Élève</th>
                                    <th className="pb-3 font-black">Matricule</th>
                                    <th className="pb-3 font-black">Presets rapides</th>
                                    <th className="pb-3 font-black text-center">Score fev</th>
                                    <th className="pb-3 font-black text-right">Diagnostic</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/40 dark:divide-white/5">
                                {classPupils.map(p => {
                                    const sc = evaluations[p.id]
                                    const total = calculateTotal(sc)
                                    const pill = getPill(total)
                                    return (
                                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-3 font-bold text-white flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700 relative flex items-center justify-center">
                                                    <div className="w-full h-full flex items-center justify-center font-black text-[11px] text-white bg-slate-700 z-0">
                                                        {p.first_name.charAt(0)}
                                                    </div>
                                                    {p.photo_url ? (
                                                        <img 
                                                            src={getPupilPhotoUrl(p.photo_url)} 
                                                            alt={p.first_name} 
                                                            className="w-full h-full object-cover absolute inset-0 z-10" 
                                                            referrerPolicy="no-referrer"
                                                            onError={(e) => handlePupilPhotoError(e, p.photo_url)}
                                                        />
                                                    ) : null}
                                                </div>
                                                <span className="truncate">{p.first_name} {p.last_name}</span>
                                            </td>
                                            <td className="py-3 font-mono text-slate-400">{p.cnive_id}</td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <button 
                                                        onClick={() => applyPreset(p.id, 'LOW')}
                                                        className="px-2 py-1 rounded-md text-[10px] font-black border transition-all hover:scale-105"
                                                        style={{ backgroundColor: '#10b98115', borderColor: '#10b98140', color: '#10b981' }}
                                                    >
                                                        Faible
                                                    </button>
                                                    <button 
                                                        onClick={() => applyPreset(p.id, 'MODERATE')}
                                                        className="px-2 py-1 rounded-md text-[10px] font-black border transition-all hover:scale-105"
                                                        style={{ backgroundColor: '#3b82f615', borderColor: '#3b82f640', color: '#3b82f6' }}
                                                    >
                                                        Modéré
                                                    </button>
                                                    <button 
                                                        onClick={() => applyPreset(p.id, 'HIGH')}
                                                        className="px-2 py-1 rounded-md text-[10px] font-black border transition-all hover:scale-105"
                                                        style={{ backgroundColor: '#f9731615', borderColor: '#f9731640', color: '#f97316' }}
                                                    >
                                                        Élevé
                                                    </button>
                                                    <button 
                                                        onClick={() => applyPreset(p.id, 'CRITICAL')}
                                                        className="px-2 py-1 rounded-md text-[10px] font-black border transition-all hover:scale-105"
                                                        style={{ backgroundColor: '#ef444415', borderColor: '#ef444440', color: '#ef4444' }}
                                                    >
                                                        Critique
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3 text-center font-black font-mono text-sm">
                                                {total}<span className="text-[10px] text-slate-500 font-normal">/120</span>
                                            </td>
                                            <td className="py-3 text-right">
                                                <span 
                                                    className="px-2.5 py-1 rounded-lg font-black text-[10px] border tracking-wider"
                                                    style={{ backgroundColor: pill.bg, borderColor: `${pill.color}40`, color: pill.color }}
                                                >
                                                    {pill.label}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default FastClassEvaluationGrid
