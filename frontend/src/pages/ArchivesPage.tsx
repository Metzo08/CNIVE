import React, { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import apiClient from '../api/client'
import { useTranslation } from 'react-i18next'
import { Archive, RefreshCcw, Trash2, Search, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'

interface HealthRecord {
    id: string
    pupil_id: string
    blood_group: string
    allergies: string
    chronic_conditions: string
    cmu_status: string
    cmu_number: string
    health_facility: string
    is_archived: boolean
    created_at: string
    pupil?: Pupil
}

interface Pupil {
    id: string
    cnive_id: string
    first_name: string
    last_name: string
}

const ArchivesPage: React.FC = () => {
    const { t, i18n } = useTranslation()
    const { colors } = useTheme()
    const navigate = useNavigate()
    
    const [archivedRecords, setArchivedRecords] = useState<HealthRecord[]>([])
    const [pupils, setPupils] = useState<Pupil[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch ONLY archived health records - Using the new backend filter
            const recordsRes = await apiClient.get('/health-records/', { 
                params: { is_archived: true, limit: 1000 } 
            })
            
            const rawRecords = recordsRes.data.items || recordsRes.data || []
            console.log('Fetched archived records:', rawRecords.length)
            
            setArchivedRecords(rawRecords)
        } catch (error) {
            console.error('Error fetching archives:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleRestore = async () => {
        if (!selectedRecordId) return
        try {
            await apiClient.put(`/health-records/${selectedRecordId}/archive?archive=false`)
            fetchData()
            setShowRestoreConfirm(false)
            setSelectedRecordId(null)
        } catch (error) {
            console.error('Error restoring:', error)
        }
    }

    const handleDeletePermanently = async () => {
        if (!selectedRecordId) return
        try {
            await apiClient.delete(`/health-records/${selectedRecordId}`)
            fetchData()
            setShowDeleteConfirm(false)
            setSelectedRecordId(null)
        } catch (error) {
            console.error('Error deleting:', error)
        }
    }

    const filteredRecords = archivedRecords.filter(r => {
        const fullName = `${r.pupil?.first_name} ${r.pupil?.last_name}`.toLowerCase()
        return fullName.includes(search.toLowerCase()) || r.pupil?.cnive_id.includes(search)
    })

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                <button 
                    onClick={() => navigate('/health')}
                    style={{ 
                        width: '48px', height: '48px', borderRadius: '14px', border: 'none', 
                        backgroundColor: colors.bgSecondary, color: colors.text, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px' }}>{t('archives.title')}</h1>
                    <p style={{ color: colors.textSecondary, margin: 0, fontWeight: 500 }}>{t('archives.subtitle')}</p>
                </div>
            </div>

            <div style={{ position: 'relative', marginBottom: '32px' }}>
                <Search style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary }} size={20} />
                <input 
                    type="text" 
                    placeholder={t('archives.search_placeholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ 
                        width: '100%', padding: '18px 20px 18px 56px', backgroundColor: colors.card,
                        border: `1px solid ${colors.border}10`, borderRadius: '20px',
                        color: colors.text, fontSize: '1rem', outline: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                    }}
                />
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>{t('common.loading')}</p>
            ) : filteredRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 40px', backgroundColor: colors.card, borderRadius: '32px', border: `1px solid ${colors.border}10` }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: colors.textSecondary }}>
                        <Archive size={40} />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>{t('archives.empty')}</h3>
                    <p style={{ color: colors.textSecondary, maxWidth: '400px', margin: '0 auto' }}>{t('archives.subtitle')}</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                    {filteredRecords.map(record => {
                        return (
                            <div key={record.id} style={{ backgroundColor: colors.card, borderRadius: '28px', padding: '28px', border: `1px solid ${colors.border}10`, position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.primary, fontSize: '1.2rem', fontWeight: 900 }}>
                                        {record.pupil?.first_name?.[0]}{record.pupil?.last_name?.[0]}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => { setSelectedRecordId(record.pupil_id); setShowRestoreConfirm(true); }}
                                            style={{ padding: '10px', borderRadius: '12px', backgroundColor: `${colors.primary}10`, border: 'none', color: colors.primary, cursor: 'pointer' }}
                                            title={t('archives.restore')}
                                        >
                                            <RefreshCcw size={18}/>
                                        </button>
                                        <button 
                                            onClick={() => { setSelectedRecordId(record.pupil_id); setShowDeleteConfirm(true); }}
                                            style={{ padding: '10px', borderRadius: '12px', backgroundColor: '#ef444410', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                            title={t('archives.delete_permanent')}
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800 }}>{record.pupil?.first_name} {record.pupil?.last_name}</h3>
                                <p style={{ margin: '0 0 20px 0', color: colors.textSecondary, fontSize: '0.85rem', fontWeight: 600 }}>ID: {record.pupil?.cnive_id}</p>
                                
                                <div style={{ backgroundColor: colors.bg, padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
                                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: colors.textSecondary, textTransform: 'uppercase' }}>{t('archives.last_modification')}</p>
                                    <p style={{ margin: '4px 0 0 0', fontWeight: 700, fontSize: '0.9rem' }}>{new Date(record.created_at).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'fr-FR')}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <ConfirmModal 
                isOpen={showRestoreConfirm}
                onCancel={() => setShowRestoreConfirm(false)}
                onConfirm={handleRestore}
                title={t('archives.restore') + " ?"}
                message={t('archives.subtitle')}
                confirmText={t('archives.restore') as string}
                confirmColor={colors.primary}
                icon="🔄"
            />

            <ConfirmModal 
                isOpen={showDeleteConfirm}
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeletePermanently}
                title={t('archives.delete_permanent') + " ?"}
                message={t('audit.actions.DELETE_PUPIL')}
                confirmText={t('common.delete') as string}
                confirmColor="#ef4444"
                icon="⚠️"
            />
        </div>
    )
}

export default ArchivesPage
