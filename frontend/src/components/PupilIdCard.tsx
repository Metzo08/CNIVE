import React from 'react'
import { getPupilPhotoUrl } from '../utils/imageUtils'
import { User, Phone, School as SchoolIcon, Shield, CheckCircle2, HeartPulse, GraduationCap, Users } from 'lucide-react'

export interface PupilCardData {
    id?: string
    pupil_id?: string
    pupil_name?: string
    first_name?: string
    last_name?: string
    gender?: string
    birth_date?: string
    grade?: string
    cnive_id?: string
    card_number?: string
    photo_url?: string | null
    address?: string
    city?: string
    school_name?: string
    school_code?: string
    tutor_name?: string
    tutor_phone?: string
    qr_image_base64?: string
    qr_url?: string
    status?: string
}

interface PupilIdCardProps {
    card: PupilCardData
    side?: 'recto' | 'verso'
    isPrint?: boolean
}

export const PupilIdCard: React.FC<PupilIdCardProps> = ({ card, side = 'recto', isPrint = false }) => {
    const displayName = card.pupil_name || `${card.first_name || ''} ${card.last_name || ''}`.trim() || 'ÉLÈVE'
    const displayCniveId = card.cnive_id || 'CNIVE-2026-000000'
    const displaySchool = card.school_name || 'École pilote'
    const displayGrade = card.grade || 'CI'
    const displayGender = card.gender === 'F' ? 'F' : 'M'
    const displayBirthDate = card.birth_date || 'Non renseignée'
    const displayCity = card.city || 'Pikine'
    const displayTutorPhone = card.tutor_phone && card.tutor_phone !== 'None' ? card.tutor_phone : null
    const displayTutorName = card.tutor_name && card.tutor_name !== 'None' ? card.tutor_name : 'Tuteur légal'

    // Format ISO ID-1 : 85.6mm x 53.98mm
    const cardStyle: React.CSSProperties = isPrint
        ? {
            width: '85.6mm',
            height: '53.98mm',
            position: 'relative',
            backgroundColor: '#ffffff',
            borderRadius: '3.5mm',
            overflow: 'hidden',
            boxSizing: 'border-box',
            pageBreakInside: 'avoid',
            border: '0.8px solid #cbd5e1',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            color: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '2.5mm 3.2mm',
        }
        : {
            width: '100%',
            maxWidth: '480px',
            aspectRatio: '85.6 / 53.98',
            position: 'relative',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            overflow: 'hidden',
            boxSizing: 'border-box',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            color: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '14px 18px',
        }

    if (side === 'recto') {
        return (
            <div style={cardStyle} className="pupil-card-recto select-none">
                {/* Liseré supérieur aux couleurs nationales du Sénégal (Vert - Or - Rouge) */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: isPrint ? '1.2mm' : '4px',
                    background: 'linear-gradient(90deg, #00853F 0%, #00853F 33.3%, #FDEF42 33.3%, #FDEF42 66.6%, #E31B23 66.6%, #E31B23 100%)',
                    zIndex: 10
                }} />

                {/* Filigrane central de la Fondation NOUS CIMS */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: isPrint ? '42mm' : '220px',
                    opacity: 0.08,
                    pointerEvents: 'none',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img 
                        src="/logo_nouscims.png" 
                        alt="Filigrane Nous Cims" 
                        style={{ width: '100%', height: 'auto', filter: 'grayscale(10%)' }} 
                    />
                </div>

                {/* EN-TÊTE OFFICIEL RECTO */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    position: 'relative',
                    zIndex: 2,
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: isPrint ? '1mm' : '6px',
                    marginTop: isPrint ? '0.5mm' : '2px'
                }}>
                    {/* Extrême Gauche : Logo Groupe Thématique Ville de Pikine */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '0 0 auto' }}>
                        <img 
                            src="/logo_gte.jpg" 
                            alt="GT Pikine" 
                            style={{ 
                                height: isPrint ? '7.5mm' : '32px', 
                                width: 'auto', 
                                objectFit: 'contain',
                                borderRadius: '3px'
                            }} 
                        />
                    </div>

                    {/* Au Milieu : Drapeau du Sénégal au sommet + Titres Institutionnels */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, padding: '0 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '1px' }}>
                            <img 
                                src="/drapeau_senegal.png" 
                                alt="Drapeau Sénégal" 
                                style={{ 
                                    height: isPrint ? '3.8mm' : '15px', 
                                    width: isPrint ? '5.8mm' : '23px', 
                                    objectFit: 'cover',
                                    borderRadius: '1.5px',
                                    boxShadow: '0 0.5px 2px rgba(0,0,0,0.2)'
                                }} 
                            />
                            <span style={{ 
                                fontSize: isPrint ? '5.5pt' : '9px', 
                                fontWeight: 900, 
                                letterSpacing: '0.6px', 
                                color: '#047857'
                            }}>
                                République du sénégal
                            </span>
                        </div>
                        <span style={{ 
                            fontSize: isPrint ? '5pt' : '8.5px', 
                            fontWeight: 800, 
                            color: '#1e293b', 
                            letterSpacing: '0.4px',
                            lineHeight: 1.1
                        }}>
                            Carte nationale de l'élève • mutualis
                        </span>
                        <span style={{ 
                            fontSize: isPrint ? '4pt' : '7px', 
                            color: '#0284c7', 
                            fontWeight: 800,
                            letterSpacing: '0.2px'
                        }}>
                            Sen-é-carte / couverture sanitaire universelle
                        </span>
                    </div>

                    {/* Extrême Droite : Logo Ministère de l'Éducation Nationale en petit */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '0 0 auto' }}>
                        <img 
                            src="/logo_ministere.png" 
                            alt="Ministère Éducation Nationale" 
                            style={{ 
                                height: isPrint ? '6.5mm' : '28px', 
                                maxWidth: isPrint ? '15mm' : '65px',
                                objectFit: 'contain'
                            }} 
                        />
                    </div>
                </div>

                {/* CORPS DE LA CARTE : Photo + Données personnelles de l'élève */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isPrint ? '2.5mm' : '14px',
                    flex: 1,
                    position: 'relative',
                    zIndex: 2,
                    margin: isPrint ? '1.5mm 0' : '8px 0'
                }}>
                    {/* Photo d'identité officielle */}
                    <div style={{
                        width: isPrint ? '21mm' : '88px',
                        height: isPrint ? '26mm' : '108px',
                        flexShrink: 0,
                        borderRadius: isPrint ? '2mm' : '10px',
                        overflow: 'hidden',
                        backgroundColor: '#f1f5f9',
                        border: '1.5px solid #00853F',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {card.photo_url ? (
                            <img 
                                src={getPupilPhotoUrl(card.photo_url)} 
                                alt={displayName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                referrerPolicy="no-referrer"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        ) : null}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', color: '#64748b' }}>
                            <User size={isPrint ? 18 : 28} />
                            <span style={{ fontSize: isPrint ? '3.5pt' : '7px', fontWeight: 700, marginTop: '2px' }}>Photo</span>
                        </div>
                    </div>

                    {/* Bloc informations personnelles */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: isPrint ? '0.6mm' : '3px' }}>
                        {/* Nom et Prénom */}
                        <div style={{ marginBottom: isPrint ? '0.3mm' : '2px' }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: isPrint ? '7.5pt' : '13px',
                                fontWeight: 900,
                                color: '#0f172a',
                                lineHeight: 1.15,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {displayName}
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                                <span style={{
                                    fontSize: isPrint ? '5pt' : '9px',
                                    fontWeight: 900,
                                    color: '#00853F',
                                    fontFamily: 'monospace',
                                    letterSpacing: '0.5px'
                                }}>
                                    {displayCniveId}
                                </span>
                                <span style={{
                                    fontSize: isPrint ? '4pt' : '7px',
                                    fontWeight: 800,
                                    backgroundColor: '#ecfdf5',
                                    color: '#047857',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    border: '0.5px solid #a7f3d0'
                                }}>
                                    Sen-é-carte
                                </span>
                            </div>
                        </div>

                        {/* Tableau / Lignes d'informations */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: isPrint ? '0.4mm' : '2px',
                            fontSize: isPrint ? '4.8pt' : '8.5px',
                            color: '#334155'
                        }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <span><strong style={{ color: '#64748b' }}>Né(e) le :</strong> {displayBirthDate}</span>
                                <span>•</span>
                                <span><strong style={{ color: '#64748b' }}>Sexe :</strong> {displayGender === 'F' ? 'Féminin' : 'Masculin'}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <strong style={{ color: '#64748b' }}>École :</strong>
                                <span style={{ fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {displaySchool}
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <span><strong style={{ color: '#64748b' }}>Classe :</strong> <b>{displayGrade}</b></span>
                                <span>•</span>
                                <span><strong style={{ color: '#64748b' }}>Ville :</strong> <b>{displayCity}</b></span>
                            </div>

                            {/* Contact Tuteur direct */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <strong style={{ color: '#0284c7' }}>Tuteur :</strong>
                                <span style={{ fontWeight: 800, color: '#0f172a' }}>
                                    {displayTutorPhone ? displayTutorPhone : displayTutorName}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PIED DE CARTE RECTO */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: isPrint ? '0.8mm' : '4px',
                    position: 'relative',
                    zIndex: 2
                }}>
                    <span style={{ fontSize: isPrint ? '4pt' : '7.5px', color: '#64748b', fontWeight: 600 }}>
                        Zone modèle de pikine • année 2025 - 2026
                    </span>
                    <span style={{ fontSize: isPrint ? '4.2pt' : '7.5px', color: '#047857', fontWeight: 800 }}>
                        Pass scolaire et couverture santé
                    </span>
                </div>

                {/* Bande inférieure discrète */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: isPrint ? '0.8mm' : '3px',
                    backgroundColor: '#00853F'
                }} />
            </div>
        )
    }

    // ==========================================
    // VERSO (Face arrière — Couverture CSU & QR)
    // ==========================================
    return (
        <div style={cardStyle} className="pupil-card-verso select-none">
            {/* Liseré supérieur */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: isPrint ? '1.2mm' : '4px',
                background: 'linear-gradient(90deg, #0284c7 0%, #00853F 50%, #E6007E 100%)',
                zIndex: 10
            }} />

            {/* EN-TÊTE VERSO AVEC LES 3 LOGOS DEMANDÉS */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                position: 'relative',
                zIndex: 2,
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: isPrint ? '1mm' : '6px',
                marginTop: isPrint ? '0.5mm' : '2px'
            }}>
                {/* 1. Extrême gauche : Logo officiel de NOUS CIMS */}
                <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
                    <img 
                        src="/logo_nouscims.png" 
                        alt="Fondation Nous Cims" 
                        style={{ 
                            height: isPrint ? '7mm' : '30px', 
                            maxWidth: isPrint ? '18mm' : '75px',
                            objectFit: 'contain'
                        }} 
                    />
                </div>

                {/* 2. Au milieu : Logo de la MSD de Pikine ET Logo de la SEN-CSU */}
                <div style={{ display: 'flex', alignItems: 'center', gap: isPrint ? '2.5mm' : '10px', justifyContent: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <img 
                            src="/logo_msd.png" 
                            alt="MSD Pikine" 
                            style={{ 
                                height: isPrint ? '7.5mm' : '32px', 
                                width: 'auto',
                                objectFit: 'contain'
                            }} 
                        />
                        <span style={{ fontSize: isPrint ? '4pt' : '6.5px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                            Msd pikine
                        </span>
                    </div>

                    <div style={{ width: '1px', height: isPrint ? '6mm' : '22px', backgroundColor: '#cbd5e1' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <img 
                            src="/logo_sencsu.png" 
                            alt="SEN-CSU" 
                            style={{ 
                                height: isPrint ? '7.5mm' : '32px', 
                                width: 'auto',
                                objectFit: 'contain'
                            }} 
                        />
                        <span style={{ fontSize: isPrint ? '4pt' : '6.5px', fontWeight: 900, color: '#047857', lineHeight: 1 }}>
                            Sen-csu
                        </span>
                    </div>
                </div>

                {/* Badge Identifiant National */}
                <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    <span style={{ fontSize: isPrint ? '3.5pt' : '6.5px', color: '#64748b', fontWeight: 700, display: 'block' }}>Pass digital</span>
                    <span style={{ fontSize: isPrint ? '5pt' : '9px', fontWeight: 900, color: '#00853F', fontFamily: 'monospace' }}>
                        #{displayCniveId.slice(-6)}
                    </span>
                </div>
            </div>

            {/* CORPS VERSO : QR Code + Niveaux d'accès détaillés */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isPrint ? '3mm' : '14px',
                flex: 1,
                position: 'relative',
                zIndex: 2,
                margin: isPrint ? '1.5mm 0' : '8px 0'
            }}>
                {/* QR Code haute définition */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0
                }}>
                    <div style={{
                        width: isPrint ? '24mm' : '102px',
                        height: isPrint ? '24mm' : '102px',
                        backgroundColor: '#ffffff',
                        padding: isPrint ? '1mm' : '5px',
                        borderRadius: isPrint ? '2mm' : '8px',
                        border: '1.5px solid #00853F',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {card.qr_image_base64 ? (
                            <img 
                                src={`data:image/png;base64,${card.qr_image_base64}`} 
                                alt="QR Code" 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                        ) : (
                            <div style={{ fontSize: isPrint ? '4pt' : '8px', textAlign: 'center', color: '#64748b' }}>
                                Qr code<br/>sécurisé
                            </div>
                        )}
                    </div>
                    <span style={{ 
                        fontSize: isPrint ? '4pt' : '7.5px', 
                        fontWeight: 900, 
                        color: '#0f172a', 
                        fontFamily: 'monospace', 
                        marginTop: '2px',
                        letterSpacing: '0.4px'
                    }}>
                        {displayCniveId}
                    </span>
                </div>

                {/* NIVEAUX D'ACCÈS DU PASS DIGITAL (Inspiré de Mutualis CSU) */}
                <div style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: isPrint ? '0.7mm' : '4px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '2px' }}>
                        <Shield size={isPrint ? 8 : 11} color="#047857" />
                        <span style={{ fontSize: isPrint ? '4.8pt' : '8.5px', fontWeight: 900, color: '#0f172a' }}>
                            Niveaux d'accès sécurisés :
                        </span>
                    </div>

                    {/* Niveau 1 : Éducatif */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isPrint ? '4.2pt' : '7.5px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, color: '#047857' }}>Niv. 1 scolaire :</span>
                        <span style={{ color: '#475569' }}>Assiduité, bulletins (directeur, prof.)</span>
                    </div>

                    {/* Niveau 2 : Santé CSU & CMU */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isPrint ? '4.2pt' : '7.5px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0284c7', flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, color: '#0284c7' }}>Niv. 2 médical csu :</span>
                        <span style={{ color: '#475569' }}>Prise en charge, soins (médecin, msd)</span>
                    </div>

                    {/* Niveau 3 : Protection Sociale */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isPrint ? '4.2pt' : '7.5px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, color: '#b45309' }}>Niv. 3 social fev :</span>
                        <span style={{ color: '#475569' }}>Kits, cantine, bourses (action sociale)</span>
                    </div>

                    {/* Niveau 4 : Sécurité & Contrôle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isPrint ? '4.2pt' : '7.5px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#8b5cf6', flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, color: '#6d28d9' }}>Niv. 4 contrôle :</span>
                        <span style={{ color: '#475569' }}>Authentification numérique et intégrité</span>
                    </div>
                </div>
            </div>

            {/* PIED DE CARTE VERSO (Consignes & Urgences) */}
            <div style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: isPrint ? '0.8mm' : '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 2
            }}>
                <span style={{ fontSize: isPrint ? '3.8pt' : '7px', color: '#dc2626', fontWeight: 800 }}>
                    ⚠️ Urgence médicale :
                </span>
                <span style={{ fontSize: isPrint ? '3.8pt' : '7px', color: '#64748b', fontStyle: 'italic', textAlign: 'right' }}>
                    Scanner pour afficher le groupe sanguin, les allergies et le contact d'urgence.
                </span>
            </div>

            {/* Bande inférieure discrète */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: isPrint ? '0.8mm' : '3px',
                backgroundColor: '#0284c7'
            }} />
        </div>
    )
}

export default PupilIdCard
