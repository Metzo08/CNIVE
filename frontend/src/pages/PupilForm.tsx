import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import ConfirmModal from '../components/ConfirmModal'
import apiClient from '../api/client'
import { Camera, Trash2, Save, X, User, MapPin, School, Phone, Calendar, Hash, ArrowLeft, Loader2, Plus, BookOpen } from 'lucide-react'
import { compressImage } from '../utils/imageUtils'

interface SchoolType {
    id: string
    name: string
    code: string
}

interface SubjectScore {
    subject: string
    score: string
    base: string
}

const PupilForm: React.FC = () => {
    const { t, i18n } = useTranslation()
    const { mode } = useTheme()
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [schools, setSchools] = useState<SchoolType[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [showDeletePhotoConfirm, setShowDeletePhotoConfirm] = useState(false)

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        birth_date: '',
        gender: 'M',
        national_id: '',
        address: '',
        school_id: '',
        status: 'ACTIVE',
        contact_parent1_name: '',
        contact_parent1_phone: '',
        contact_parent2_name: '',
        contact_parent2_phone: '',
        photo_url: '',
        grade: '',
        academic_score: ''
    })

    const [subjectScores, setSubjectScores] = useState<SubjectScore[]>([
        { subject: 'Mathématiques', score: '', base: '20' },
        { subject: 'Français', score: '', base: '20' }
    ])

    const isDark = mode === 'dark'
    const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    const inputClass = `w-full px-4 py-3 rounded-xl border transition-all duration-300 outline-none focus:ring-4 focus:ring-blue-500/20 ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:bg-white'}`
    const labelClass = `block text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`
    
    useEffect(() => {
        apiClient.get('/schools/')
            .then(res => setSchools(res.data))
            .catch(err => console.error(t('errors.loading_schools'), err))

        if (id) {
            setIsEditing(true)
            apiClient.get(`/pupils/${id}`)
                .then(res => {
                    const data = res.data
                    setFormData({
                        first_name: data.first_name || '',
                        last_name: data.last_name || '',
                        birth_date: data.birth_date || '',
                        gender: data.gender || 'M',
                        national_id: data.national_id || '',
                        address: data.address || '',
                        school_id: data.school_id || '',
                        status: data.status || 'ACTIVE',
                        contact_parent1_name: data.contact_parent1_name || '',
                        contact_parent1_phone: data.contact_parent1_phone || '',
                        contact_parent2_name: data.contact_parent2_name || '',
                        contact_parent2_phone: data.contact_parent2_phone || '',
                        photo_url: data.photo_url || '',
                        grade: data.grade || '',
                        academic_score: data.academic_score !== null ? data.academic_score : ''
                    })
                    if (data.photo_url) {
                        setPhotoPreview(data.photo_url?.startsWith?.('http') ? data.photo_url : `${apiClient.defaults.baseURL || ''}${data.photo_url}`)
                    }
                })
                .catch(console.error)
        }
    }, [id])

    // Suggérer la classe en fonction de l'âge
    useEffect(() => {
        if (formData.birth_date && !isEditing) {
            const birthDate = new Date(formData.birth_date)
            const age = new Date().getFullYear() - birthDate.getFullYear()
            
            let suggestedGrade = ''
            if (age === 6) suggestedGrade = 'CI'
            else if (age === 7) suggestedGrade = 'CP'
            else if (age === 8) suggestedGrade = 'CE1'
            else if (age === 9) suggestedGrade = 'CE2'
            else if (age === 10) suggestedGrade = 'CM1'
            else if (age >= 11) suggestedGrade = 'CM2'
            
            if (suggestedGrade) {
                setFormData(prev => ({ ...prev, grade: suggestedGrade }))
            }
        }
    }, [formData.birth_date, isEditing])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubjectChange = (index: number, field: keyof SubjectScore, value: string) => {
        const newScores = [...subjectScores]
        newScores[index][field] = value
        setSubjectScores(newScores)
    }

    const addSubject = () => {
        setSubjectScores([...subjectScores, { subject: '', score: '', base: '20' }])
    }

    const removeSubject = (index: number) => {
        setSubjectScores(subjectScores.filter((_, i) => i !== index))
    }

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            try {
                setUploadingPhoto(true)
                const compressed = await compressImage(file, 800, 0.7)
                setPhotoFile(compressed)
                const reader = new FileReader()
                reader.onload = (e) => setPhotoPreview(e.target?.result as string)
                reader.readAsDataURL(compressed)
            } catch (err) {
                console.error("Compression failed:", err)
                setError("Erreur lors de la compression de l'image")
            } finally {
                setUploadingPhoto(false)
            }
        }
    }

    const handleRemovePhoto = () => {
        setShowDeletePhotoConfirm(false)
        setPhotoFile(null)
        setPhotoPreview(null)
        setFormData({ ...formData, photo_url: '' })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Calculer la moyenne pondérée pour academic_score
            let totalWeightedScore = 0
            let totalBase = 0
            subjectScores.forEach(s => {
                if (s.score && s.base) {
                    totalWeightedScore += parseFloat(s.score)
                    totalBase += parseFloat(s.base)
                }
            })
            
            const calculatedAverage = totalBase > 0 ? (totalWeightedScore / totalBase) * 20 : 0
            const finalFormData = { ...formData, academic_score: calculatedAverage.toFixed(2) }

            const method = isEditing ? 'put' : 'post'
            const url = isEditing ? `/pupils/${id}` : '/pupils/'
            const response = await apiClient[method](url, finalFormData)
            const pupilId = isEditing ? id : response.data.id

            // Sauvegarder les notes détaillées
            if (pupilId) {
                await apiClient.post(`/pupils/${pupilId}/academic-records`, { records: subjectScores })
            }

            if (photoFile && pupilId) {
                const uploadData = new FormData()
                uploadData.append('file', photoFile)
                await apiClient.post(`/uploads/photo/${pupilId}`, uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
            }

            setSuccess(true)
            setTimeout(() => navigate('/pupils'), 1500)
        } catch (err: any) {
            setError(t('common.error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto px-4 md:px-0 pb-12 transition-opacity duration-300">
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-10 text-center sm:text-left">
                <Link to="/pupils" className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-500 shadow-sm hover:bg-slate-50 transition-all active:scale-90">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter">
                        {isEditing ? t('common.edit') : t('pupils.add_new')}
                    </h1>
                </div>
            </div>

            {success && <div className="mb-8 p-5 bg-emerald-500/10 text-emerald-500 rounded-3xl font-black border border-emerald-500/20 animate-in fade-in zoom-in-95">✓ {t('common.success')}</div>}
            {error && <div className="mb-8 p-5 bg-red-500/10 text-red-500 rounded-3xl font-black border border-red-500/20 animate-in shake">! {error}</div>}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Photo Section */}
                <div className={`p-6 md:p-10 rounded-[2.5rem] border ${cardBg} shadow-sm`}>
                    <div className="flex flex-col md:flex-row gap-10 items-center">
                        <div onClick={() => !uploadingPhoto && fileInputRef.current?.click()} 
                             className={`w-44 h-44 rounded-[2.5rem] border-4 border-dashed transition-all ${
                                 isDark ? 'border-slate-700 bg-slate-900 hover:border-primary-500/50' : 'border-slate-200 bg-slate-50 hover:border-primary-500/50'
                             } flex items-center justify-center cursor-pointer overflow-hidden relative shadow-inner group`}>
                            {uploadingPhoto ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="animate-spin text-primary-500" size={40} />
                                    <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest">Compression...</span>
                                </div>
                            ) : photoPreview ? (
                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            ) : (
                                <div className="text-center p-4">
                                    <Camera className="text-slate-400 mb-2 mx-auto" size={40} />
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">{t('pupils.form.photo_required')}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-black mb-2">{t('pupils.form.photo_title')}</h3>
                            <p className="text-sm text-slate-500 font-medium mb-6">{t('pupils.form.photo_desc')}</p>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary-500/20">
                                    {photoPreview ? t('common.edit') : t('pupils.form.choose_photo')}
                                </button>
                                {photoPreview && (
                                    <button type="button" onClick={() => setShowDeletePhotoConfirm(true)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20">
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Personal Info */}
                <div className={`p-6 md:p-10 rounded-[2.5rem] border ${cardBg} shadow-sm`}>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">{t('pupils.form.personal_info')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className={labelClass}>{t('pupils.form.first_name')} *</label>
                            <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div>
                            <label className={labelClass}>{t('pupils.form.last_name')} *</label>
                            <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div>
                            <label className={labelClass}>{t('pupils.form.birth_date')} *</label>
                            <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div>
                            <label className={labelClass}>{t('pupils.form.gender')} *</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass} required>
                                <option value="M">{t('gender.male')}</option>
                                <option value="F">{t('gender.female')}</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>{t('common.status')} *</label>
                            <select name="status" value={formData.status} onChange={handleChange} className={inputClass} required>
                                <option value="ACTIVE">{formData.gender === 'F' ? t('status.active_f') : t('status.active_m')}</option>
                                <option value="TRANSFERRED">{t('status.transferred')}</option>
                                <option value="DROPOUT">{t('status.dropout')}</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>{t('pupils.form.school')} *</label>
                            <select name="school_id" value={formData.school_id} onChange={handleChange} className={inputClass} required>
                                <option value="">{t('pupils.form.select_school')}</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>{t('pupils.form.grade')} *</label>
                            <input type="text" name="grade" value={formData.grade} onChange={handleChange} className={inputClass} placeholder="ex: CI, CP, CM2..." required />
                            {formData.birth_date && <p className="text-[10px] font-bold text-blue-500 mt-2 uppercase tracking-widest">{t('pupils.form.suggested')}</p>}
                        </div>
                    </div>
                </div>

                {/* Academic Evaluation Section */}
                <div className={`p-6 md:p-10 rounded-[2.5rem] border ${cardBg} shadow-sm`}>
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('pupils.form.academic_evaluation')}</h3>
                        <button type="button" onClick={addSubject} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500/20 transition-all">
                            <Plus size={14} /> {t('pupils.form.add_subject')}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {subjectScores.map((s, index) => (
                            <div key={index} className="flex flex-col md:flex-row items-end gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                <div className="flex-1 w-full">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t('pupils.form.subject')}</label>
                                    <div className="relative">
                                        <BookOpen size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={s.subject} 
                                            onChange={e => handleSubjectChange(index, 'subject', e.target.value)}
                                            className={`${inputClass} !py-2.5 !pl-12 text-sm`}
                                            placeholder="ex: Mathématiques"
                                        />
                                    </div>
                                </div>
                                <div className="w-full md:w-32">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t('pupils.form.score')}</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        value={s.score} 
                                        onChange={e => handleSubjectChange(index, 'score', e.target.value)}
                                        className={`${inputClass} !py-2.5 text-center font-black`}
                                        placeholder="0.0"
                                    />
                                </div>
                                <div className="w-full md:w-32">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t('pupils.form.out_of')}</label>
                                    <select 
                                        value={s.base} 
                                        onChange={e => handleSubjectChange(index, 'base', e.target.value)}
                                        className={`${inputClass} !py-2.5 text-center font-black`}
                                    >
                                        <option value="10">10</option>
                                        <option value="20">20</option>
                                        <option value="40">40</option>
                                        <option value="50">50</option>
                                        <option value="60">60</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                {subjectScores.length > 1 && (
                                    <button type="button" onClick={() => removeSubject(index)} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all mb-0.5">
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex justify-between items-center">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">{t('pupils.form.average_score')}</p>
                        <div className="text-3xl font-black text-primary-600">
                            {(() => {
                                let totalWeightedScore = 0
                                let totalBase = 0
                                subjectScores.forEach(s => {
                                    if (s.score && s.base) {
                                        totalWeightedScore += parseFloat(s.score)
                                        totalBase += parseFloat(s.base)
                                    }
                                })
                                return totalBase > 0 ? ((totalWeightedScore / totalBase) * 20).toFixed(2) : '0.00'
                            })()}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button type="submit" disabled={loading} className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary-500/20 active:scale-[0.98] transition-all disabled:opacity-50">
                        {loading ? t('common.loading') : t('common.save')}
                    </button>
                    <button type="button" onClick={() => navigate('/pupils')} className="flex-1 px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-slate-750 transition-all">
                        {t('common.cancel')}
                    </button>
                </div>
            </form>
            <ConfirmModal isOpen={showDeletePhotoConfirm} title={t('common.delete')} message={t('common.confirm')} onConfirm={handleRemovePhoto} onCancel={() => setShowDeletePhotoConfirm(false)} />
        </div>
    )
}

export default PupilForm
