import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Popup, CircleMarker, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import apiClient from '../api/client'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import { Map as MapIcon, Filter, Navigation, Info, School as SchoolIcon, Users, Plus, X, Eye } from 'lucide-react'

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface School {
    id: string
    name: string
    code: string
    latitude: number
    longitude: number
    pupil_count?: number
    avg_vulnerability?: number
}

const MapPage: React.FC = () => {
    const { t } = useTranslation()
    const { colors } = useTheme()
    const navigate = useNavigate()
    const [schools, setSchools] = useState<School[]>([])
    const [selectedFilter, setSelectedFilter] = useState('all')
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        city: 'Pikine',
        latitude: 14.7645,
        longitude: -17.3960
    })

    // Position centrée sur Pikine, Sénégal
    const pikineCenter: [number, number] = [14.7645, -17.3960]

    useEffect(() => {
        fetchSchools()
    }, [])

    const fetchSchools = () => {
        apiClient.get('/schools/')
            .then(res => setSchools(Array.isArray(res.data) ? res.data : []))
            .catch(console.error)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await apiClient.post('/schools/', formData)
            setSuccess(t('common.success'))
            setShowForm(false)
            fetchSchools()
            setFormData({
                name: '', code: '', address: '', city: 'Pikine',
                latitude: 14.7645, longitude: -17.3960
            })
            setTimeout(() => setSuccess(''), 3000)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Erreur lors de la création')
        } finally {
            setLoading(false)
        }
    }

    const getMarkerColor = (avgVulnerability?: number) => {
        if (!avgVulnerability) return '#3b82f6'
        if (avgVulnerability <= 25) return '#10b981'
        if (avgVulnerability <= 50) return '#f59e0b'
        if (avgVulnerability <= 75) return '#f97316'
        return '#ef4444'
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '14px 18px', backgroundColor: colors.bg,
        border: `1px solid ${colors.border}20`, borderRadius: '14px',
        color: colors.text, fontSize: '14px', boxSizing: 'border-box',
        outline: 'none'
    }

    return (
        <div className="max-w-7xl mx-auto pb-20">
            {/* Success Toast */}
            {success && (
                <div style={{
                    position: 'fixed', top: '24px', right: '24px', zIndex: 1100,
                    backgroundColor: '#10b981', color: 'white', padding: '16px 24px',
                    borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', fontWeight: 700
                }}>
                    ✓ {success}
                </div>
            )}
            {/* Premium Header */}
            <div className="rounded-3xl md:rounded-[32px] p-6 sm:p-8 md:p-12 mb-8 md:mb-10 relative overflow-hidden shadow-xl"
                 style={{
                     background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                     boxShadow: '0 20px 40px rgba(37, 99, 235, 0.2)'
                 }}>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 md:gap-8">
                        <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[28px] bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                            <MapIcon size={40} />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">{t('map.title')}</h1>
                            <p className="text-white/90 text-sm sm:text-base md:text-lg font-medium">{t('map.subtitle')}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowForm(true)}
                        className="bg-white px-6 py-4 rounded-2xl font-extrabold cursor-pointer flex items-center justify-center gap-3 shadow-lg transition-transform hover:scale-105 active:scale-95 shrink-0"
                        style={{ color: colors.primary }}
                    >
                        <Plus size={20}/> {t('map.add_school') || 'Nouvelle école'}
                    </button>
                </div>
                <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(40px)' }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 md:gap-8">
                <div className="flex flex-col gap-6">
                    {/* Map Container */}
                    <div className="h-[380px] sm:h-[480px] lg:h-[600px] rounded-3xl md:rounded-[32px] overflow-hidden relative shadow-xl border"
                         style={{ borderColor: `${colors.border}10` }}>
                        <MapContainer center={pikineCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">Openstreetmap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Circle 
                                center={pikineCenter} 
                                radius={4500} 
                                interactive={false}
                                pathOptions={{ fillColor: '#003B5C', color: '#003B5C', weight: 2, fillOpacity: 0.05, dashArray: '5, 10' }} 
                            />
                            {schools
                                .filter(school => {
                                    if (school.latitude == null || school.longitude == null || isNaN(Number(school.latitude)) || isNaN(Number(school.longitude))) {
                                        return false
                                    }
                                    if (selectedFilter === 'all') return true
                                    if (selectedFilter === 'critical') return (school.avg_vulnerability || 0) > 75
                                    if (selectedFilter === 'high') return (school.avg_vulnerability || 0) > 50 && (school.avg_vulnerability || 0) <= 75
                                    return true
                                })
                                .map((school) => (
                                    <CircleMarker
                                        key={school.id || `${school.latitude}-${school.longitude}`}
                                        center={[Number(school.latitude), Number(school.longitude)]}
                                        radius={16}
                                        pathOptions={{
                                            interactive: true,
                                            fillColor: getMarkerColor(school.avg_vulnerability),
                                            color: 'white',
                                            weight: 4,
                                            fillOpacity: 1
                                        }}
                                    >
                                        <Popup className="premium-popup" minWidth={240} maxWidth={320}>
                                            <div style={{ padding: '16px', width: '240px', maxWidth: '320px', backgroundColor: 'white', borderRadius: '16px', boxSizing: 'border-box' }}>
                                                <h3 className="popup-title" style={{ fontWeight: 800, fontSize: '1.1rem', margin: '0 0 12px 0', color: '#1e293b' }}>{school.name}</h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                                        <Navigation size={14} color={colors.primary}/> <span style={{ color: '#64748b' }}>{t('map.code')}: {school.code}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                                        <Users size={14} color={colors.primary}/> <span style={{ color: '#64748b' }}>{school.pupil_count || 0} {t('map.beneficiaries')}</span>
                                                    </div>
                                                    <div style={{ marginTop: '4px', padding: '10px', borderRadius: '12px', backgroundColor: getMarkerColor(school.avg_vulnerability) + '15', color: getMarkerColor(school.avg_vulnerability), fontWeight: 800, fontSize: '0.9rem', textAlign: 'center' }}>
                                                        {t('map.score')}: {school.avg_vulnerability && !isNaN(Number(school.avg_vulnerability)) ? Number(school.avg_vulnerability).toFixed(1) : 'N/A'}
                                                    </div>
                                                    {school.id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/pupils?school_id=${school.id}`)}
                                                            style={{
                                                                marginTop: '6px',
                                                                width: '100%',
                                                                padding: '10px 14px',
                                                                borderRadius: '12px',
                                                                border: 'none',
                                                                backgroundColor: colors.primary,
                                                                color: 'white',
                                                                fontWeight: 800,
                                                                fontSize: '0.8rem',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '6px'
                                                            }}
                                                        >
                                                            <Eye size={14} /> Voir les élèves
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                        </MapContainer>

                        {/* Map Overlay Controls */}
                        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3">
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: '10px 14px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Filter size={18} color="#2563eb"/>
                                <select 
                                    value={selectedFilter} 
                                    onChange={(e) => setSelectedFilter(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="all">{t('map.all_schools')}</option>
                                    <option value="critical">{t('map.critical_cases')}</option>
                                    <option value="high">{t('map.high_priority')}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                    <div className="rounded-3xl p-6 md:p-8 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                        <h3 className="text-base font-extrabold mb-6 flex items-center gap-2.5">
                            <Info size={18} color={colors.primary}/> {t('map.legend')}
                        </h3>
                        <div className="flex flex-col gap-4">
                            {[
                                { label: `${t('vulnerability.low')} (0-25)`, color: '#10b981' },
                                { label: `${t('vulnerability.moderate')} (26-50)`, color: '#f59e0b' },
                                { label: `${t('vulnerability.high')} (51-75)`, color: '#f97316' },
                                { label: `${t('vulnerability.critical')} (76+)`, color: '#ef4444' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}40` }} />
                                    <span className="text-sm font-semibold" style={{ color: colors.textSecondary }}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl p-6 md:p-8 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                        <h3 className="text-base font-extrabold mb-6 flex items-center gap-2.5">
                            <SchoolIcon size={18} color={colors.primary}/> {t('map.zone_stats')}
                        </h3>
                        <div className="flex flex-col gap-6">
                            <div>
                                <p className="m-0 text-xs font-bold" style={{ color: colors.textSecondary }}>{t('map.followed_schools')}</p>
                                <p className="mt-1 mb-0 text-3xl font-black" style={{ color: colors.primary }}>{schools.length}</p>
                            </div>
                            <div>
                                <p className="m-0 text-xs font-bold" style={{ color: colors.textSecondary }}>{t('map.coverage')}</p>
                                <p className="mt-1 mb-0 text-xl font-extrabold">Pikine - guédiawaye</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.3; }
                    50% { transform: scale(1.3); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 0.3; }
                }
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
                .school-marker {
                    background: none !important;
                    border: none !important;
                }
                .popup-title {
                    color: #1e293b !important;
                }
                .popup-text {
                    color: #64748b !important;
                }
            `}</style>

            {/* Form Modal */}
            {showForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }} onClick={() => setShowForm(false)}>
                    <div className="rounded-3xl p-6 md:p-10 max-w-xl w-full relative shadow-2xl" style={{ backgroundColor: colors.card }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: colors.textSecondary, cursor: 'pointer' }}><X size={24}/></button>
                        
                        <h2 className="text-xl md:text-2xl font-extrabold mb-8 flex items-center gap-3 pr-8">
                            <SchoolIcon size={28} color={colors.primary}/> {t('map.add_school') || 'Ajouter une école'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4 mb-4">
                                <div>
                                    <label className="block mb-2 text-xs font-bold" style={{ color: colors.textSecondary }}>{t('map.school_name') || 'Nom de l\'école'}</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} required />
                                </div>
                                <div>
                                    <label className="block mb-2 text-xs font-bold" style={{ color: colors.textSecondary }}>{t('map.code') || 'Code'}</label>
                                    <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} style={inputStyle} required />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block mb-2 text-xs font-bold" style={{ color: colors.textSecondary }}>{t('map.address') || 'Adresse'}</label>
                                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={inputStyle} required />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block mb-2 text-xs font-bold" style={{ color: colors.textSecondary }}>Latitude</label>
                                    <input type="number" step="any" value={formData.latitude} onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})} style={inputStyle} required />
                                </div>
                                <div>
                                    <label className="block mb-2 text-xs font-bold" style={{ color: colors.textSecondary }}>Longitude</label>
                                    <input type="number" step="any" value={formData.longitude} onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})} style={inputStyle} required />
                                </div>
                            </div>

                            {error && <p className="text-red-500 mb-4 text-sm font-semibold">{error}</p>}

                            <button 
                                type="submit" 
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    backgroundColor: colors.primary,
                                    color: 'white',
                                    padding: '18px',
                                    borderRadius: '18px',
                                    border: 'none',
                                    fontWeight: 800,
                                    fontSize: '1.1rem',
                                    cursor: 'pointer',
                                    boxShadow: `0 10px 20px ${colors.primary}30`,
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? '...' : t('common.save') || 'Enregistrer'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MapPage
