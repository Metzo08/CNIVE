import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Popup, CircleMarker, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import apiClient from '../api/client'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import { Map as MapIcon, Filter, Layers, Navigation, Info, School as SchoolIcon, Users, Plus, X, MapPin } from 'lucide-react'

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
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
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
            <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                borderRadius: '32px', padding: '48px', marginBottom: '40px',
                position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(37, 99, 235, 0.2)'
            }}>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <div style={{ width: '96px', height: '96px', borderRadius: '28px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <MapIcon size={48} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>{t('map.title')}</h1>
                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', fontWeight: 500 }}>{t('map.subtitle')}</p>
                    </div>
                    <button 
                        onClick={() => setShowForm(true)}
                        style={{
                            marginLeft: 'auto',
                            backgroundColor: 'white',
                            color: colors.primary,
                            padding: '16px 32px',
                            borderRadius: '20px',
                            border: 'none',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                            transition: 'transform 0.2s'
                        }}
                    >
                        <Plus size={20}/> {t('map.add_school') || 'Nouvelle École'}
                    </button>
                </div>
                <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(40px)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Map Container */}
                    <div style={{ 
                        height: '600px', borderRadius: '32px', overflow: 'hidden', 
                        border: `1px solid ${colors.border}10`, position: 'relative',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                    }}>
                        <MapContainer center={pikineCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {/* Zone d'intervention Nous Cims - interactive=false pour ne pas bloquer les clics */}
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
                                                    <div style={{ marginTop: '8px', padding: '10px', borderRadius: '12px', backgroundColor: getMarkerColor(school.avg_vulnerability) + '15', color: getMarkerColor(school.avg_vulnerability), fontWeight: 800, fontSize: '0.9rem', textAlign: 'center' }}>
                                                        {t('map.score')}: {school.avg_vulnerability && !isNaN(Number(school.avg_vulnerability)) ? Number(school.avg_vulnerability).toFixed(1) : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                        </MapContainer>

                        {/* Map Overlay Controls */}
                        <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: '12px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Filter size={18} color="#2563eb"/>
                                <select 
                                    value={selectedFilter} 
                                    onChange={(e) => setSelectedFilter(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ backgroundColor: colors.card, borderRadius: '24px', padding: '32px', border: `1px solid ${colors.border}10` }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Info size={18} color={colors.primary}/> {t('map.legend')}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {[
                                { label: `${t('vulnerability.low')} (0-25)`, color: '#10b981' },
                                { label: `${t('vulnerability.moderate')} (26-50)`, color: '#f59e0b' },
                                { label: `${t('vulnerability.high')} (51-75)`, color: '#f97316' },
                                { label: `${t('vulnerability.critical')} (76+)`, color: '#ef4444' }
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}40` }} />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: colors.textSecondary }}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ backgroundColor: colors.card, borderRadius: '24px', padding: '32px', border: `1px solid ${colors.border}10` }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <SchoolIcon size={18} color={colors.primary}/> {t('map.zone_stats')}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: colors.textSecondary }}>{t('map.followed_schools')}</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '2rem', fontWeight: 900, color: colors.primary }}>{schools.length}</p>
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: colors.textSecondary }}>{t('map.coverage')}</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 800 }}>Pikine - Guédiawaye</p>
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
                .premium-tooltip::before {
                    display: none !important;
                }
                .leaflet-tooltip-top.premium-tooltip:before,
                .leaflet-tooltip-bottom.premium-tooltip:before,
                .leaflet-tooltip-left.premium-tooltip:before,
                .leaflet-tooltip-right.premium-tooltip:before {
                    display: none !important;
                }
            `}</style>

            {/* Form Modal */}
            {showForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px' }} onClick={() => setShowForm(false)}>
                    <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '40px', maxWidth: '600px', width: '100%', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: colors.textSecondary, cursor: 'pointer' }}><X size={24}/></button>
                        
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <SchoolIcon size={32} color={colors.primary}/> {t('map.add_school') || 'Ajouter une école'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: colors.textSecondary }}>{t('map.school_name') || 'Nom de l\'école'}</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: colors.textSecondary }}>{t('map.code') || 'Code'}</label>
                                    <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} style={inputStyle} required />
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: colors.textSecondary }}>{t('map.address') || 'Adresse'}</label>
                                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={inputStyle} required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: colors.textSecondary }}>Latitude</label>
                                    <input type="number" step="any" value={formData.latitude} onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})} style={inputStyle} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: colors.textSecondary }}>Longitude</label>
                                    <input type="number" step="any" value={formData.longitude} onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})} style={inputStyle} required />
                                </div>
                            </div>

                            {error && <p style={{ color: '#ef4444', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>{error}</p>}

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
