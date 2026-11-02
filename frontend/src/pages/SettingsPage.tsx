import React, { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client'
import { Settings, User, Shield, Palette, Lock, CheckCircle2, AlertCircle, Moon, Sun, Key, QrCode, Globe } from 'lucide-react'

const SettingsPage: React.FC = () => {
    const { t, i18n } = useTranslation()
    const { colors, mode, toggleTheme } = useTheme()
    const { user } = useAuth()
    const [userEmail, setUserEmail] = useState('')
    const [mfaStatus, setMfaStatus] = useState<{ mfa_enabled: boolean, mfa_configured: boolean } | null>(null)
    const [mfaSetup, setMfaSetup] = useState<{ secret: string, provisioning_uri: string } | null>(null)
    const [mfaCode, setMfaCode] = useState('')
    const [, setLoading] = useState(false)
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
        <div className="max-w-5xl mx-auto pb-20">
            <div className="rounded-3xl md:rounded-[32px] p-6 sm:p-8 md:p-12 mb-8 md:mb-10 relative overflow-hidden shadow-xl"
                 style={{
                     background: 'linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 100%)',
                     boxShadow: '0 20px 40px rgba(30, 41, 59, 0.2)'
                 }}>
                <div className="relative z-10 flex items-center gap-5 md:gap-8">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                        <Settings size={36} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">{t('settings.title')}</h1>
                        <p className="text-white/90 text-sm sm:text-base md:text-lg font-medium">{t('settings.profile')}</p>
                    </div>
                </div>
            </div>

            {message && (
                <div className="rounded-2xl p-5 mb-8 font-bold flex items-center gap-3 border"
                     style={{ backgroundColor: message.type === 'success' ? '#10b98115' : '#ef444415', borderColor: message.type === 'success' ? '#10b98140' : '#ef444440', color: message.type === 'success' ? '#10b981' : '#ef4444' }}>
                    {message.type === 'success' ? <CheckCircle2/> : <AlertCircle/>} {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="flex flex-col gap-6 md:gap-8">
                    <div className="rounded-3xl md:rounded-[32px] p-6 md:p-10 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                        <h3 className="text-lg md:text-xl font-extrabold mb-6 md:mb-8 flex items-center gap-3"><User size={20} color={colors.primary}/> {t('settings.profile')}</h3>
                        <div>
                            <label className="block mb-2 text-xs font-extrabold" style={{ color: colors.textSecondary }}>Email</label>
                            <input type="email" value={userEmail} disabled
                                className="w-full py-4 px-5 rounded-2xl text-sm md:text-base font-semibold outline-none border"
                                style={{ backgroundColor: colors.bg, borderColor: `${colors.border}10`, color: colors.textSecondary }}/>
                        </div>
                    </div>

                    <div className="rounded-3xl md:rounded-[32px] p-6 md:p-10 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                        <h3 className="text-lg md:text-xl font-extrabold mb-6 md:mb-8 flex items-center gap-3"><Palette size={20} color={colors.primary}/> {t('settings.appearance')}</h3>
                        
                        <div className="flex justify-between items-center p-5 rounded-2xl mb-5" style={{ backgroundColor: colors.bg }}>
                            <div>
                                <h4 className="m-0 font-bold">{t('settings.appearance')}</h4>
                            </div>
                            <button onClick={toggleTheme} className="w-14 h-14 rounded-2xl border cursor-pointer flex items-center justify-center" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10`, color: colors.text }}>
                                {mode === 'dark' ? <Moon size={22}/> : <Sun size={22}/>}
                            </button>
                        </div>

                        <div className="p-5 rounded-2xl" style={{ backgroundColor: colors.bg }}>
                            <h4 className="m-0 mb-4 font-bold flex items-center gap-2.5"><Globe size={18}/> {t('settings.language')}</h4>
                            <div className="flex gap-2.5">
                                <button onClick={() => changeLanguage('fr')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: i18n.language.startsWith('fr') ? `2px solid ${colors.primary}` : `1px solid ${colors.border}20`, backgroundColor: i18n.language.startsWith('fr') ? `${colors.primary}10` : colors.card, color: i18n.language.startsWith('fr') ? colors.primary : colors.text, fontWeight: 800, cursor: 'pointer' }}>Français</button>
                                <button onClick={() => changeLanguage('es')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: i18n.language.startsWith('es') ? `2px solid ${colors.primary}` : `1px solid ${colors.border}20`, backgroundColor: i18n.language.startsWith('es') ? `${colors.primary}10` : colors.card, color: i18n.language.startsWith('es') ? colors.primary : colors.text, fontWeight: 800, cursor: 'pointer' }}>Español</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6 md:gap-8">
                    <div className="rounded-3xl md:rounded-[32px] p-6 md:p-10 border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                        <h3 className="text-lg md:text-xl font-extrabold mb-6 md:mb-8 flex items-center gap-3"><Shield size={20} color={colors.primary}/> {t('settings.security')}</h3>
                        
                        {mfaStatus?.mfa_enabled ? (
                            <div className="flex flex-col gap-6">
                                <div className="p-6 rounded-3xl border flex gap-4 items-center" style={{ backgroundColor: '#10b98110', borderColor: '#10b98120' }}>
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0"><Lock size={20}/></div>
                                    <div>
                                        <h4 className="m-0 text-emerald-500 font-extrabold">Mfa activé</h4>
                                    </div>
                                </div>
                                <button onClick={disableMfa} className="p-4 rounded-2xl border border-red-500/30 bg-transparent text-red-500 font-extrabold cursor-pointer">{t('common.delete')} mfa</button>
                            </div>
                        ) : mfaSetup ? (
                            <div className="flex flex-col gap-6">
                                <div className="text-center p-6 bg-white rounded-3xl inline-block mx-auto">
                                    <div className="w-48 h-48 bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-3">
                                        <QrCode size={64} color="#1e293b"/>
                                        <span className="text-xs text-slate-500 font-bold">Qr code</span>
                                    </div>
                                </div>
                                <div>
                                    <input type="text" value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000"
                                        style={{ width: '100%', padding: '20px', backgroundColor: colors.bg, border: `2px solid ${mfaCode.length === 6 ? colors.primary : colors.border + '20'}`, borderRadius: '16px', color: colors.text, fontSize: '2rem', fontWeight: 900, textAlign: 'center', letterSpacing: '12px', outline: 'none' }}/>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={enableMfa} disabled={mfaCode.length !== 6} style={{ flex: 1, padding: '18px', backgroundColor: colors.primary, color: 'white', borderRadius: '20px', border: 'none', fontWeight: 800, cursor: mfaCode.length === 6 ? 'pointer' : 'not-allowed', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>{t('common.confirm')}</button>
                                    <button onClick={() => setMfaSetup(null)} style={{ padding: '18px', borderRadius: '20px', border: `1px solid ${colors.border}10`, backgroundColor: colors.card, color: colors.textSecondary, fontWeight: 700, cursor: 'pointer' }}>{t('common.cancel')}</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                <button onClick={setupMfa} className="p-5 rounded-2xl text-white font-extrabold text-base cursor-pointer flex items-center justify-center gap-3" style={{ backgroundColor: colors.primary, boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>
                                    <Key size={20}/> {t('common.confirm')} mfa
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
