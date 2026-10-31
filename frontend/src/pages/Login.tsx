import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'
import { Mail, Lock, LogIn, ShieldCheck, Globe, Info, AlertCircle, Shield, Heart, Eye } from 'lucide-react'

const Login: React.FC = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    
    const navigate = useNavigate()
    const location = useLocation()
    const { login } = useAuth()

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        if (params.get('expired')) {
            setInfo('Votre session a expiré pour des raisons de sécurité. Veuillez vous reconnecter.')
        }
    }, [location])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    username: email,
                    password: password,
                }),
            })

            const data = await response.json()

            if (response.ok) {
                login(data.access_token)
                navigate('/')
            } else {
                setError(data.detail || 'Identifiants incorrects. Veuillez réessayer.')
            }
        } catch (err) {
            setError('Impossible de joindre le serveur. Vérifiez votre connexion.')
        } finally {
            setLoading(false)
        }
    }

    // Interactive HTML5 Canvas Constellation Background
    useEffect(() => {
        const canvas = document.getElementById('mesh-canvas') as HTMLCanvasElement
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let width = canvas.width = window.innerWidth
        let height = canvas.height = window.innerHeight

        const handleResize = () => {
            if (!canvas) return
            width = canvas.width = window.innerWidth
            height = canvas.height = window.innerHeight
        }
        window.addEventListener('resize', handleResize)

        // Mouse interaction
        let mouse = { x: -1000, y: -1000, radius: 240 }
        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX
            mouse.y = e.clientY
        }
        const handleMouseLeave = () => {
            mouse.x = -1000
            mouse.y = -1000
        }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseleave', handleMouseLeave)

        // Particle Class
        class Particle {
            x: number
            y: number
            vx: number
            vy: number
            radius: number
            color: string

            constructor() {
                this.x = Math.random() * width
                this.y = Math.random() * height
                this.vx = (Math.random() - 0.5) * 0.5
                this.vy = (Math.random() - 0.5) * 0.5
                this.radius = Math.random() * 3 + 2.5 // Soft, clear node sizes
                // Vibrant protection-themed colors (Green, Indigo, Sky Blue)
                this.color = Math.random() > 0.6 ? 'rgba(16, 185, 129, 0.65)' : Math.random() > 0.3 ? 'rgba(79, 70, 229, 0.55)' : 'rgba(14, 165, 233, 0.55)'
            }

            update() {
                this.x += this.vx
                this.y += this.vy

                if (this.x < 0 || this.x > width) this.vx *= -1
                if (this.y < 0 || this.y > height) this.vy *= -1

                // Gentle gravitational attraction / push based on mouse pointer
                const dx = mouse.x - this.x
                const dy = mouse.y - this.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < mouse.radius) {
                    const force = (mouse.radius - dist) / mouse.radius
                    const angle = Math.atan2(dy, dx)
                    this.x -= Math.cos(angle) * force * 2.2
                    this.y -= Math.sin(angle) * force * 2.2
                }
            }

            draw() {
                if (!ctx) return
                ctx.beginPath()
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
                ctx.fillStyle = this.color
                ctx.fill()
            }
        }

        const particles: Particle[] = []
        const particleCount = Math.min(130, Math.floor((width * height) / 11000))
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle())
        }

        const drawLines = () => {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x
                    const dy = particles[i].y - particles[j].y
                    const dist = Math.sqrt(dx * dx + dy * dy)

                    if (dist < 160) {
                        ctx.beginPath()
                        ctx.moveTo(particles[i].x, particles[i].y)
                        ctx.lineTo(particles[j].x, particles[j].y)
                        const alpha = 0.35 * (1 - dist / 160)
                        ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`
                        ctx.lineWidth = 0.85
                        ctx.stroke()
                    }
                }
            }

            // Draw interactive constellation connections directly to the mouse cursor
            if (mouse.x > -1000) {
                for (let i = 0; i < particles.length; i++) {
                    const dx = mouse.x - particles[i].x
                    const dy = mouse.y - particles[i].y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < 220) {
                        ctx.beginPath()
                        ctx.moveTo(mouse.x, mouse.y)
                        ctx.lineTo(particles[i].x, particles[i].y)
                        const alpha = 0.42 * (1 - dist / 220)
                        ctx.strokeStyle = `rgba(79, 70, 229, ${alpha})` // Premium Indigo links
                        ctx.lineWidth = 1.1
                        ctx.stroke()
                    }
                }
            }
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height)
            
            // Soft tech matrix grid
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.035)'
            ctx.lineWidth = 1
            const gridSize = 80
            for (let x = 0; x < width; x += gridSize) {
                ctx.beginPath()
                ctx.moveTo(x, 0)
                ctx.lineTo(x, height)
                ctx.stroke()
            }
            for (let y = 0; y < height; y += gridSize) {
                ctx.beginPath()
                ctx.moveTo(0, y)
                ctx.lineTo(width, y)
                ctx.stroke()
            }

            particles.forEach(p => {
                p.update()
                p.draw()
            })
            drawLines()
            animationFrameId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseleave', handleMouseLeave)
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    return (
        <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            // 🌌 Suggestion 1: Soft Multi-Hue Ambient Gradient for premium aesthetic
            background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 40%, #f0fdf4 75%, #e0e7ff 100%)', 
            padding: '16px', 
            position: 'relative',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            overflow: 'hidden',
            boxSizing: 'border-box'
        }}>
            {/* Interactive Canvas Background */}
            <canvas id="mesh-canvas" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} />

            {/* Global Keyframe CSS Inject */}
            <style>{`
                @keyframes orbFloat1 {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(50px, -60px) scale(1.15); }
                    66% { transform: translate(-30px, 30px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                @keyframes orbFloat2 {
                    0% { transform: translate(0px, 0px) scale(1); }
                    50% { transform: translate(-60px, 50px) scale(1.05); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                @keyframes cardLevitate {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes shine {
                    0% { left: -150%; }
                    100% { left: 150%; }
                }
                @keyframes floatCircle {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-15px) scale(1.05); }
                }
                .light-glass-card {
                    background: linear-gradient(135deg, rgba(241, 245, 249, 0.94) 0%, rgba(226, 232, 240, 0.97) 100%);
                    border: 1px solid rgba(16, 185, 129, 0.22);
                    /* Enhanced premium shadow for deep floating look */
                    box-shadow: 0 30px 60px -15px rgba(15, 23, 42, 0.12), 
                                0 0 50px rgba(16, 185, 129, 0.04), 
                                inset 0 1px 0 rgba(255, 255, 255, 0.95);
                    animation: cardLevitate 6s ease-in-out infinite;
                }
                .login-input {
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .login-input:focus {
                    border: 1px solid #10b981 !important;
                    background-color: #ffffff !important;
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.12) !important;
                }
                .login-input:focus + svg {
                    color: #10b981 !important;
                }
                .connect-btn {
                    position: relative;
                    overflow: hidden;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .connect-btn::after {
                    content: '';
                    position: absolute;
                    top: 0; left: -150%;
                    width: 50%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                    transform: skewX(-25deg);
                }
                .connect-btn:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3) !important;
                    background: linear-gradient(135deg, #10b981 0%, #047857 100%) !important;
                }
                .connect-btn:hover::after {
                    animation: shine 1.2s ease-in-out infinite;
                }
                .connect-btn:active {
                    transform: translateY(0px) !important;
                }
            `}</style>

            {/* 🌌 Animated Gradients (Parallax Glassmorphic Orbs) */}
            <div style={{
                position: 'absolute',
                width: '650px', height: '650px',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0) 70%)',
                top: '-15%', left: '-15%',
                filter: 'blur(55px)',
                animation: 'orbFloat1 25s infinite ease-in-out',
                zIndex: 2,
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute',
                width: '750px', height: '750px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0) 70%)',
                bottom: '-20%', right: '-20%',
                filter: 'blur(65px)',
                animation: 'orbFloat2 32s infinite ease-in-out',
                zIndex: 2,
                pointerEvents: 'none'
            }} />

            {/* Additional Layered Ambient Circles */}
            <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 2, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '20%', left: '12%', width: '140px', height: '140px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0) 75%)', animation: 'floatCircle 10s infinite ease-in-out' }} />
                <div style={{ position: 'absolute', bottom: '20%', right: '12%', width: '150px', height: '150px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0) 75%)', animation: 'floatCircle 11s infinite ease-in-out 1.5s' }} />
            </div>

            {/* 🛡️ Safe Shield Background Watermark */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.012,
                color: '#0f172a',
                zIndex: 2,
                pointerEvents: 'none'
            }}>
                <Shield size={650} strokeWidth={0.4} />
            </div>

            {/* 🔒 Main Premium Light Glassmorphism Card */}
            <div className="light-glass-card" style={{ 
                width: '100%', 
                maxWidth: '430px', 
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                padding: '32px 36px 28px 36px', 
                borderRadius: '28px', 
                zIndex: 3,
                position: 'relative',
                textAlign: 'center',
                boxSizing: 'border-box'
            }}>
                {/* Compact Branding Header */}
                <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                        {/* Compact Ministry Logo */}
                        <div style={{ 
                            width: '200px', 
                            height: '56px', 
                            background: 'white',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                            padding: '8px',
                            border: '1px solid rgba(16, 185, 129, 0.1)'
                        }}>
                            <img src="/logo_ministere.png" alt="Ministère" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        
                        {/* Compact App Name */}
                        <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <div style={{ 
                                width: '38px', 
                                height: '38px', 
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}>
                                <ShieldCheck size={20} color="white" />
                            </div>
                            <h1 style={{ 
                                fontSize: '2rem', 
                                fontWeight: 900, 
                                background: 'linear-gradient(135deg, #0f172a 0%, #059669 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.03em', 
                                margin: 0 
                            }}>CNIVE</h1>
                        </div>
                    </div>
                    <p style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.1px', margin: 0 }}>
                        Plateforme nationale de protection de l'enfance
                    </p>
                </div>

                {info && (
                    <div style={{ 
                        backgroundColor: 'rgba(16, 185, 129, 0.06)', 
                        border: '1px solid rgba(16, 185, 129, 0.15)', 
                        color: '#065f46', 
                        padding: '10px 14px', 
                        borderRadius: '10px', 
                        marginBottom: '18px', 
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textAlign: 'left'
                    }}>
                        <AlertCircle size={16} />
                        {info}
                    </div>
                )}

                {error && (
                    <div style={{ 
                        backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                        border: '1px solid rgba(239, 68, 68, 0.15)', 
                        color: '#991b1b', 
                        padding: '10px 14px', 
                        borderRadius: '10px', 
                        marginBottom: '18px', 
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textAlign: 'left'
                    }}>
                        <Info size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    {/* Email Field - Premium White Input for best contrast against Grey card background */}
                    <div style={{ marginBottom: '18px' }}>
                        <label style={{ display: 'block', color: '#334155', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, paddingLeft: '4px' }}>Adresse email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', transition: 'color 0.25s', zIndex: 2 }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="login-input"
                                style={{ 
                                    width: '100%', 
                                    padding: '13px 16px 13px 48px', 
                                    borderRadius: '12px', 
                                    border: '1px solid #cbd5e1', 
                                    backgroundColor: '#ffffff', // Suggestion 2: Crisp white input fields on grey card for perfect layout and high-contrast
                                    color: '#0f172a',
                                    outline: 'none',
                                    fontSize: '0.925rem',
                                    fontWeight: 600,
                                    boxSizing: 'border-box'
                                }}
                                placeholder="votre.email@cnive.sn"
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div style={{ marginBottom: '26px' }}>
                        <label style={{ display: 'block', color: '#334155', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, paddingLeft: '4px' }}>Mot de passe</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', transition: 'color 0.25s', zIndex: 2 }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="login-input"
                                style={{ 
                                    width: '100%', 
                                    padding: '13px 42px 13px 48px', 
                                    borderRadius: '12px', 
                                    border: '1px solid #cbd5e1', 
                                    backgroundColor: '#ffffff', 
                                    color: '#0f172a',
                                    outline: 'none',
                                    fontSize: '0.925rem',
                                    fontWeight: 600,
                                    boxSizing: 'border-box'
                                }}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: 0,
                                    zIndex: 2
                                }}
                            >
                                <Eye size={18} style={{ color: showPassword ? '#10b981' : '#64748b', transition: 'color 0.25s' }} />
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="connect-btn"
                        style={{ 
                            width: '100%', 
                            padding: '15px', 
                            borderRadius: '14px', 
                            background: loading ? '#64748b' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                            color: 'white', 
                            fontWeight: 800, 
                            fontSize: '1rem',
                            border: 'none', 
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 8px 18px rgba(16, 185, 129, 0.25)',
                        }}
                    >
                        {loading ? 'Connexion...' : (
                            <>Se connecter <LogIn size={18} /></>
                        )}
                    </button>
                </form>

                {/* Compact Footer */}
                <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid rgba(16, 185, 129, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                        <Globe size={14} /> <span>Zone pilote de Pikine • République du Sénégal</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
