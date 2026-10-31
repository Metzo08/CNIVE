# =============================================================================
# CNIVE — Configuration HTTPS avec mkcert (certificat local de confiance)
# =============================================================================
# Prérequis : mkcert installé (https://github.com/FiloSottile/mkcert)
#   winget install FiloSottile.mkcert
# ou :
#   choco install mkcert
#
# Ce script :
#   1. Installe l'autorité de certification locale (mkcert -install)
#   2. Génère des certificats pour l'IP locale
#   3. Configure le backend FastAPI pour servir en HTTPS
#   4. Configure Vite pour servir en HTTPS
#   5. Affiche les URLs HTTPS à utiliser
# =============================================================================

param (
    [string]$IP = ""  # Laisser vide pour auto-détection
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  CNIVE — Configuration HTTPS (mkcert)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# ── Vérifier mkcert ───────────────────────────────────────────────────────────
if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    Write-Host "❌ mkcert n'est pas installé." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Option 1 (winget) :" -ForegroundColor Yellow
    Write-Host "    winget install FiloSottile.mkcert" -ForegroundColor White
    Write-Host ""
    Write-Host "  Option 2 (choco) :" -ForegroundColor Yellow
    Write-Host "    choco install mkcert" -ForegroundColor White
    Write-Host ""
    Write-Host "  Après installation, relancer ce script." -ForegroundColor Gray
    exit 1
}

# ── Détecter l'IP locale ──────────────────────────────────────────────────────
if (-not $IP) {
    $IP = (Get-NetIPAddress -AddressFamily IPv4 `
        | Where-Object { 
            $_.IPAddress -ne "127.0.0.1" -and 
            $_.IPAddress -notmatch "^169\." -and
            $_.PrefixOrigin -in @("Dhcp", "Manual")
        } `
        | Sort-Object InterfaceIndex `
        | Select-Object -First 1).IPAddress
}

if (-not $IP) {
    Write-Host "❌ Impossible de détecter l'IP locale." -ForegroundColor Red
    exit 1
}

Write-Host "✅ IP locale : $IP" -ForegroundColor Green

# ── Dossier des certificats ───────────────────────────────────────────────────
$certsDir = Join-Path $PSScriptRoot "certs"
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir -Force | Out-Null
}

$certFile = Join-Path $certsDir "cert.pem"
$keyFile  = Join-Path $certsDir "key.pem"

# ── Installer l'autorité CA locale (1 fois par machine) ───────────────────────
Write-Host "📜 Installation de l'autorité CA locale mkcert..." -ForegroundColor White
mkcert -install

# ── Générer le certificat pour localhost + IP locale ──────────────────────────
Write-Host "🔑 Génération du certificat pour localhost et $IP ..." -ForegroundColor White
Push-Location $certsDir
mkcert -cert-file cert.pem -key-file key.pem "localhost" "127.0.0.1" $IP
Pop-Location

Write-Host "✅ Certificats générés dans : $certsDir" -ForegroundColor Green

# ── Mettre à jour le .env backend ─────────────────────────────────────────────
$backendEnv = Join-Path $PSScriptRoot ".env"
if (Test-Path $backendEnv) {
    $content = Get-Content $backendEnv -Raw
    
    # Remplacer http:// par https:// dans les URLs
    $content = $content -replace "QR_BASE_URL=http://", "QR_BASE_URL=https://"
    $content = $content -replace "FRONTEND_URL=http://", "FRONTEND_URL=https://"
    
    # Ajouter les chemins des certificats SSL
    if ($content -notmatch "SSL_CERT_FILE") {
        $content += "`nSSL_CERT_FILE=./certs/cert.pem"
        $content += "`nSSL_KEY_FILE=./certs/key.pem"
    } else {
        $content = $content -replace "SSL_CERT_FILE=.*", "SSL_CERT_FILE=./certs/cert.pem"
        $content = $content -replace "SSL_KEY_FILE=.*", "SSL_KEY_FILE=./certs/key.pem"
    }
    
    Set-Content $backendEnv $content -NoNewline
    Write-Host "✅ Backend .env mis à jour (URLs → HTTPS + chemins SSL)" -ForegroundColor Green
}

# ── Mettre à jour le start_backend.ps1 pour activer SSL ──────────────────────
$startScript = Join-Path $PSScriptRoot "start_backend_https.ps1"
@"
# Démarrage backend CNIVE avec HTTPS
.\venv\Scripts\python.exe -m uvicorn main:app ``
    --host 0.0.0.0 ``
    --port 8001 ``
    --ssl-certfile ./certs/cert.pem ``
    --ssl-keyfile  ./certs/key.pem ``
    --reload
"@ | Set-Content $startScript

Write-Host "✅ Script HTTPS créé : start_backend_https.ps1" -ForegroundColor Green

# ── Mettre à jour vite.config.ts pour HTTPS ─────────────────────────────────
$viteConfig = Join-Path $PSScriptRoot "..\frontend\vite.config.ts"
if (Test-Path $viteConfig) {
    $viteContent = Get-Content $viteConfig -Raw
    if ($viteContent -notmatch "https: true") {
        $viteContent = $viteContent -replace "server:\s*\{", "server: {`n    https: true,"
        Set-Content $viteConfig $viteContent -NoNewline
        Write-Host "✅ vite.config.ts mis à jour (HTTPS activé)" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  vite.config.ts : HTTPS déjà activé" -ForegroundColor Gray
    }
}

# ── Résumé ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  ✅ HTTPS configuré avec succès !" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  🔒 Backend  : https://${IP}:8001" -ForegroundColor White
Write-Host "  🔒 Frontend : https://${IP}:5173" -ForegroundColor White
Write-Host "  🔒 QR codes : https://${IP}:8001/q/..." -ForegroundColor White
Write-Host ""
Write-Host "  Pour démarrer en HTTPS :" -ForegroundColor Yellow
Write-Host "  Backend  → .\start_backend_https.ps1" -ForegroundColor White
Write-Host "  Frontend → npm run dev  (dans frontend/)" -ForegroundColor White
Write-Host ""
Write-Host "  ⚠️  Le certificat est valide UNIQUEMENT sur ce réseau local." -ForegroundColor Yellow
Write-Host "     Pour Internet public, utilisez Let's Encrypt + nom de domaine." -ForegroundColor Gray
Write-Host ""
