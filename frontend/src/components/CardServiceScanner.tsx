import React, { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import apiClient from '../api/client'
import { 
    QrCode, Camera, CheckCircle2, AlertCircle, Utensils, 
    Backpack, Stethoscope, CheckSquare, HeartHandshake, 
    RefreshCw, User, School, ShieldAlert
} from 'lucide-react'
import { getPupilPhotoUrl, handlePupilPhotoError } from '../utils/imageUtils'

interface ScannedPupil {
    id: string
    name: string
    cnive_id: string
    grade: string
    school_name: string
    photo_url: string | null
    cmu_enrolled: boolean
    vulnerability_level: string
}

interface ServiceScanResult {
    service_type: string
    service_label: string
    timestamp: string
    pupil: ScannedPupil
    message: string
}

interface RecentScan {
    id: string
    timestamp: string | null
    service_type: string
    service_label: string
    location: string
    pupil_name: string
    cnive_id: string
    grade: string | null
    photo_url: string | null
}

const SERVICES = [
    { id: 'CANTINE', label: 'Cantine scolaire', icon: Utensils, color: '#f59e0b', desc: 'Distribution de repas' },
    { id: 'KIT_SCOLAIRE', label: 'Kit fournitures', icon: Backpack, color: '#3b82f6', desc: 'Cahiers et uniforme' },
    { id: 'VISITE_SANTE', label: 'Visite santé', icon: Stethoscope, color: '#10b981', desc: 'Contrôle cmu et médical' },
    { id: 'POINTAGE', label: 'Pointage entrée', icon: CheckSquare, color: '#8b5cf6', desc: 'Présence établissement' },
    { id: 'AIDE_URGENCE', label: 'Aide d\'urgence', icon: HeartHandshake, color: '#ef4444', desc: 'Appui social immédiat' },
]

export const CardServiceScanner: React.FC = () => {
    const { colors } = useTheme()
    const [selectedService, setSelectedService] = useState('CANTINE')
    const [manualToken, setManualToken] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<ServiceScanResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [cameraActive, setCameraActive] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [recentScans, setRecentScans] = useState<RecentScan[]>([])

    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // Charger l'historique récent
    const fetchRecentScans = async () => {
        try {
            const res = await apiClient.get('/cards/services/recent?limit=10')
            setRecentScans(res.data || [])
        } catch (err) {
            console.error('Erreur chargement scans récents', err)
        }
    }

    useEffect(() => {
        fetchRecentScans()
    }, [])

    // Démarrer la caméra
    const startCamera = async () => {
        setCameraError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
                setCameraActive(true)
            }
        } catch (err: any) {
            console.warn('Accès caméra non autorisé ou non supporté:', err)
            setCameraError('Caméra non disponible ou accès refusé. Utilisez la saisie par matricule ci-dessous.')
            setCameraActive(false)
        }
    }

    // Arrêter la caméra
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
        setCameraActive(false)
    }

    useEffect(() => {
        return () => {
            stopCamera()
        }
    }, [])

    // Envoi de la validation du service
    const handleValidateService = async (token: string) => {
        if (!token.trim()) return
        setLoading(true)
        setError(null)
        try {
            const res = await apiClient.post('/cards/service-scan', {
                token: token.trim(),
                service_type: selectedService,
                device_info: 'Scanner Web Caméra CNIVE'
            })
            setResult(res.data)
            setManualToken('')
            fetchRecentScans()
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Échec de la validation de la carte.'
            setError(msg)
            setResult(null)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* 1. Sélecteur de Service */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                <div className="flex items-center gap-3 mb-4">
                    <div>
                        <h2 className="text-lg font-black tracking-tight">1. Choisir le service à délivrer</h2>
                        <p className="text-xs text-slate-400">Le scan appliquera automatiquement ce service au dossier de l'élève</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {SERVICES.map((s) => {
                        const Icon = s.icon
                        const isSelected = selectedService === s.id
                        return (
                            <button
                                key={s.id}
                                onClick={() => setSelectedService(s.id)}
                                className={`p-4 rounded-2xl border text-left transition-all ${
                                    isSelected 
                                        ? 'border-transparent text-white shadow-xl scale-[1.02]' 
                                        : 'border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-white/10'
                                }`}
                                style={{ backgroundColor: isSelected ? s.color : undefined }}
                            >
                                <Icon size={24} className={isSelected ? 'text-white' : undefined} style={{ color: !isSelected ? s.color : undefined }} />
                                <h3 className="font-black text-sm mt-3">{s.label}</h3>
                                <p className={`text-[11px] mt-0.5 line-clamp-1 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>{s.desc}</p>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 2. Scanner Caméra & Entrée Manuelle */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Boîte Caméra */}
                <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Camera size={20} className="text-emerald-500" />
                            <h3 className="font-black text-sm">Scanner par caméra (qr / nfc)</h3>
                        </div>
                        {cameraActive ? (
                            <button 
                                onClick={stopCamera}
                                className="px-3 py-1.5 text-xs font-bold bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20"
                            >
                                Éteindre la caméra
                            </button>
                        ) : (
                            <button 
                                onClick={startCamera}
                                className="px-3 py-1.5 text-xs font-bold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-md"
                            >
                                Activer la caméra
                            </button>
                        )}
                    </div>

                    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800">
                        <video 
                            ref={videoRef} 
                            playsInline 
                            muted 
                            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                        />
                        {!cameraActive && (
                            <div className="text-center p-6 text-slate-500">
                                <QrCode size={64} className="mx-auto mb-3 opacity-30" />
                                <p className="text-xs font-bold">Caméra en attente d'activation</p>
                                <p className="text-[10px] text-slate-600 mt-1">Autorisez la caméra pour scanner les qr codes sen-e-carte</p>
                            </div>
                        )}
                        {cameraActive && (
                            <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-2xl pointer-events-none flex items-center justify-center">
                                <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse" />
                            </div>
                        )}
                    </div>

                    {cameraError && (
                        <p className="text-xs text-amber-500 font-semibold mt-3 text-center">
                            ⚠️ {cameraError}
                        </p>
                    )}
                </div>

                {/* Saisie par Token ou CNIVE ID */}
                <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <QrCode size={20} className="text-sky-500" />
                            <h3 className="font-black text-sm">Saisie manuelle ou douchette code-barres</h3>
                        </div>
                        <p className="text-xs text-slate-400 mb-6">
                            Tapez le matricule cnive (ex: <code className="text-sky-400">CNIVE-2026-000001</code>) ou le code du qr token.
                        </p>

                        <form 
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleValidateService(manualToken)
                            }}
                            className="space-y-4"
                        >
                            <input
                                type="text"
                                value={manualToken}
                                onChange={(e) => setManualToken(e.target.value)}
                                placeholder="Entrer le jeton qr ou cnive id..."
                                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-sm tracking-wide focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />

                            <button
                                type="submit"
                                disabled={loading || !manualToken.trim()}
                                className="w-full py-3.5 px-4 rounded-2xl font-black text-xs tracking-wider text-white bg-sky-600 hover:bg-sky-500 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                Valider le service pour cet élève
                            </button>
                        </form>
                    </div>

                    {/* Résultat du Scan */}
                    {error && (
                        <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-3">
                            <AlertCircle size={20} className="flex-shrink-0" />
                            <p className="text-xs font-bold">{error}</p>
                        </div>
                    )}

                    {result && (
                        <div className="mt-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 size={20} className="text-emerald-500" />
                                <span className="font-black text-xs tracking-wider">Service validé !</span>
                            </div>
                            <div className="flex items-center gap-4 bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/20">
                                <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0 border border-emerald-500/30 relative flex items-center justify-center">
                                    <div className="w-full h-full flex items-center justify-center font-black text-white text-base bg-emerald-600 z-0">
                                        {result.pupil.name.charAt(0)}
                                    </div>
                                    {result.pupil.photo_url ? (
                                        <img 
                                            src={getPupilPhotoUrl(result.pupil.photo_url)} 
                                            alt={result.pupil.name} 
                                            className="w-full h-full object-cover absolute inset-0 z-10" 
                                            referrerPolicy="no-referrer"
                                            onError={(e) => handlePupilPhotoError(e, result.pupil.photo_url)}
                                        />
                                    ) : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-black text-sm text-white truncate">{result.pupil.name}</h4>
                                    <p className="text-[11px] font-mono text-emerald-300">{result.pupil.cnive_id} • {result.pupil.grade}</p>
                                    <p className="text-[11px] text-slate-300 truncate">🏫 {result.pupil.school_name}</p>
                                </div>
                            </div>
                            <p className="text-[11px] font-semibold text-emerald-300 mt-2">
                                ✅ {result.message}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Historique Récent des Prestations */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <CheckSquare size={20} className="text-sky-500" />
                        <h3 className="font-black text-sm">Historique des services validés aujourd'hui</h3>
                    </div>
                    <button 
                        onClick={fetchRecentScans}
                        className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                        title="Actualiser"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>

                {recentScans.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">Aucun service validé pour le moment aujourd'hui.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 tracking-wider text-[10px]">
                                    <th className="pb-3 font-black">Élève</th>
                                    <th className="pb-3 font-black">Matricule</th>
                                    <th className="pb-3 font-black">Classe</th>
                                    <th className="pb-3 font-black">Service</th>
                                    <th className="pb-3 font-black">Établissement</th>
                                    <th className="pb-3 font-black">Heure</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                                {recentScans.map((s) => (
                                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-3 font-bold text-white flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-black text-[10px]">
                                                {s.pupil_name.charAt(0)}
                                            </div>
                                            {s.pupil_name}
                                        </td>
                                        <td className="py-3 font-mono text-slate-300">{s.cnive_id}</td>
                                        <td className="py-3">{s.grade || '-'}</td>
                                        <td className="py-3">
                                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                                {s.service_label}
                                            </span>
                                        </td>
                                        <td className="py-3 text-slate-400 truncate max-w-[150px]">{s.location}</td>
                                        <td className="py-3 text-slate-400">
                                            {s.timestamp ? new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CardServiceScanner
