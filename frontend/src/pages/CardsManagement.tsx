import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'
import {
    PieChart, Pie, Cell, BarChart, Bar, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { CreditCard, QrCode, Activity, Users, User, MapPin, Plus, History, BarChart3, Download, Printer, Eye, Smartphone, ShieldCheck, X, ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react'
import CardServiceScanner from '../components/CardServiceScanner'
import PupilIdCard from '../components/PupilIdCard'

// Custom marker icon for Leaflet
const createIcon = (color: string) => L.divIcon({
    html: `
        <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
            <div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); position: absolute; bottom: 4px; right: 4px; z-index: 2;"></div>
            <svg width="32" height="32" viewBox="0 0 24 24" style="z-index: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); fill: #1e293b !important; stroke: white !important; stroke-width: 0.5px;">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" style="fill: #1e293b !important;"></path>
                <circle cx="12" cy="7" r="4" style="fill: #1e293b !important;"></circle>
            </svg>
        </div>`,
    className: 'custom-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21]
});

interface Pupil {
    id: string
    cnive_id: string
    first_name: string
    last_name: string
}

interface Card {
    id: string
    pupil_id: string
    cnive_id: string
    pupil_name: string
    qr_url: string
    qr_image_base64: string
    status: string
    created_at: string
}

interface QRStats {
    total_scans: number
    total_cards: number
    active_cards: number
    scans_by_role: { [key: string]: number }
    scans_by_day: { date: string, count: number }[]
    top_locations: { name: string, count: number }[]
    device_stats: { device: string, count: number }[]
    hourly_stats: { hour: number, count: number }[]
    scan_locations: { lat: number, lon: number, pupil_name: string, role: string, timestamp: string }[]
}

const useContainerWidth = (ref: React.RefObject<HTMLDivElement | null>) => {
    const [width, setWidth] = useState(0)

    useEffect(() => {
        if (!ref.current) return
        const observer = new ResizeObserver(entries => {
            if (entries[0]) {
                setWidth(entries[0].contentRect.width)
            }
        })
        observer.observe(ref.current)
        return () => observer.disconnect()
    }, [ref])

    return width
}

const CardsManagement: React.FC = () => {
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const pupilParam = searchParams.get('pupil')

    const barChartContainerRef = useRef<HTMLDivElement>(null)
    const pieChartContainerRef = useRef<HTMLDivElement>(null)
    const barChartWidth = useContainerWidth(barChartContainerRef) || 320
    const pieChartWidth = useContainerWidth(pieChartContainerRef) || 320
    const { colors } = useTheme()
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('overview')
    const [pupils, setPupils] = useState<Pupil[]>([])
    const [selectedPupil, setSelectedPupil] = useState(pupilParam || '')
    const [generatedCard, setGeneratedCard] = useState<Card | null>(null)
    const [cards, setCards] = useState<Card[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCards, setTotalCards] = useState(0)
    const pageSize = 25
    const [logoPreview] = useState<string>('')
    const [qrColor, setQrColor] = useState('#000000')
    const [qrBgColor, setQrBgColor] = useState('#ffffff')
    const [selectedPupilAnalytics, setSelectedPupilAnalytics] = useState<any | null>(null)
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
    const [showRecentScansModal, setShowRecentScansModal] = useState(false)
    const [showRolesModal, setShowRolesModal] = useState(false)
    const [showDigitalCard, setShowDigitalCard] = useState(false)
    const [cardPreviewSide, setCardPreviewSide] = useState<'recto' | 'verso' | 'both'>('recto')
    const [selectedPupilDetails, setSelectedPupilDetails] = useState<any | null>(null)
    const [recentScans] = useState<any[]>([])
    const [selectedCardsToPrint, setSelectedCardsToPrint] = useState<string[]>([])
    const [printingCardsData, setPrintingCardsData] = useState<any[]>([])

    const [qrStats, setQrStats] = useState<QRStats>({
        total_scans: 0,
        total_cards: 0,
        active_cards: 0,
        scans_by_role: {},
        scans_by_day: [],
        top_locations: [],
        device_stats: [],
        hourly_stats: [],
        scan_locations: []
    })
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
    const [liveMode] = useState(true)

    const fetchCardsPage = useCallback(async (page: number = 1) => {
        try {
            const skip = (page - 1) * pageSize
            const res = await apiClient.get('/cards/', { params: { skip, limit: pageSize } })
            const cardData = res.data
            setCards(Array.isArray(cardData.cards) ? cardData.cards : [])
            setTotalCards(cardData.total || 0)
        } catch (err) {
            console.error('Error fetching cards list:', err)
        }
    }, [pageSize])

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await apiClient.get('/cards/analytics/global')
            setQrStats(res.data)
            setLastRefresh(new Date())
        } catch (err) {
            console.error('Error fetching global card analytics:', err)
        }
    }, [])

    useEffect(() => {
        fetchAnalytics()
    }, [fetchAnalytics])

    useEffect(() => {
        fetchCardsPage(currentPage)
    }, [currentPage, fetchCardsPage])

    useEffect(() => {
        if ((activeTab === 'generate' || pupilParam) && pupils.length === 0) {
            apiClient.get('/pupils/', { params: { limit: 500 } })
                .then(res => setPupils(Array.isArray(res.data) ? res.data : (res.data?.pupils || [])))
                .catch(console.error)
        }
    }, [activeTab, pupilParam, pupils.length])

    // Open pupil card or pre-select pupil when navigated with ?pupil=<id>
    useEffect(() => {
        if (!pupilParam) return
        setSelectedPupil(pupilParam)
        const openPupilCard = async () => {
            setLoading(true)
            try {
                const qrRes = await apiClient.get(`/cards/qr/${pupilParam}`)
                const cardId = qrRes.data?.card_id
                if (cardId) {
                    const [detailRes, pupilRes, healthRes] = await Promise.all([
                        apiClient.get(`/cards/details/${cardId}`),
                        apiClient.get(`/pupils/${pupilParam}`),
                        apiClient.get(`/health-records/pupil/${pupilParam}`).catch(() => ({ data: null }))
                    ])
                    setSelectedPupilDetails({
                        ...detailRes.data,
                        ...pupilRes.data,
                        health: healthRes.data
                    })
                    setShowDigitalCard(true)
                } else {
                    setActiveTab('generate')
                }
            } catch {
                if (user?.role === 'GTE_ADMIN' || user?.role === 'SCHOOL_DIRECTOR') {
                    setActiveTab('generate')
                } else {
                    setActiveTab('history')
                }
            } finally {
                setLoading(false)
            }
        }
        openPupilCard()
    }, [pupilParam, user?.role])

    // Auto-refresh every 30s for live hotspot map
    useEffect(() => {
        if (!liveMode || activeTab !== 'overview') return
        const interval = setInterval(() => {
            fetchAnalytics()
        }, 30000)
        return () => clearInterval(interval)
    }, [liveMode, activeTab, fetchAnalytics])

    const handleDownloadQr = (card: Card) => {
        if (!card?.qr_image_base64) return
        const link = document.createElement('a')
        link.href = `data:image/png;base64,${card.qr_image_base64}`
        link.download = `carte-qr-${card.cnive_id || 'eleve'}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handlePrint = async (cardId?: string) => {
        setLoading(true)
        try {
            const cardsToFetch = cardId ? [cardId] : selectedCardsToPrint;
            if (cardsToFetch.length === 0) return;

            const fetchedCards = await Promise.all(
                cardsToFetch.map(id => apiClient.get(`/cards/details/${id}`).then(res => res.data))
            );
            
            setPrintingCardsData(fetchedCards);
            
            setTimeout(() => {
                window.print()
                setPrintingCardsData([])
                setSelectedCardsToPrint([])
            }, 500)
        } catch (error) {
            console.error('Print failed:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateCard = async () => {
        if (!selectedPupil) {
            setError(t('cards.config.select_pupil'))
            return
        }

        setLoading(true)
        setError('')

        try {
            const response = await apiClient.post('/cards/generate', {
                pupil_id: selectedPupil,
                logo: logoPreview || null,
                qr_color: qrColor,
                bg_color: qrBgColor
            })
            setGeneratedCard(response.data)
            fetchCardsPage(currentPage)
            fetchAnalytics()
        } catch (err: any) {
            setError(err.response?.data?.detail || t('common.error'))
        } finally {
            setLoading(false)
        }
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '16px 20px', backgroundColor: colors.bg,
        border: `1px solid ${colors.border}20`, borderRadius: '16px',
        color: colors.text, fontSize: '1rem', fontWeight: 600, boxSizing: 'border-box', outline: 'none'
    }

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <div className="rounded-3xl md:rounded-[32px] p-6 sm:p-8 md:p-12 mb-8 md:mb-10 relative overflow-hidden shadow-xl"
                 style={{
                     background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
                     boxShadow: '0 20px 40px rgba(79, 70, 229, 0.2)'
                 }}>
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 md:gap-8">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[28px] bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                        <QrCode size={40} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">{t('cards.title')}</h1>
                        <p className="text-white/90 text-sm sm:text-base md:text-lg font-medium">{t('cards.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-8 md:mb-10 p-2 rounded-3xl w-full sm:w-fit" style={{ backgroundColor: `${colors.card}50` }}>
                {[
                    { id: 'overview', label: t('cards.tabs.overview'), icon: <BarChart3 size={18}/> },
                    { id: 'scanner', label: "Scanner et prestations", icon: <QrCode size={18}/> },
                    (user?.role === 'GTE_ADMIN' || user?.role === 'SCHOOL_DIRECTOR') ? { id: 'generate', label: t('cards.tabs.generate'), icon: <Plus size={18}/> } : null,
                    { id: 'history', label: t('cards.tabs.history'), icon: <History size={18}/> }
                ].filter(Boolean).map((tab: any) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className="px-4 sm:px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all"
                        style={{
                            backgroundColor: activeTab === tab.id ? colors.primary : 'transparent',
                            color: activeTab === tab.id ? 'white' : colors.textSecondary,
                        }}
                    >
                        {tab.icon} <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    <div className="flex flex-col gap-6 md:gap-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            {[
                                { label: t('cards.stats.total_scans'), value: qrStats.total_scans, color: '#6366f1', icon: <Activity/> },
                                { label: t('cards.stats.active_cards'), value: qrStats.active_cards, color: '#10b981', icon: <ShieldCheck/> }
                            ].map((stat, i) => (
                                <div key={i} className="rounded-3xl p-6 md:p-8 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                                    <div className="flex justify-between mb-4">
                                        <div style={{ color: stat.color }}>{stat.icon}</div>
                                        <div className="text-2xl md:text-3xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                                    </div>
                                    <p className="m-0 text-xs font-bold tracking-wider" style={{ color: colors.textSecondary }}>{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Top Locations */}
                        <div className="rounded-3xl md:rounded-[32px] p-6 md:p-10 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                            <h3 className="text-lg font-extrabold mb-6">{t('cards.stats.top_locations') || 'Top localisations'}</h3>
                            <div className="flex flex-col gap-4">
                                {qrStats.top_locations.slice(0, 4).map((loc, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between mb-2 text-sm font-bold">
                                            <span>{loc.name}</span>
                                            <span style={{ color: colors.primary }}>{loc.count} scans</span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.bg }}>
                                            <div style={{ width: `${Math.min(100, (loc.count / (qrStats.total_scans || 1)) * 200)}%`, height: '100%', backgroundColor: colors.primary, borderRadius: '3px' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl md:rounded-[32px] p-6 md:p-10 border h-[420px] md:h-[480px] flex flex-col" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                            <div className="flex items-center gap-3 mb-5 flex-wrap">
                                <h3 className="text-lg md:text-xl font-extrabold flex items-center gap-3 m-0"><MapPin color={colors.primary}/> {t('cards.hotspots')}</h3>
                                <div className="flex items-center gap-1.5 bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full text-[11px] font-black border border-red-500/20">
                                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'livePulse 1.5s ease-in-out infinite' }} />
                                    En direct
                                </div>
                                <div className="flex items-center gap-2 ml-auto flex-wrap">
                                    <span className="text-[11px] font-semibold" style={{ color: colors.textSecondary }}>
                                        Actualisé {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <button onClick={fetchAnalytics}
                                        className="px-3.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer border"
                                        style={{ borderColor: `${colors.border}20`, background: colors.bg, color: colors.primary }}>
                                        ↻ Actualiser
                                    </button>
                                </div>
                            </div>
                            <div className="mb-4 flex gap-2 flex-wrap">
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">● Agent santé</span>
                                <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 text-[11px] font-extrabold">● Travailleur social</span>
                                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 text-[11px] font-extrabold">● Autre</span>
                                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold ml-auto" style={{ background: colors.bg, color: colors.textSecondary }}>
                                    {qrStats.scan_locations.length} scan(s) géolocalisé(s)
                                </span>
                            </div>
                            <div className="flex-1 rounded-2xl overflow-hidden border" style={{ borderColor: `${colors.border}05` }}>
                                <MapContainer center={[14.6937, -17.4441]} zoom={11} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {qrStats.scan_locations.map((loc, i) => (
                                        <Marker key={i} position={[loc.lat, loc.lon]} icon={createIcon(loc.role === 'HEALTH_WORKER' ? '#10b981' : loc.role === 'SOCIAL_WORKER' ? '#ef4444' : '#6366f1')}>
                                            <Popup className="premium-popup" minWidth={240} maxWidth={320}>
                                                <div style={{ padding: '20px', width: '240px', backgroundColor: 'white', borderRadius: '20px', boxSizing: 'border-box' }}>
                                                    <h4 style={{ margin: '0 0 12px 0', fontWeight: 900, fontSize: '1.1rem', color: '#1e293b' }}>{loc.pupil_name || 'Élève inconnu'}</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 700 }}>
                                                            <User size={16} color={colors.primary}/>
                                                            <span style={{ color: '#475569' }}>{t(`team.roles.${loc.role}`) || loc.role}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 700 }}>
                                                            <Calendar size={16} color={colors.primary}/>
                                                            <span style={{ color: '#475569' }}>
                                                                {loc.timestamp && !isNaN(Date.parse(loc.timestamp))
                                                                    ? new Date(loc.timestamp).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'fr-FR')
                                                                    : 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 700 }}>
                                                            <Clock size={16} color={colors.primary}/>
                                                            <span style={{ color: '#475569' }}>
                                                                {loc.timestamp && !isNaN(Date.parse(loc.timestamp))
                                                                    ? new Date(loc.timestamp).toLocaleTimeString(i18n.language === 'es' ? 'es-ES' : 'fr-FR')
                                                                    : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        .leaflet-popup-content-wrapper,
                        .leaflet-popup-content-wrapper * {
                            max-width: none !important;
                        }
                        .premium-popup .leaflet-popup-content-wrapper {
                            border-radius: 24px !important;
                            padding: 0 !important;
                            overflow: hidden !important;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.2) !important;
                            background: white !important;
                            min-width: 240px !important;
                        }
                        .premium-popup .leaflet-popup-content {
                            margin: 0 !important;
                            max-width: none !important;
                            width: auto !important;
                        }
                        .premium-popup .leaflet-popup-tip-container {
                            display: none !important;
                        }
                        .leaflet-popup-close-button {
                            display: none !important;
                        }
                        .custom-marker {
                            background: none !important;
                            border: none !important;
                        }
                        @keyframes livePulse {
                            0% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.4; transform: scale(1.3); }
                            100% { opacity: 1; transform: scale(1); }
                        }
                    `}</style>

                    <div className="flex flex-col gap-6 md:gap-8">
                        <div className="rounded-3xl md:rounded-[32px] p-6 md:p-10 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                            <h3 className="text-lg md:text-xl font-extrabold mb-8 flex items-center gap-3"><Smartphone color={colors.primary}/> {t('cards.devices')}</h3>
                            <div ref={barChartContainerRef} style={{ height: '200px', width: '100%', overflow: 'hidden' }}>
                                {barChartWidth > 0 && (
                                    <BarChart width={barChartWidth} height={200} data={qrStats.hourly_stats}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border + '20'} />
                                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: colors.textSecondary }} tickFormatter={h => `${h}h`}/>
                                        <YAxis hide />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}/>
                                        <Bar dataKey="count" fill={colors.primary} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: colors.bg }}>
                                    <p className="m-0 text-2xl font-black" style={{ color: colors.primary }}>{(qrStats.total_scans / (qrStats.total_cards || 1)).toFixed(1)}</p>
                                    <p className="mt-1 mb-0 text-[11px] font-extrabold" style={{ color: colors.textSecondary }}>{t('cards.stats.scans_per_card')}</p>
                                </div>
                                <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: colors.bg }}>
                                    <p className="m-0 text-2xl font-black text-emerald-500">{Math.round((qrStats.active_cards / (qrStats.total_cards || 1)) * 100)}%</p>
                                    <p className="mt-1 mb-0 text-[11px] font-extrabold" style={{ color: colors.textSecondary }}>{t('cards.stats.usage_rate')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl md:rounded-[32px] p-6 md:p-10 border flex-1" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                            <h3 className="text-lg md:text-xl font-extrabold mb-6">{t('cards.stats.scans_by_role') || 'Scans par rôle'}</h3>
                            <div ref={pieChartContainerRef} style={{ height: '220px', width: '100%', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                                {pieChartWidth > 0 && (
                                    <PieChart width={pieChartWidth} height={220}>
                                        <Pie
                                            data={Object.entries(qrStats.scans_by_role).map(([role, count]) => ({ name: t(`team.roles.${role}`) || role, value: count }))}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {Object.entries(qrStats.scans_by_role).map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                    </PieChart>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                                {Object.entries(qrStats.scans_by_role).map(([role, count], i) => (
                                    <div key={i} className="text-xs font-bold flex items-center gap-2" style={{ color: colors.textSecondary }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'][i % 4] }} />
                                        <span>{t(`team.roles.${role}`) || role}: {count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl md:rounded-[32px] p-6 md:p-10 border flex-1" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                            <h3 className="text-lg md:text-xl font-extrabold mb-6">{t('cards.recent_scans')}</h3>
                            <div className="flex flex-col gap-3">
                                {qrStats.scan_locations.slice(-5).reverse().map((scan, i) => (
                                    <div key={i} className="p-4 rounded-2xl flex items-center gap-4" style={{ backgroundColor: colors.bg }}>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: scan.role === 'HEALTH_WORKER' ? '#10b98115' : '#6366f115', color: scan.role === 'HEALTH_WORKER' ? '#10b981' : '#6366f1' }}>
                                            {scan.role === 'HEALTH_WORKER' ? <Activity size={18}/> : <Users size={18}/>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="m-0 font-bold text-sm truncate">{scan.pupil_name}</p>
                                            <p className="m-0 text-xs truncate" style={{ color: colors.textSecondary }}>{t(`team.roles.${scan.role}`) || scan.role} • {new Date(scan.timestamp).toLocaleTimeString(i18n.language === 'es' ? 'es-ES' : 'fr-FR')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'scanner' && (
                <CardServiceScanner />
            )}

            {activeTab === 'generate' && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 md:gap-8">
                    <div className="rounded-3xl md:rounded-[32px] p-6 md:p-10 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                        <h2 className="text-xl md:text-2xl font-extrabold mb-8">{t('cards.config.title')}</h2>
                        {error && (
                            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-sm">
                                {error}
                            </div>
                        )}
                        <div className="flex flex-col gap-6 md:gap-8">
                            <div>
                                <label className="block mb-3 text-xs font-extrabold tracking-wider" style={{ color: colors.textSecondary }}>{t('cards.config.select_pupil')}</label>
                                <select value={selectedPupil} onChange={e => setSelectedPupil(e.target.value)} style={inputStyle}>
                                    <option value="">{t('vulnerability.choose_pupil')}</option>
                                    {pupils.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.cnive_id})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block mb-3 text-xs font-extrabold" style={{ color: colors.textSecondary }}>{t('cards.config.qr_color')}</label>
                                    <input type="color" value={qrColor} onChange={e => setQrColor(e.target.value)} style={{ width: '100%', height: '56px', border: 'none', borderRadius: '16px', backgroundColor: colors.bg, padding: '4px' }}/>
                                </div>
                                <div>
                                    <label className="block mb-3 text-xs font-extrabold" style={{ color: colors.textSecondary }}>{t('cards.config.bg_color')}</label>
                                    <input type="color" value={qrBgColor} onChange={e => setQrBgColor(e.target.value)} style={{ width: '100%', height: '56px', border: 'none', borderRadius: '16px', backgroundColor: colors.bg, padding: '4px' }}/>
                                </div>
                            </div>
                            <button onClick={handleGenerateCard} disabled={loading} className="mt-2 w-full py-5 rounded-2xl text-white font-extrabold text-base md:text-lg cursor-pointer transition-all active:scale-95" style={{ backgroundColor: colors.primary, boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>
                                {loading ? t('common.loading') : t('cards.config.generate_button')}
                            </button>
                        </div>
                    </div>

                    <div className="rounded-3xl md:rounded-[32px] p-6 md:p-10 border text-center" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                        <h3 className="text-base font-extrabold mb-8" style={{ color: colors.textSecondary }}>{t('cards.preview.title')}</h3>
                        {generatedCard ? (
                            <div>
                                <div style={{ backgroundColor: qrBgColor, padding: '28px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', marginBottom: '28px', display: 'inline-block' }}>
                                    <img src={`data:image/png;base64,${generatedCard.qr_image_base64}`} alt="QR" style={{ width: '200px', height: '200px' }} />
                                </div>
                                <h4 className="text-xl font-extrabold mb-2">{generatedCard.pupil_name}</h4>
                                <p className="text-sm font-bold font-mono mb-8" style={{ color: colors.textSecondary }}>{generatedCard.cnive_id}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleDownloadQr(generatedCard)}
                                        title="Télécharger le code qr"
                                        className="p-3.5 rounded-2xl border font-bold cursor-pointer flex items-center justify-center gap-2"
                                        style={{ borderColor: `${colors.border}20`, backgroundColor: colors.bg, color: colors.text }}
                                    >
                                        <Download size={18}/> <span className="text-xs">Qr</span>
                                    </button>
                                    <button
                                        onClick={() => handlePrint(generatedCard.id)}
                                        title="Imprimer la carte"
                                        className="p-3.5 rounded-2xl font-bold text-white cursor-pointer flex items-center justify-center gap-2"
                                        style={{ backgroundColor: colors.primary }}
                                    >
                                        <Printer size={18}/> <span className="text-xs">Imprimer</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-16 opacity-30 flex flex-col items-center">
                                <QrCode size={120} strokeWidth={1} className="mb-6"/>
                                <p className="font-semibold">{t('cards.preview.waiting')}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="rounded-3xl md:rounded-[32px] p-6 md:p-10 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                    <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                        <h2 className="text-xl md:text-2xl font-extrabold">{t('cards.tabs.history')}</h2>
                        <div className="flex flex-wrap gap-3 items-center">
                            {(user?.role === 'GTE_ADMIN' || user?.role === 'SCHOOL_DIRECTOR') && selectedCardsToPrint.length > 0 && (
                                <button 
                                    onClick={() => handlePrint()} 
                                    className="px-5 py-2.5 rounded-2xl bg-emerald-500 text-white font-extrabold text-xs sm:text-sm cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/30"
                                >
                                    <Printer size={18}/> Imprimer la sélection ({selectedCardsToPrint.length})
                                </button>
                            )}
                            <div className="px-5 py-2.5 rounded-2xl text-sm font-bold" style={{ backgroundColor: colors.bg, color: colors.textSecondary }}>
                                {totalCards} {t('common.total')}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-10">
                        {cards.map(card => (
                            <div key={card.id} className="p-5 rounded-3xl border flex justify-between items-center transition-all gap-3" style={{ backgroundColor: selectedCardsToPrint.includes(card.id) ? colors.primary + '10' : colors.bg, borderColor: selectedCardsToPrint.includes(card.id) ? colors.primary : colors.border + '15' }}>
                                <div className="flex items-center gap-3.5 min-w-0">
                                    {(user?.role === 'GTE_ADMIN' || user?.role === 'SCHOOL_DIRECTOR') && (
                                        <input 
                                            type="checkbox" 
                                            checked={selectedCardsToPrint.includes(card.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedCardsToPrint(prev => [...prev, card.id]);
                                                } else {
                                                    setSelectedCardsToPrint(prev => prev.filter(id => id !== card.id));
                                                }
                                            }}
                                            style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: colors.primary }}
                                        />
                                    )}
                                    <div className="min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/pupils/${card.pupil_id}`)}
                                            className="m-0 text-base font-extrabold text-left hover:underline truncate block max-w-full"
                                            style={{ color: colors.text }}
                                            title="Voir le dossier de l'élève"
                                        >
                                            {card.pupil_name}
                                        </button>
                                        <p className="mt-1 mb-0 text-xs font-semibold" style={{ color: colors.textSecondary }}>{card.cnive_id}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={async () => {
                                        setLoading(true)
                                        try {
                                            const [res, pupilRes, healthRes] = await Promise.all([
                                                apiClient.get(`/cards/details/${card.id}`),
                                                apiClient.get(`/pupils/${card.pupil_id}`),
                                                apiClient.get(`/health-records/pupil/${card.pupil_id}`).catch(() => ({ data: null }))
                                            ])
                                            
                                            setSelectedPupilDetails({
                                                ...res.data,
                                                ...pupilRes.data,
                                                health: healthRes.data
                                            })
                                            setShowDigitalCard(true)
                                        } catch (err) {
                                            console.error(err)
                                        } finally {
                                            setLoading(false)
                                        }
                                    }} className="w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer" style={{ backgroundColor: colors.card, color: colors.primary }} title={t('common.view')}><Eye size={20}/></button>
                                    <button onClick={() => handlePrint(card.id)} className="w-11 h-11 rounded-2xl flex items-center justify-center text-white cursor-pointer" style={{ backgroundColor: colors.primary }} title={t('common.print')}><Printer size={20}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalCards > pageSize && (
                        <div className="flex justify-center items-center gap-3 mt-10 flex-wrap">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{ padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: colors.bg, color: colors.text, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                            >
                                <ChevronLeft size={20}/>
                            </button>
                            
                            <div className="flex gap-2 flex-wrap">
                                {Array.from({ length: Math.min(5, Math.ceil(totalCards / pageSize)) }, (_, i) => {
                                    const pageNum = i + 1
                                    return (
                                        <button 
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            style={{
                                                width: '40px', height: '40px', borderRadius: '12px', border: 'none',
                                                backgroundColor: currentPage === pageNum ? colors.primary : colors.bg,
                                                color: currentPage === pageNum ? 'white' : colors.textSecondary,
                                                fontWeight: 700, cursor: 'pointer'
                                            }}
                                        >
                                            {pageNum}
                                        </button>
                                    )
                                })}
                                {Math.ceil(totalCards / pageSize) > 5 && <span style={{ padding: '8px', color: colors.textSecondary }}>...</span>}
                            </div>

                            <button 
                                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCards / pageSize), p + 1))}
                                disabled={currentPage === Math.ceil(totalCards / pageSize)}
                                style={{ padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: colors.bg, color: colors.text, cursor: currentPage === Math.ceil(totalCards / pageSize) ? 'not-allowed' : 'pointer', opacity: currentPage === Math.ceil(totalCards / pageSize) ? 0.5 : 1 }}
                            >
                                <ChevronRight size={20}/>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Premium Digital ID Card Modal — Format CMU-Élèves / MUTUALIS */}
            {showDigitalCard && selectedPupilDetails && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '16px', overflowY: 'auto' }} 
                    onClick={() => setShowDigitalCard(false)}
                >
                    <div 
                        style={{ position: 'relative', maxWidth: cardPreviewSide === 'both' ? '1040px' : '540px', width: '100%', borderRadius: '28px', backgroundColor: colors.card, border: `1px solid ${colors.border}40`, padding: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', transition: 'all 0.3s ease' }} 
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header modal */}
                        <div className="flex justify-between items-start gap-4 mb-5">
                            <div>
                                <h3 className="m-0 text-lg md:text-xl font-black flex items-center gap-2" style={{ color: colors.text }}>
                                    <CreditCard size={22} color="#00853F" />
                                    Carte d'élève • modèle mutualis csu
                                </h3>
                                <p className="mt-1 mb-0 text-xs font-semibold" style={{ color: colors.textSecondary }}>
                                    Format horizontal id-1 • {selectedPupilDetails.pupil_name || `${selectedPupilDetails.first_name || ''} ${selectedPupilDetails.last_name || ''}`} ({selectedPupilDetails.cnive_id})
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowDigitalCard(false)} 
                                style={{ background: `${colors.border}30`, border: 'none', color: colors.text, cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            >
                                <X size={18}/>
                            </button>
                        </div>

                        {/* Switcher Recto / Verso / Les deux */}
                        <div className="flex flex-wrap gap-2 mb-6 p-1.5 rounded-2xl w-fit" style={{ backgroundColor: colors.bg }}>
                            <button
                                onClick={() => setCardPreviewSide('recto')}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    backgroundColor: cardPreviewSide === 'recto' ? colors.primary : 'transparent',
                                    color: cardPreviewSide === 'recto' ? 'white' : colors.textSecondary,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                📄 Recto (face avant)
                            </button>
                            <button
                                onClick={() => setCardPreviewSide('verso')}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    backgroundColor: cardPreviewSide === 'verso' ? colors.primary : 'transparent',
                                    color: cardPreviewSide === 'verso' ? 'white' : colors.textSecondary,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                🔄 Verso (csu et qr)
                            </button>
                            <button
                                onClick={() => setCardPreviewSide('both')}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    backgroundColor: cardPreviewSide === 'both' ? colors.primary : 'transparent',
                                    color: cardPreviewSide === 'both' ? 'white' : colors.textSecondary,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                📑 Les deux faces
                            </button>
                        </div>

                        {/* Visualisation de la carte */}
                        <div className="flex gap-5 flex-wrap justify-center mb-6 overflow-x-auto pb-2">
                            {(cardPreviewSide === 'recto' || cardPreviewSide === 'both') && (
                                <div style={{ flex: cardPreviewSide === 'both' ? '1 1 440px' : '1 1 100%', maxWidth: '480px' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: colors.textSecondary, marginBottom: '8px', letterSpacing: '0.5px' }}>
                                        Face avant — recto (identité et scolarité)
                                    </p>
                                    <PupilIdCard card={selectedPupilDetails} side="recto" isPrint={false} />
                                </div>
                            )}
                            {(cardPreviewSide === 'verso' || cardPreviewSide === 'both') && (
                                <div style={{ flex: cardPreviewSide === 'both' ? '1 1 440px' : '1 1 100%', maxWidth: '480px' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: colors.textSecondary, marginBottom: '8px', letterSpacing: '0.5px' }}>
                                        Face arrière — verso (sen-csu et niveaux d'accès)
                                    </p>
                                    <PupilIdCard card={selectedPupilDetails} side="verso" isPrint={false} />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-end border-t pt-4 flex-wrap" style={{ borderColor: `${colors.border}20` }}>
                            {selectedPupilDetails.pupil_id && (
                                <button
                                    onClick={() => {
                                        setShowDigitalCard(false)
                                        navigate(`/pupils/${selectedPupilDetails.pupil_id}`)
                                    }}
                                    style={{ padding: '12px 18px', borderRadius: '14px', backgroundColor: `${colors.border}20`, color: colors.text, border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                                >
                                    <User size={16} /> Voir le dossier élève
                                </button>
                            )}
                            <button 
                                onClick={() => {
                                    setShowDigitalCard(false)
                                    apiClient.get(`/cards/analytics/${selectedPupilDetails.pupil_id}`).then(r => {
                                        setSelectedPupilAnalytics({ ...r.data, pupil_name: selectedPupilDetails.pupil_name })
                                        setShowAnalyticsModal(true)
                                    })
                                }} 
                                style={{ padding: '12px 18px', borderRadius: '14px', backgroundColor: `${colors.border}20`, color: colors.text, border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                            >
                                <Activity size={16} /> Historique et scans
                            </button>
                            <button 
                                onClick={() => handlePrint(selectedPupilDetails.id)} 
                                style={{ padding: '12px 24px', borderRadius: '14px', backgroundColor: '#00853F', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', boxShadow: '0 4px 15px rgba(0, 133, 63, 0.3)' }}
                            >
                                <Printer size={16} /> Imprimer recto-verso (format standard)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scans Modal */}
            {showRecentScansModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '24px' }}>
                    <div className="max-w-xl w-full rounded-3xl p-6 md:p-10 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}20` }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold">Derniers scans enregistrés</h3>
                            <button onClick={() => setShowRecentScansModal(false)} style={{ background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer' }}><X size={20}/></button>
                        </div>
                        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                            {recentScans.map((scan, i) => (
                                <div key={i} className="p-4 rounded-2xl flex justify-between items-center" style={{ backgroundColor: colors.bg }}>
                                    <div>
                                        <p className="m-0 font-bold text-sm">{scan.pupil_name}</p>
                                        <p className="mt-1 mb-0 text-xs" style={{ color: colors.textSecondary }}>{scan.location_name} • {new Date(scan.scanned_at).toLocaleTimeString()}</p>
                                    </div>
                                    <span className="text-xs font-extrabold px-2 py-1 rounded-lg" style={{ backgroundColor: colors.primary + '15', color: colors.primary }}>{scan.service_type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Pupil Analytics Modal */}
            {showAnalyticsModal && selectedPupilAnalytics && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '24px' }}>
                    <div className="max-w-xl w-full rounded-3xl p-6 md:p-10 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}20` }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold">Activité de la carte : {selectedPupilAnalytics.pupil_name}</h3>
                            <button onClick={() => setShowAnalyticsModal(false)} style={{ background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer' }}><X size={20}/></button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: colors.bg }}>
                                <span className="text-3xl font-black" style={{ color: colors.primary }}>{selectedPupilAnalytics.total_scans}</span>
                                <p className="mt-1 mb-0 text-xs font-bold" style={{ color: colors.textSecondary }}>Total des scans</p>
                            </div>
                            <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: colors.bg }}>
                                <span className="text-3xl font-black text-emerald-500">{selectedPupilAnalytics.active ? 'Actif' : 'Inactif'}</span>
                                <p className="mt-1 mb-0 text-xs font-bold" style={{ color: colors.textSecondary }}>Statut du pass</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Roles Info Modal */}
            {showRolesModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '24px' }}>
                    <div className="max-w-xl w-full rounded-3xl p-6 md:p-10 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}20` }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold">Rôles et niveaux d'accès sécurisés</h3>
                            <button onClick={() => setShowRolesModal(false)} style={{ background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer' }}><X size={20}/></button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="p-3.5 rounded-2xl" style={{ backgroundColor: colors.bg }}>
                                <strong style={{ color: '#10b981' }}>🟢 Niveau scolaire :</strong> Directeur d'école, enseignant (scolarité, présences, notes)
                            </div>
                            <div className="p-3.5 rounded-2xl" style={{ backgroundColor: colors.bg }}>
                                <strong style={{ color: '#0284c7' }}>🔵 Niveau médical :</strong> Médecin, agent de santé, mutuelle de santé (csu, groupe sanguin, soins)
                            </div>
                            <div className="p-3.5 rounded-2xl" style={{ backgroundColor: colors.bg }}>
                                <strong style={{ color: '#f59e0b' }}>🟠 Niveau social :</strong> Travailleur social, relais communautaire (score fev, cantine, bourses)
                            </div>
                            <div className="p-3.5 rounded-2xl" style={{ backgroundColor: colors.bg }}>
                                <strong style={{ color: '#8b5cf6' }}>🟣 Niveau contrôle :</strong> Administrateur gte, inspection d'académie (sécurité et audit)
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Area - Hidden on screen, visible on print (Format CMU-Élèves / MUTUALIS ISO ID-1) */}
            {printingCardsData.length > 0 && (
                <div id="print-area" style={{ display: 'none', gap: '10mm', flexWrap: 'wrap', justifyContent: 'center', padding: '10mm 0' }}>
                    {printingCardsData.map((cardData, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8mm', marginBottom: '8mm', pageBreakInside: 'avoid' }}>
                            <PupilIdCard card={cardData} side="recto" isPrint={true} />
                            <PupilIdCard card={cardData} side="verso" isPrint={true} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default CardsManagement
