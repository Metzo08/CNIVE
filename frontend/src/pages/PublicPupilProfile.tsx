import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShieldCheck, Heart, School, AlertTriangle, Phone, Activity, Calendar, User, ArrowLeft, Download, ShieldAlert, CheckCircle2, Globe, MapPin, Loader } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import { useAuth } from '../context/AuthContext'
import { getPupilPhotoUrl } from '../utils/imageUtils'

const PublicPupilProfile: React.FC = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const { isAuthenticated } = useAuth()
    const [pupil, setPupil] = useState<any>(null)
    const [health, setHealth] = useState<any>(null)
    const [vulnerability, setVulnerability] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'success' | 'denied' | 'error'>('idle')

    const toggleLanguage = () => {
        const newLang = i18n.language === 'fr' ? 'es' : 'fr'
        i18n.changeLanguage(newLang)
    }

    // 📍 Capture GPS and send to backend for real hotspot tracking
    const captureAndSendGPS = async (pupilId: string) => {
        if (!navigator.geolocation) return
        setGpsStatus('requesting')
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                try {
                    await apiClient.post('/cards/track-public-scan', {
                        pupil_id: pupilId,
                        lat: latitude,
                        lon: longitude,
                        location_name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                        scanner_role: 'guest',
                        device_info: navigator.userAgent.substring(0, 255)
                    })
                    setGpsStatus('success')
                } catch {
                    setGpsStatus('error')
                }
            },
            () => {
                // GPS denied — still track without coordinates
                setGpsStatus('denied')
                apiClient.post('/cards/track-public-scan', {
                    pupil_id: pupilId,
                    scanner_role: 'guest',
                    device_info: navigator.userAgent.substring(0, 255)
                }).catch(() => {})
            },
            { timeout: 8000, enableHighAccuracy: true }
        )
    }

    useEffect(() => {
        const fetchScanData = async () => {
            try {
                const res = await apiClient.get(`/cards/scan-data/${id}`)
                if (isAuthenticated && res.data.pupil?.id) {
                    navigate(`/pupils/${res.data.pupil.id}`)
                    return
                }
                setPupil(res.data.pupil)
                setHealth(res.data.health)
                setVulnerability(res.data.vulnerability)
                // Trigger GPS capture after data is loaded
                if (id) captureAndSendGPS(id)
            } catch (err) {
                console.error("Erreur chargement profil public", err)
            } finally {
                setLoading(false)
            }
        }
        fetchScanData()
    }, [id, isAuthenticated])


    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid #1e293b', borderTop: '4px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                    <p style={{ fontWeight: 600 }}>{t('scan.loading')}</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        )
    }

    if (!pupil) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: 'white', padding: '20px' }}>
                <div style={{ textAlign: 'center', backgroundColor: '#1e293b', padding: '40px', borderRadius: '32px', border: '1px solid #ef4444' }}>
                    <ShieldAlert size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('scan.not_found')}</h2>
                    <p style={{ color: '#94a3b8', marginTop: '12px' }}>{t('scan.not_found_desc')}</p>
                </div>
            </div>
        )
    }

    const getVulnColor = (score: number) => {
        if (score >= 7) return '#ef4444'
        if (score >= 4) return '#f59e0b'
        return '#10b981'
    }

    const getVulnLabel = (score: number) => {
        if (score >= 7) return t('scan.critical')
        if (score >= 4) return t('scan.high')
        return t('scan.stable')
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: "'Inter', sans-serif", paddingBottom: '40px', overflowX: 'hidden' }}>
            {/* Header / Banner */}
            <div style={{ height: '120px', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '15px', left: '15px', right: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                        <ArrowLeft size={18} />
                    </button>
                    <button onClick={toggleLanguage} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                        <Globe size={16} />
                        {(i18n.language.charAt(0).toUpperCase() + i18n.language.slice(1).toLowerCase())}
                    </button>
                </div>
                <div style={{ position: 'absolute', bottom: '-50px', left: '50%', transform: 'translateX(-50%)' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid #0f172a', overflow: 'hidden', backgroundColor: '#1e293b', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {pupil.photo_url ? (
                            <img 
                                src={getPupilPhotoUrl(pupil.photo_url)} 
                                alt="Profile" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} 
                                referrerPolicy="no-referrer"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        ) : null}
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                            <User size={50} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Content */}
            <div style={{ marginTop: '60px', padding: '0 15px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>
                        {pupil.first_name} {pupil.last_name ? (pupil.last_name.charAt(0).toUpperCase() + '.') : ''}
                    </h1>
                    <CheckCircle2 size={20} color="#10b981" />
                </div>
                <p style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem', letterSpacing: '1px', margin: 0 }}>••••••••••••</p>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '5px 12px', borderRadius: '16px', fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <ShieldCheck size={12} /> {t('scan.certified')}
                    </div>
                    {/* GPS Tracking Status Badge */}
                    {gpsStatus === 'requesting' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '5px 12px', borderRadius: '16px', fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(99,102,241,0.2)' }}>
                            <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Localisation...
                        </div>
                    )}
                    {gpsStatus === 'success' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '5px 12px', borderRadius: '16px', fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(16,185,129,0.2)' }}>
                            <MapPin size={11} /> Gps enregistré
                        </div>
                    )}
                </div>
            </div>


            {/* Info Cards Grid */}
            <div style={{ padding: '20px 15px', display: 'grid', gap: '12px' }}>
                
                {/* Health Card */}
                <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Heart size={16} color="#ef4444" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>{t('scan.health_data')}</h3>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '14px', minWidth: 0 }}>
                            <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '0.65rem', fontWeight: 700 }}>{t('scan.blood_group')}</p>
                            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>{health?.blood_group || '?'}</p>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '14px', minWidth: 0 }}>
                            <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '0.65rem', fontWeight: 700 }}>{t('scan.gender')}</p>
                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{pupil.gender === 'M' ? t('scan.masculine') : t('scan.feminine')}</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '12px', background: 'rgba(239, 68, 68, 0.05)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <p style={{ margin: '0 0 4px 0', color: '#ef4444', fontSize: '0.65rem', fontWeight: 800 }}>{t('scan.allergies')}</p>
                        <p style={{ margin: 0, color: '#f8fafc', fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.4 }}>
                            {health?.allergies || t('scan.no_allergies')}
                        </p>
                    </div>
                </div>

                {/* School Card */}
                <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <School size={16} color="#3b82f6" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>{t('scan.education')}</h3>
                    </div>
                    
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600 }}>{t('scan.school')}</span>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>{pupil.school_name || t('scan.not_specified')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                            <div>
                                <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, display: 'block' }}>{t('scan.grade')}</span>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>{pupil.grade || 'N/A'}</span>
                            </div>
                            <div>
                                <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, display: 'block' }}>{t('scan.birth')}</span>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>{new Date(pupil.date_of_birth).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'es-ES')}</span>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Emergency Card */}
                <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Phone size={16} color="#f59e0b" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>{t('scan.emergency')}</h3>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(245, 158, 11, 0.05)', padding: '10px', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: '0 0 1px 0', fontSize: '0.65rem', color: '#94a3b8' }}>{t('scan.tutor')}</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>{pupil.tutor_phone || 'N/A'}</p>
                        </div>
                        <a href={`tel:${pupil.tutor_phone}`} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none', flexShrink: 0 }}>
                            <Phone size={16} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Footer Branding */}
            <div style={{ textAlign: 'center', padding: '10px', opacity: 0.5 }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, margin: 0 }}>Cnive • république du sénégal</p>
                <p style={{ fontSize: '0.6rem', fontWeight: 400, margin: '2px 0 0 0' }}>V2.7 - support multilingue</p>
            </div>
        </div>
    )
}

export default PublicPupilProfile
