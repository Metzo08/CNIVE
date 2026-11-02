import React, { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import apiClient from '../api/client'
import { useTranslation } from 'react-i18next'
import { Archive, RefreshCcw, Trash2, Search, ArrowLeft, Eye } from 'lucide-react'
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
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const recordsRes = await apiClient.get('/health-records/', { 
                params: { is_archived: true, limit: 1000 } 
            })
            
            const rawRecords = recordsRes.data.items || recordsRes.data || []
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
        return fullName.includes(search.toLowerCase()) || r.pupil?.cnive_id?.includes(search)
    })

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <div className="flex items-center gap-4 md:gap-5 mb-8 md:mb-10">
                <button 
                    onClick={() => navigate('/health')}
                    className="w-12 h-12 rounded-2xl border-none cursor-pointer flex items-center justify-center shrink-0 transition-transform active:scale-95"
                    style={{ backgroundColor: colors.bgSecondary, color: colors.text }}
                    title="Retour aux dossiers santé"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-1">{t('archives.title')}</h1>
                    <p className="m-0 font-medium text-sm md:text-base" style={{ color: colors.textSecondary }}>{t('archives.subtitle')}</p>
                </div>
            </div>

            <div className="relative mb-8">
                <Search style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary }} size={20} />
                <input 
                    type="text" 
                    placeholder={t('archives.search_placeholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full py-4 pr-5 pl-14 rounded-2xl text-sm md:text-base outline-none shadow-sm border"
                    style={{ 
                        backgroundColor: colors.card,
                        borderColor: `${colors.border}10`,
                        color: colors.text
                    }}
                />
            </div>

            {loading ? (
                <p className="text-center p-10" style={{ color: colors.textSecondary }}>{t('common.loading')}</p>
            ) : filteredRecords.length === 0 ? (
                <div className="text-center p-12 md:p-20 rounded-3xl md:rounded-[32px] border" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: colors.bg, color: colors.textSecondary }}>
                        <Archive size={40} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{t('archives.empty')}</h3>
                    <p className="max-w-md mx-auto text-sm" style={{ color: colors.textSecondary }}>{t('archives.subtitle')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                    {filteredRecords.map(record => {
                        return (
                            <div key={record.id} className="rounded-3xl p-6 md:p-7 border relative shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: colors.card, borderColor: `${colors.border}10` }}>
                                <div className="flex justify-between items-start mb-5">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shrink-0" style={{ backgroundColor: colors.bg, color: colors.primary }}>
                                        {record.pupil?.first_name?.[0]}{record.pupil?.last_name?.[0]}
                                    </div>
                                    <div className="flex gap-2">
                                        {record.pupil_id && (
                                            <button
                                                onClick={() => navigate(`/pupils/${record.pupil_id}`)}
                                                className="p-2.5 rounded-xl border-none cursor-pointer"
                                                style={{ backgroundColor: `${colors.border}20`, color: colors.text }}
                                                title="Voir le dossier élève"
                                            >
                                                <Eye size={18}/>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => { setSelectedRecordId(record.pupil_id); setShowRestoreConfirm(true); }}
                                            className="p-2.5 rounded-xl border-none cursor-pointer"
                                            style={{ backgroundColor: `${colors.primary}10`, color: colors.primary }}
                                            title={t('archives.restore')}
                                        >
                                            <RefreshCcw size={18}/>
                                        </button>
                                        <button 
                                            onClick={() => { setSelectedRecordId(record.pupil_id); setShowDeleteConfirm(true); }}
                                            className="p-2.5 rounded-xl border-none cursor-pointer"
                                            style={{ backgroundColor: '#ef444410', color: '#ef4444' }}
                                            title={t('archives.delete_permanent')}
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                                <h3 className="m-0 mb-1 text-lg font-extrabold truncate">{record.pupil?.first_name} {record.pupil?.last_name}</h3>
                                <p className="m-0 mb-5 text-xs font-semibold" style={{ color: colors.textSecondary }}>Id : {record.pupil?.cnive_id}</p>
                                
                                <div className="p-4 rounded-2xl" style={{ backgroundColor: colors.bg }}>
                                    <p className="m-0 text-[11px] font-bold" style={{ color: colors.textSecondary }}>{t('archives.last_modification')}</p>
                                    <p className="mt-1 mb-0 font-bold text-sm">{new Date(record.created_at).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'fr-FR')}</p>
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
