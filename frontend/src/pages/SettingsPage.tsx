import React, { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import { Settings, User, Shield, Palette, Lock, Smartphone, CheckCircle2, AlertCircle, Moon, Sun, Key, QrCode, Globe } from 'lucide-react'

const SettingsPage: React.FC = () => {
    const { t, i18n } = useTranslation()
    const { colors, mode, toggleTheme } = useTheme()
    const { user } = useAuth()
    const [userEmail, setUserEmail] = useState('')
    const [mfaStatus, setMfaStatus] = useState<{ mfa_enabled: boolean, mfa_configured: boolean } | null>(null)
    const [mfaSetup, setMfaSetup] = useState<{ secret: string, provisioning_uri: string } | null>(null)
    const [mfaCode, setMfaCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        const email = user?.email || 'demo@cnive.sn'
        setUserEmail(email)
        checkMfaStatus(email)
    }, [user])

    const checkMfaStatus = async (email: string) => {
        try {
            const response = await apiClient.get(`/auth/mfa/status/${email}`)
            setMfaStatus(response.data)
        } catch (error) { console.error('Error checking MFA status:', error) }
    }

    const setupMfa = async () => {
        setLoading(true)
        setMessage(null)
        try {
            const response = await apiClient.post(`/auth/mfa/setup?email=${encodeURIComponent(userEmail)}`)
            setMfaSetup(response.data)
            setMessage({ type: 'success', text: t('common.success') })
        } catch (error: any) {
            setMessage({ type: 'error', text: t('common.error') })
        } finally { setLoading(false) }
    }

    const enableMfa = async () => {
        if (mfaCode.length !== 6) return
        setLoading(true)
        setMessage(null)
        try {
            await apiClient.post(`/auth/mfa/enable?email=${encodeURIComponent(userEmail)}&code=${mfaCode}`)
            setMessage({ type: 'success', text: t('common.success') })
            setMfaSetup(null)
            setMfaCode('')
            checkMfaStatus(userEmail)
        } catch (error: any) {
            setMessage({ type: 'error', text: t('common.error') })
        } finally { setLoading(false) }
    }

    const disableMfa = async () => {
        const password = prompt(t('common.confirm'))
        if (!password) return
        setLoading(true)
        setMessage(null)
        try {
            await apiClient.post(`/auth/mfa/disable?email=${encodeURIComponent(userEmail)}&password=${encodeURIComponent(password)}`)
            setMessage({ type: 'success', text: t('common.success') })
            checkMfaStatus(userEmail)
        } catch (error: any) {
            setMessage({ type: 'error', text: t('common.error') })
        } finally { setLoading(false) }
    }

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng)
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>
            <div style={{
                background: 'linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 100%)',
                borderRadius: '32px', padding: '48px', marginBottom: '40px',
                position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(30, 41, 59, 0.2)'
            }}>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Settings size={40} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>{t('settings.title')}</h1>
                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', fontWeight: 500 }}>{t('settings.profile')}</p>
                    </div>
                </div>
            </div>

            {message && (
                <div style={{ backgroundColor: message.type === 'success' ? '#10b98115' : '#ef444415', border: `1px solid ${message.type === 'success' ? '#10b98140' : '#ef444440'}`, borderRadius: '20px', padding: '24px', marginBottom: '32px', color: message.type === 'success' ? '#10b981' : '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {message.type === 'success' ? <CheckCircle2/> : <AlertCircle/>} {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '40px', border: `1px solid ${colors.border}10` }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}><User size={20} color={colors.primary}/> {t('settings.profile')}</h3>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 800, color: colors.textSecondary, textTransform: 'uppercase' }}>Email</label>
                            <input type="email" value={userEmail} disabled
                                style={{ width: '100%', padding: '18px 24px', backgroundColor: colors.bg, border: `1px solid ${colors.border}10`, borderRadius: '16px', color: colors.textSecondary, fontSize: '1rem', fontWeight: 600, outline: 'none' }}/>
                        </div>
                    </div>

                    <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '40px', border: `1px solid ${colors.border}10` }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}><Palette size={20} color={colors.primary}/> {t('settings.appearance')}</h3>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: colors.bg, borderRadius: '20px', marginBottom: '20px' }}>
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 700 }}>{t('settings.appearance')}</h4>
                            </div>
                            <button onClick={toggleTheme} style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: colors.card, border: `1px solid ${colors.border}10`, color: colors.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {mode === 'dark' ? <Moon size={22}/> : <Sun size={22}/>}
                            </button>
                        </div>

                        <div style={{ padding: '20px', backgroundColor: colors.bg, borderRadius: '20px' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}><Globe size={18}/> {t('settings.language')}</h4>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => changeLanguage('fr')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: i18n.language.startsWith('fr') ? `2px solid ${colors.primary}` : `1px solid ${colors.border}20`, backgroundColor: i18n.language.startsWith('fr') ? `${colors.primary}10` : colors.card, color: i18n.language.startsWith('fr') ? colors.primary : colors.text, fontWeight: 800, cursor: 'pointer' }}>Français</button>
                                <button onClick={() => changeLanguage('es')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: i18n.language.startsWith('es') ? `2px solid ${colors.primary}` : `1px solid ${colors.border}20`, backgroundColor: i18n.language.startsWith('es') ? `${colors.primary}10` : colors.card, color: i18n.language.startsWith('es') ? colors.primary : colors.text, fontWeight: 800, cursor: 'pointer' }}>Español</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div style={{ backgroundColor: colors.card, borderRadius: '32px', padding: '40px', border: `1px solid ${colors.border}10` }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}><Shield size={20} color={colors.primary}/> {t('settings.security')}</h3>
                        
                        {mfaStatus?.mfa_enabled ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ padding: '24px', backgroundColor: '#10b98110', borderRadius: '24px', border: '1px solid #10b98120', display: 'flex', gap: '16px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={20}/></div>
                                    <div>
                                        <h4 style={{ margin: 0, color: '#10b981', fontWeight: 800 }}>MFA Activé</h4>
                                    </div>
                                </div>
                                <button onClick={disableMfa} style={{ padding: '18px', borderRadius: '16px', border: '1px solid #ef444430', backgroundColor: 'transparent', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}>{t('common.delete')} MFA</button>
                            </div>
                        ) : mfaSetup ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                <div style={{ textAlign: 'center', padding: '24px', backgroundColor: 'white', borderRadius: '24px', display: 'inline-block', margin: '0 auto' }}>
                                    <div style={{ width: '200px', height: '200px', backgroundColor: '#f8fafc', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
                                        <QrCode size={64} color="#1e293b"/>
                                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>QR CODE</span>
                                    </div>
                                </div>
                                <div>
                                    <input type="text" value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000"
                                        style={{ width: '100%', padding: '20px', backgroundColor: colors.bg, border: `2px solid ${mfaCode.length === 6 ? colors.primary : colors.border + '20'}`, borderRadius: '16px', color: colors.text, fontSize: '2rem', fontWeight: 900, textAlign: 'center', letterSpacing: '12px', outline: 'none' }}/>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button onClick={enableMfa} disabled={mfaCode.length !== 6} style={{ flex: 1, padding: '20px', backgroundColor: colors.primary, color: 'white', borderRadius: '20px', border: 'none', fontWeight: 800, cursor: mfaCode.length === 6 ? 'pointer' : 'not-allowed', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>{t('common.confirm')}</button>
                                    <button onClick={() => setMfaSetup(null)} style={{ padding: '20px', borderRadius: '20px', border: `1px solid ${colors.border}10`, backgroundColor: colors.card, color: colors.textSecondary, fontWeight: 700, cursor: 'pointer' }}>{t('common.cancel')}</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <button onClick={setupMfa} style={{ padding: '20px', backgroundColor: colors.primary, color: 'white', borderRadius: '20px', border: 'none', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>
                                    <Key size={20}/> {t('common.confirm')} MFA
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SettingsPage
