# =============================================================================
# CNIVE — Script de mise à jour automatique de l'IP locale
# =============================================================================
# Utilisation : Exécuter depuis le dossier backend/ avant de démarrer les serveurs
#   .\update_ip.ps1
#
# Ce script détecte l'IP locale courante et met à jour les fichiers .env
# du backend et du frontend pour que les QR codes et les connexions réseau
# fonctionnent correctement sur le réseau local.
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  CNIVE — Mise à jour de la configuration IP" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Détecter l'IP locale active (WiFi ou Ethernet, pas loopback ni VPN)
$ip = (Get-NetIPAddress -AddressFamily IPv4 `
    | Where-Object { 
        $_.IPAddress -ne "127.0.0.1" -and 
        $_.IPAddress -notmatch "^169\." -and
        $_.PrefixOrigin -in @("Dhcp", "Manual")
    } `
    | Sort-Object -Property InterfaceIndex `
    | Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Host "❌ Impossible de détecter l'IP locale. Vérifiez votre connexion réseau." -ForegroundColor Red
    exit 1
}

Write-Host "✅ IP locale détectée : $ip" -ForegroundColor Green

# Paths
$backendEnv  = Join-Path $PSScriptRoot ".env"
$frontendEnv = Join-Path $PSScriptRoot "..\frontend\.env"

# ── Mise à jour du backend .env ───────────────────────────────────────────────
if (Test-Path $backendEnv) {
    $content = Get-Content $backendEnv -Raw
    
    # Remplacer QR_BASE_URL
    $content = $content -replace "QR_BASE_URL=http://[\d\.]+:\d+/q/", "QR_BASE_URL=http://${ip}:8001/q/"
    # Remplacer FRONTEND_URL
    $content = $content -replace "FRONTEND_URL=http://[\d\.]+:\d+", "FRONTEND_URL=http://${ip}:5173"
    
    Set-Content $backendEnv $content -NoNewline
    Write-Host "✅ Backend  .env mis à jour" -ForegroundColor Green
} else {
    Write-Host "⚠️  Fichier backend/.env introuvable : $backendEnv" -ForegroundColor Yellow
}

# ── Mise à jour du frontend .env ─────────────────────────────────────────────
if (Test-Path $frontendEnv) {
    $content = Get-Content $frontendEnv -Raw
    $content = $content -replace "VITE_API_URL=http://[\d\.]+:\d+", "VITE_API_URL=http://${ip}:8001"
    Set-Content $frontendEnv $content -NoNewline
    Write-Host "✅ Frontend .env mis à jour" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Fichier frontend/.env non trouvé (ignoré)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Configuration mise à jour pour IP : $ip" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend  : http://${ip}:8001" -ForegroundColor White
Write-Host "  Frontend : http://${ip}:5173" -ForegroundColor White
Write-Host "  QR Base  : http://${ip}:8001/q/" -ForegroundColor White
Write-Host ""
Write-Host "  ▶ Vous pouvez maintenant démarrer les serveurs." -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
