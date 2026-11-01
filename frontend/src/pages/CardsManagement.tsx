import React, { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import apiClient from '../api/client'
import {
    PieChart, Pie, Cell, BarChart, Bar, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { CreditCard, QrCode, Activity, Users, User, MapPin, Plus, History, BarChart3, Download, Printer, Settings, Eye, Info, Smartphone, ShieldCheck, X, School as SchoolIcon, Phone, Heart, AlertTriangle, ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react'
import { getPupilPhotoUrl } from '../utils/imageUtils'
import CardServiceScanner from '../components/CardServiceScanner'

// Custom marker icon for Leaflet
const createIcon = (color: string) => L.divIcon({
    html: `
        <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
            <!-- Badge de rôle en couleur -->
            <div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); position: absolute; bottom: 4px; right: 4px; z-index: 2;"></div>
            <!-- Silhouette noire bien visible -->
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
    const barChartContainerRef = useRef<HTMLDivElement>(null)
    const pieChartContainerRef = useRef<HTMLDivElement>(null)
    const barChartWidth = useContainerWidth(barChartContainerRef) || 400
    const pieChartWidth = useContainerWidth(pieChartContainerRef) || 400
    const { colors } = useTheme()
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('overview')
    const [pupils, setPupils] = useState<Pupil[]>([])
    const [selectedPupil, setSelectedPupil] = useState('')
    const [generatedCard, setGeneratedCard] = useState<Card | null>(null)
    const [cards, setCards] = useState<Card[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCards, setTotalCards] = useState(0)
    const pageSize = 25
    const [logoPreview, setLogoPreview] = useState<string>('')
    const [qrColor, setQrColor] = useState('#000000')
    const [qrBgColor, setQrBgColor] = useState('#ffffff')
    const [showDeleteLogoConfirm, setShowDeleteLogoConfirm] = useState(false)
    const [selectedPupilAnalytics, setSelectedPupilAnalytics] = useState<any | null>(null)
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
    const [showRecentScansModal, setShowRecentScansModal] = useState(false)
    const [showRolesModal, setShowRolesModal] = useState(false)
    const [showDigitalCard, setShowDigitalCard] = useState(false)
    const [selectedPupilDetails, setSelectedPupilDetails] = useState<any | null>(null)
    const [recentScans, setRecentScans] = useState<any[]>([])
    const [printingCard, setPrintingCard] = useState<any | null>(null)
    const [selectedCardsToPrint, setSelectedCardsToPrint] = useState<string[]>([])
    const [printingCardsData, setPrintingCardsData] = useState<any[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

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
    const [liveMode, setLiveMode] = useState(true)

    useEffect(() => {
        fetchData(currentPage)
    }, [currentPage])

    // Auto-refresh every 30s for live hotspot map
    useEffect(() => {
        if (!liveMode) return
        const interval = setInterval(() => {
            apiClient.get('/cards/analytics/global')
                .then(res => {
                    setQrStats(res.data)
                    setLastRefresh(new Date())
                })
                .catch(console.error)
        }, 30000)
        return () => clearInterval(interval)
    }, [liveMode])

    const fetchData = async (page: number = 1) => {
        try {
            const skip = (page - 1) * pageSize
            const results = await Promise.allSettled([
                apiClient.get('/pupils/'),
                apiClient.get('/cards/analytics/global'),
                apiClient.get('/cards/', { params: { skip, limit: pageSize } })
            ])

            if (results[0].status === 'fulfilled') setPupils(Array.isArray(results[0].value.data) ? results[0].value.data : [])
            if (results[1].status === 'fulfilled') {
                setQrStats(results[1].value.data)
                setLastRefresh(new Date())
            }
            if (results[2].status === 'fulfilled') {
                const cardData = results[2].value.data
                setCards(Array.isArray(cardData.cards) ? cardData.cards : [])
                setTotalCards(cardData.total || 0)
            }
        } catch (error) {
            console.error('Error fetching cards data:', error)
        }
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = () => setLogoPreview(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    const fetchRecentScans = async () => {
        try {
            const res = await apiClient.get('/cards/analytics/recent-scans')
            setRecentScans(res.data)
            setShowRecentScansModal(true)
        } catch (error) {
            console.error('Error fetching recent scans:', error)
        }
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
            fetchData()
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
            <div style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
                borderRadius: '32px', padding: '48px', marginBottom: '40px',
                position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(79, 70, 229, 0.2)'
            }}>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <div style={{ width: '96px', height: '96px', borderRadius: '28px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <QrCode size={48} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>{t('cards.title')}</h1>
                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', fontWeight: 500 }}>{t('cards.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '40px', backgroundColor: `${colors.card}50`, padding: '8px', borderRadius: '24px', width: 'fit-content', flexWrap: 'wrap' }}>
                {[
                    { id: 'overview', label: t('cards.tabs.overview'), icon: <BarChart3 size={18}/> },
                    { id: 'scanner', label: "Scanner & Prestations", icon: <QrCode size={18}/> },
                    (user?.role === 'GTE_ADMIN' || user?.role === 'SCHOOL_DIRECTOR') ? { id: 'generate', label: t('cards.tabs.generate'), icon: <Plus size={18}/> } : null,
                    { id: 'history', label: t('cards.tabs.history'), icon: <History size={18}/> }
                ].filter(Boolean).map((tab: any) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '14px 28px', borderRadius: '18px', border: 'none', cursor: 'pointer',
                            backgroundColor: activeTab === tab.id ? colors.primary : 'transparent',
                            color: activeTab === tab.id ? 'white' : colors.textSecondary,
                            fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s ease'
                        }}
                    >
                        {tab.icon} <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {[
                                { label: t('cards.stats.total_scans'), value: qrStats.total_scans, color: '#6366f1', icon: <Activity/> },
                                { label: t('cards.stats.active_cards'), value: qrStats.active_cards, color: '#10b981', icon: <ShieldCheck/> }
                            ].map((stat, i) => (
                                <div key={i} style={{ backgroundColor: colors.card, borderRadius: '24px', padding: '32px', border: `1px solid ${colors.border}10` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div style={{ color: stat.color }}>{stat.icon}</div>
                                        <div style={{ fontSize: '2rem', fontWeight: 900, color: stat.color }}>{stat.value}</div>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: colors.textSecondary, letterSpacing: '1px' }}>{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Top Locations */}
                        <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '40px', border: `1px solid ${colors.border}10` }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '24px' }}>{t('cards.stats.top_locations') || 'Top localisations'}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {qrStats.top_locations.slice(0, 4).map((loc, i) => (
                                    <div key={i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                                            <span>{loc.name}</span>
                                            <span style={{ color: colors.primary }}>{loc.count} scans</span>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', backgroundColor: colors.bg, borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.min(100, (loc.count / qrStats.total_scans) * 200)}%`, height: '100%', backgroundColor: colors.primary, borderRadius: '3px' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '40px', border: `1px solid ${colors.border}10`, height: '480px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}><MapPin color={colors.primary}/> {t('cards.hotspots')}</h3>
                                {/* LIVE badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900, border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'livePulse 1.5s ease-in-out infinite' }} />
                                    LIVE
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.7rem', color: colors.textSecondary, fontWeight: 600 }}>
                                        Actualisé {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <button onClick={() => apiClient.get('/cards/analytics/global').then(r => { setQrStats(r.data); setLastRefresh(new Date()) })}
                                        style={{ padding: '6px 14px', borderRadius: '12px', border: `1px solid ${colors.border}20`, background: colors.bg, color: colors.primary, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                                        ↻ Refresh
                                    </button>
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ padding: '4px 10px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.7rem', fontWeight: 800 }}>● Agent santé</span>
                                <span style={{ padding: '4px 10px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.7rem', fontWeight: 800 }}>● Travailleur social</span>
                                <span style={{ padding: '4px 10px', borderRadius: '10px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: '0.7rem', fontWeight: 800 }}>● Autre</span>
                                <span style={{ padding: '4px 10px', borderRadius: '10px', background: colors.bg, color: colors.textSecondary, fontSize: '0.7rem', fontWeight: 700, marginLeft: 'auto' }}>
                                    {qrStats.scan_locations.length} scan(s) géolocalisé(s)
                                </span>
                            </div>
                            <div style={{ flex: 1, borderRadius: '20px', overflow: 'hidden', border: `1px solid ${colors.border}05` }}>
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
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '40px', border: `1px solid ${colors.border}10` }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}><Smartphone color={colors.primary}/> {t('cards.devices')}</h3>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '32px' }}>
                                <div style={{ padding: '20px', backgroundColor: colors.bg, borderRadius: '20px', textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: colors.primary }}>{(qrStats.total_scans / (qrStats.total_cards || 1)).toFixed(1)}</p>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.65rem', fontWeight: 800, color: colors.textSecondary }}>{t('cards.stats.scans_per_card')}</p>
                                </div>
                                <div style={{ padding: '20px', backgroundColor: colors.bg, borderRadius: '20px', textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>{Math.round((qrStats.active_cards / (qrStats.total_cards || 1)) * 100)}%</p>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.65rem', fontWeight: 800, color: colors.textSecondary }}>{t('cards.stats.usage_rate')}</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '40px', border: `1px solid ${colors.border}10`, flex: 1 }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px' }}>{t('cards.stats.scans_by_role') || 'Scans par rôle'}</h3>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
                                {Object.entries(qrStats.scans_by_role).map(([role, count], i) => (
                                    <div key={i} style={{ fontSize: '0.7rem', fontWeight: 700, color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'][i % 4] }} />
                                        <span>{t(`team.roles.${role}`) || role}: {count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '40px', border: `1px solid ${colors.border}10`, flex: 1 }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px' }}>{t('cards.recent_scans')}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {qrStats.scan_locations.slice(-5).reverse().map((scan, i) => (
                                    <div key={i} style={{ padding: '16px 20px', backgroundColor: colors.bg, borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: scan.role === 'HEALTH_WORKER' ? '#10b98115' : '#6366f115', color: scan.role === 'HEALTH_WORKER' ? '#10b981' : '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {scan.role === 'HEALTH_WORKER' ? <Activity size={18}/> : <Users size={18}/>}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{scan.pupil_name}</p>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: colors.textSecondary }}>{t(`team.roles.${scan.role}`) || scan.role} • {new Date(scan.timestamp).toLocaleTimeString(i18n.language === 'es' ? 'es-ES' : 'fr-FR')}</p>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
                    <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '48px', border: `1px solid ${colors.border}10` }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '40px' }}>{t('cards.config.title')}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.75rem', fontWeight: 800, color: colors.textSecondary, letterSpacing: '1px' }}>{t('cards.config.select_pupil')}</label>
                                <select value={selectedPupil} onChange={e => setSelectedPupil(e.target.value)} style={inputStyle}>
                                    <option value="">{t('vulnerability.choose_pupil')}</option>
                                    {pupils.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.cnive_id})</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.75rem', fontWeight: 800, color: colors.textSecondary }}>{t('cards.config.qr_color')}</label>
                                    <input type="color" value={qrColor} onChange={e => setQrColor(e.target.value)} style={{ width: '100%', height: '56px', border: 'none', borderRadius: '16px', backgroundColor: colors.bg, padding: '4px' }}/>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.75rem', fontWeight: 800, color: colors.textSecondary }}>{t('cards.config.bg_color')}</label>
                                    <input type="color" value={qrBgColor} onChange={e => setQrBgColor(e.target.value)} style={{ width: '100%', height: '56px', border: 'none', borderRadius: '16px', backgroundColor: colors.bg, padding: '4px' }}/>
                                </div>
                            </div>
                            <button onClick={handleGenerateCard} disabled={loading} style={{ marginTop: '16px', width: '100%', padding: '20px', backgroundColor: colors.primary, color: 'white', borderRadius: '20px', border: 'none', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>
                                {loading ? t('common.loading') : t('cards.config.generate_button')}
                            </button>
                        </div>
                    </div>

                    <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '40px', border: `1px solid ${colors.border}10`, textAlign: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '32px', color: colors.textSecondary }}>{t('cards.preview.title')}</h3>
                        {generatedCard ? (
                            <div>
                                <div style={{ backgroundColor: qrBgColor, padding: '32px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', marginBottom: '32px', display: 'inline-block' }}>
                                    <img src={`data:image/png;base64,${generatedCard.qr_image_base64}`} alt="QR" style={{ width: '200px', height: '200px' }} />
                                </div>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>{generatedCard.pupil_name}</h4>
                                <p style={{ fontSize: '0.9rem', color: colors.textSecondary, fontWeight: 700, fontFamily: 'monospace', marginBottom: '32px' }}>{generatedCard.cnive_id}</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <button style={{ padding: '14px', borderRadius: '14px', border: `1px solid ${colors.border}20`, backgroundColor: colors.bg, color: colors.text, fontWeight: 700, cursor: 'pointer' }}><Download size={18}/></button>
                                    <button onClick={() => handlePrint(generatedCard.id)} style={{ padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: colors.primary, color: 'white', fontWeight: 700, cursor: 'pointer' }}><Printer size={18}/></button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '80px 0', opacity: 0.3 }}>
                                <QrCode size={120} strokeWidth={1} style={{ marginBottom: '24px' }}/>
                                <p style={{ fontWeight: 600 }}>{t('cards.preview.waiting')}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '48px', border: `1px solid ${colors.border}10` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('cards.tabs.history')}</h2>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            {(user?.role === 'GTE_ADMIN' || user?.role === 'SCHOOL_DIRECTOR') && selectedCardsToPrint.length > 0 && (
                                <button 
                                    onClick={() => handlePrint()} 
                                    style={{ padding: '10px 20px', borderRadius: '14px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
                                >
                                    <Printer size={18}/> Imprimer la sélection ({selectedCardsToPrint.length})
                                </button>
                            )}
                            <div style={{ padding: '10px 20px', backgroundColor: colors.bg, borderRadius: '14px', fontSize: '0.9rem', fontWeight: 700, color: colors.textSecondary }}>{cards.length} {t('common.total')}</div>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                        {cards.map(card => (
                            <div key={card.id} style={{ padding: '24px', backgroundColor: selectedCardsToPrint.includes(card.id) ? colors.primary + '10' : colors.bg, borderRadius: '24px', border: `1px solid ${selectedCardsToPrint.includes(card.id) ? colors.primary : colors.border + '05'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{card.pupil_name}</h4>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: colors.textSecondary, fontWeight: 600 }}>{card.cnive_id}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={async () => {
                                        setLoading(true)
                                        try {
                                            const res = await apiClient.get(`/cards/details/${card.id}`)
                                            // Get full health/pupil details too
                                            const pupilRes = await apiClient.get(`/pupils/${card.pupil_id}`)
                                            const healthRes = await apiClient.get(`/health-records/pupil/${card.pupil_id}`).catch(() => ({ data: null }))
                                            
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
                                    }} style={{ width: '44px', height: '44px', borderRadius: '14px', border: 'none', backgroundColor: colors.card, color: colors.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('common.view')}><Eye size={20}/></button>
                                    <button onClick={() => handlePrint(card.id)} style={{ width: '44px', height: '44px', borderRadius: '14px', border: 'none', backgroundColor: colors.primary, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('common.print')}><Printer size={20}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalCards > pageSize && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '40px' }}>
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{ padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: colors.bg, color: colors.text, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                            >
                                <ChevronLeft size={20}/>
                            </button>
                            
                            <div style={{ display: 'flex', gap: '8px' }}>
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

            {/* Premium Digital ID Card Modal */}
            {showDigitalCard && selectedPupilDetails && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 3000, padding: '16px 24px', overflowY: 'auto' }} onClick={() => setShowDigitalCard(false)}>
                    <div style={{ position: 'relative', maxWidth: '420px', width: '100%', borderRadius: '32px', marginTop: '16px', marginBottom: '16px' }} className="hide-scrollbar" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowDigitalCard(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3001 }}><X size={20}/></button>
                        
                        {/* THE CARD */}
                        <div style={{
                            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                            borderRadius: '32px',
                            overflow: 'hidden',
                            boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            position: 'relative'
                        }}>
                            {/* Decorative blur */}
                            <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

                            {/* Header */}
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ShieldCheck size={18} color="white" />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, color: 'white', fontWeight: 900, fontSize: '0.95rem', letterSpacing: '1px' }}>CNIVE</h4>
                                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase' }}>{t('common.republic_senegal')}</p>
                                    </div>
                                </div>
                                <div style={{ padding: '4px 10px', borderRadius: '20px', backgroundColor: '#10b98120', color: '#10b981', fontSize: '0.6rem', fontWeight: 800, border: '1px solid #10b98140' }}>
                                    {selectedPupilDetails.status === 'ACTIVE' ? t('common.valid') : t('common.invalid')}
                                </div>
                            </div>

                            {/* ★ QR CODE EN PREMIER — bien visible dès l'ouverture ★ */}
                            <div style={{ backgroundColor: '#ffffff', padding: '20px 24px', textAlign: 'center' }}>
                                <p style={{ margin: '0 0 12px 0', fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Scanner ce QR code
                                </p>
                                <div style={{ display: 'inline-block', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '2px solid #e2e8f0', marginBottom: '12px' }}>
                                    <img src={`data:image/png;base64,${selectedPupilDetails.qr_image_base64}`} alt="QR Code" style={{ width: '160px', height: '160px', display: 'block' }} />
                                </div>
                                <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: '#6366f1', fontFamily: 'monospace', letterSpacing: '1px' }}>
                                    {selectedPupilDetails.cnive_id}
                                </p>
                            </div>

                            {/* Identity — compact row */}
                            <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ width: '72px', height: '72px', flexShrink: 0, borderRadius: '50%', border: '3px solid #4f46e5', overflow: 'hidden', backgroundColor: '#1e293b', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {selectedPupilDetails.photo_url ? (
                                        <img 
                                            src={getPupilPhotoUrl(selectedPupilDetails.photo_url)} 
                                            alt="Profile" 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} 
                                            referrerPolicy="no-referrer"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : null}
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                                        <Users size={36} />
                                    </div>
                                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '22px', height: '22px', backgroundColor: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0f172a', zIndex: 2 }}>
                                        <ShieldCheck size={12} color="white" />
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPupilDetails.first_name} {selectedPupilDetails.last_name}</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                                        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '12px' }}>
                                            <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                                                <SchoolIcon size={10} /> <span style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase' }}>{t('common.school')}</span>
                                            </div>
                                            <p style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPupilDetails.school_name || t('common.not_specified')}</p>
                                        </div>
                                        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '12px' }}>
                                            <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                                                <Phone size={10} /> <span style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase' }}>{t('common.tutor')}</span>
                                            </div>
                                            <p style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '0.7rem' }}>{selectedPupilDetails.tutor_phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Health alert — compact */}
                            {selectedPupilDetails.health && (
                                <div style={{ padding: '0 24px 16px' }}>
                                    <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Heart size={16} color="#ef4444" />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                                            <span style={{ color: '#ef4444', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}>{t('common.health')}</span>
                                            <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 900 }}>{selectedPupilDetails.health.blood_group}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ padding: '0 24px 24px', display: 'flex', gap: '10px' }}>
                                <button onClick={() => handlePrint(selectedPupilDetails.id)} style={{ flex: 1, padding: '14px', borderRadius: '14px', backgroundColor: '#4f46e5', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                    <Printer size={16} /> {t('common.print')}
                                </button>
                                <button onClick={() => {
                                    setShowDigitalCard(false)
                                    apiClient.get(`/cards/analytics/${selectedPupilDetails.pupil_id}`).then(r => {
                                        setSelectedPupilAnalytics({ ...r.data, pupil_name: selectedPupilDetails.pupil_name })
                                        setShowAnalyticsModal(true)
                                    })
                                }} style={{ padding: '14px 18px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Individual Analytics Modal */}
            {showAnalyticsModal && selectedPupilAnalytics && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '40px' }}>
                    <div style={{ backgroundColor: colors.card, width: '100%', maxWidth: '600px', borderRadius: '32px', padding: '48px', position: 'relative', border: `1px solid ${colors.border}10` }}>
                        <button onClick={() => setShowAnalyticsModal(false)} style={{ position: 'absolute', top: '32px', right: '32px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary }}><X size={24}/></button>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>{t('cards.tabs.overview')} : {selectedPupilAnalytics.pupil_name}</h2>
                        <p style={{ color: colors.textSecondary, fontWeight: 500, marginBottom: '40px' }}>{t('cards.subtitle')}</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                            <div style={{ padding: '24px', backgroundColor: colors.bg, borderRadius: '24px', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: colors.primary }}>{selectedPupilAnalytics.total_scans}</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', fontWeight: 800, color: colors.textSecondary }}>{t('cards.stats.total_scans')}</p>
                            </div>
                            <div style={{ padding: '24px', backgroundColor: colors.bg, borderRadius: '24px', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{selectedPupilAnalytics.last_scan ? new Date(selectedPupilAnalytics.last_scan).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'fr-FR') : '---'}</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', fontWeight: 800, color: colors.textSecondary }}>{t('dashboard.activity.now')}</p>
                            </div>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px' }}>{t('audit.title')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                            {selectedPupilAnalytics.logs.map((log: any, i: number) => (
                                <div key={i} style={{ padding: '16px 20px', backgroundColor: colors.bg, borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{log.location || t('common.not_specified')}</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: colors.textSecondary }}>{new Date(log.timestamp).toLocaleString(i18n.language === 'es' ? 'es-ES' : 'fr-FR')}</p>
                                    </div>
                                    <div style={{ padding: '6px 12px', borderRadius: '10px', backgroundColor: colors.primary + '15', color: colors.primary, fontSize: '0.7rem', fontWeight: 800 }}>{log.role}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Print Area - Hidden on screen, visible on print */}
            {printingCardsData.length > 0 && (
                <div id="print-area" style={{ display: 'none', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {printingCardsData.map((cardData, index) => (
                        <React.Fragment key={index}>
                            {/* RECTO (Front) */}
                            <div style={{
                                width: '85.6mm', height: '53.98mm', /* Format Carte de crédit standard */
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '10px',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                fontFamily: 'sans-serif',
                                color: '#0f172a',
                                boxSizing: 'border-box',
                                pageBreakInside: 'avoid',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Header with Nous Cims colors (Magenta) */}
                                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #E6007E', paddingBottom: '4px', marginBottom: '8px' }}>
                                    <h1 style={{ margin: 0, fontSize: '10px', fontWeight: '900', color: '#E6007E', letterSpacing: '0.5px' }}>CNIVE SÉNÉGAL</h1>
                                    <span style={{ fontSize: '7px', color: '#E6007E', fontWeight: 'bold' }}>PASS DIGITAL</span>
                                </div>
                                
                                {/* Body */}
                                <div style={{ display: 'flex', width: '100%', gap: '10px', flex: 1 }}>
                                    {/* Photo Placeholder / Image */}
                                    <div style={{ width: '22mm', height: '28mm', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                        {cardData.photo_url ? (
                                            <img 
                                                src={getPupilPhotoUrl(cardData.photo_url)} 
                                                alt="Élève" 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} 
                                                referrerPolicy="no-referrer"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        ) : null}
                                        <User size={30} color="#94a3b8" />
                                    </div>
                                    
                                    {/* Information */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <h2 style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', lineHeight: '1.2', color: '#333333' }}>{cardData.pupil_name}</h2>
                                        <p style={{ margin: '0 0 2px 0', fontSize: '8px', color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}><SchoolIcon size={8} color="#E6007E" /> {cardData.school_name || 'École non spécifiée'}</p>
                                        <p style={{ margin: '0 0 2px 0', fontSize: '8px', color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={8} color="#E6007E" /> {cardData.address || 'Adresse non renseignée'}</p>
                                        <p style={{ margin: '0', fontSize: '8px', color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}><Phone size={8} color="#E6007E" /> Tuteur: {cardData.tutor_phone || 'Non renseigné'}</p>
                                    </div>
                                </div>

                                {/* Footer Funding Acknowledgement */}
                                <div style={{ position: 'absolute', bottom: '4px', left: '12px', right: '12px', textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '6px', color: '#64748b', fontStyle: 'italic' }}>Projet soutenu et financé par la Fondation nous cims</p>
                                </div>
                                {/* Footer Background Color Strip (Magenta accent) */}
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: '#E6007E' }}></div>
                            </div>

                            {/* VERSO (Back) */}
                            <div style={{
                                width: '85.6mm', height: '53.98mm', /* Format Carte de crédit standard */
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '10px',
                                padding: '15px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: 'sans-serif',
                                color: '#0f172a',
                                boxSizing: 'border-box',
                                pageBreakInside: 'avoid',
                                position: 'relative'
                            }}>
                                <div style={{ marginBottom: '6px', textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '8px', fontWeight: 'bold', color: '#333333', textTransform: 'uppercase' }}>Identifiant National (CNIVE)</p>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#E6007E', fontWeight: '900', letterSpacing: '1px' }}>{cardData.cnive_id}</p>
                                </div>

                                <div style={{ width: '26mm', height: '26mm', backgroundColor: '#fff', padding: '2px', border: `2px solid #E6007E`, borderRadius: '4px' }}>
                                    <img src={`data:image/png;base64,${cardData.qr_image_base64}`} alt="QR Code" style={{ width: '100%', height: '100%' }} />
                                </div>

                                <div style={{ marginTop: '8px', width: '100%', textAlign: 'center', backgroundColor: '#f8fafc', padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ margin: 0, fontSize: '6.5px', color: '#ef4444', fontWeight: 'bold' }}>⚠️ EN CAS D'URGENCE :</p>
                                    <p style={{ margin: '1px 0 0 0', fontSize: '6.5px', color: '#475569' }}>Scannez ce QR Code pour accéder au dossier (groupe sanguin, allergies, contacts).</p>
                                </div>
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: '#E6007E' }}></div>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    )
}

export default CardsManagement
