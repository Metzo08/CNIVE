import React from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../context/ThemeContext'
import { getPortalContainer } from '../utils/domSafety'

interface ConfirmModalProps {
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    confirmColor?: string
    icon?: string
    onConfirm: () => void
    onCancel: () => void
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Supprimer',
    cancelText = 'Annuler',
    confirmColor = '#ef4444',
    icon = '⚠️',
    onConfirm,
    onCancel
}) => {
    const { colors } = useTheme()

    if (!isOpen) return null

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            animation: 'fadeIn 0.2s ease'
        }} onClick={onCancel}>
            <div style={{
                backgroundColor: colors.card,
                borderRadius: '20px',
                padding: '32px',
                maxWidth: '420px',
                width: '100%',
                boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
                textAlign: 'center',
                animation: 'slideUp 0.3s ease'
            }} onClick={(e) => e.stopPropagation()}>
                {/* Icon */}
                <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    backgroundColor: `${confirmColor}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    margin: '0 auto 20px'
                }}>
                    {icon}
                </div>

                {/* Title */}
                <h2 style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: colors.text,
                    marginBottom: '12px'
                }}>
                    {title}
                </h2>

                {/* Message */}
                <p style={{
                    color: colors.textSecondary,
                    fontSize: '15px',
                    lineHeight: 1.6,
                    marginBottom: '28px'
                }}>
                    {message}
                </p>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '14px 28px',
                            backgroundColor: colors.inputBg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '14px 28px',
                            backgroundColor: confirmColor,
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        getPortalContainer()
    )
}

export default ConfirmModal
