# =============================================================================
# CNIVE - Script de Backup Automatique PostgreSQL
# =============================================================================
# Utilisation manuelle :
#   .\backup_db.ps1
#
# Installation automatique (planificateur Windows, tous les jours a 02h00) :
#   .\backup_db.ps1 -Install
#
# Les sauvegardes sont stockees dans : CNIVE\backups\
# Conservation : 14 derniers jours (les plus anciens sont supprimes automatiquement)
# =============================================================================

param (
    [switch]$Install  # Passer -Install pour enregistrer la tache planifiee
)

$ErrorActionPreference = "Stop"

# --- Configuration -------------------------------------------------------------
$DB_NAME    = "sen-e-carte"
$DB_USER    = "postgres"
$DB_HOST    = "localhost"
$DB_PORT    = "5432"
$PG_DUMP    = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"  # Ajuster si version differente
$BACKUP_DIR = Join-Path $PSScriptRoot "..\backups"
$RETAIN_DAYS = 14   # Nombre de jours de retention

# Recherche automatique de pg_dump si le chemin par defaut n'existe pas
if (-not (Test-Path $PG_DUMP)) {
    $found = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "pg_dump.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $PG_DUMP = $found.FullName }
    else {
        Write-Host "[-] pg_dump.exe introuvable. Verifiez l'installation PostgreSQL." -ForegroundColor Red
        exit 1
    }
}

# --- Mode Installation (planificateur Windows) ---------------------------------
if ($Install) {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Host "[-] Erreur : L'installation de la tache planifiee necessite des privileges d'administrateur." -ForegroundColor Red
        Write-Host "    Veuillez ouvrir PowerShell en tant qu'administrateur (Clic droit -> Executer en tant qu'administrateur) et reessayer." -ForegroundColor Yellow
        exit 1
    }

    Write-Host "[*] Enregistrement de la tache planifiee..." -ForegroundColor Cyan
    
    $action  = New-ScheduledTaskAction -Execute "powershell.exe" `
                 -Argument "-NonInteractive -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    $trigger = New-ScheduledTaskTrigger -Daily -At "02:00"
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable:$false
    
    Register-ScheduledTask `
        -TaskName "CNIVE_PostgreSQL_Backup" `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Description "Backup quotidien de la base de donnees CNIVE sen-e-carte" `
        -RunLevel Highest `
        -Force | Out-Null
    
    Write-Host "[+] Tache planifiee enregistree : CNIVE_PostgreSQL_Backup" -ForegroundColor Green
    Write-Host "   Heure d'execution : chaque jour a 02h00" -ForegroundColor White
    Write-Host "   Vous pouvez verifier dans : Gestionnaire des taches planifiees" -ForegroundColor Gray
    exit 0
}

# --- Backup principal ----------------------------------------------------------
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  CNIVE - Backup PostgreSQL" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Creer le repertoire de sauvegarde si necessaire
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    Write-Host "[+] Repertoire de backup cree : $BACKUP_DIR"
}

# Nom du fichier de backup avec horodatage
$timestamp  = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = Join-Path $BACKUP_DIR "cnive_backup_$timestamp.sql"

Write-Host "[DB] Base de donnees : $DB_NAME@$($DB_HOST):$($DB_PORT)" -ForegroundColor White
Write-Host "[File] Fichier de backup : $backupFile" -ForegroundColor White
Write-Host ""

# Definir le mot de passe PostgreSQL via variable d'environnement (evite l'invite interactive)
$env:PGPASSWORD = "senecarte"

try {
    # Executer pg_dump (format SQL lisible + compresse)
    & $PG_DUMP `
        --host=$DB_HOST `
        --port=$DB_PORT `
        --username=$DB_USER `
        --format=plain `
        --no-owner `
        --no-acl `
        --file="$backupFile" `
        $DB_NAME
    
    if ($LASTEXITCODE -eq 0) {
        $size = (Get-Item $backupFile).Length / 1MB
        Write-Host "[+] Backup reussi ! Taille : $([math]::Round($size, 2)) MB" -ForegroundColor Green
        
        # Compression du fichier (zip)
        $zipFile = "$backupFile.zip"
        Compress-Archive -Path $backupFile -DestinationPath $zipFile -Force
        Remove-Item $backupFile  # Supprimer le .sql non compresse
        $zipSize = (Get-Item $zipFile).Length / 1MB
        Write-Host "[*] Compresse : $([math]::Round($zipSize, 2)) MB -> $zipFile" -ForegroundColor Green
        
    } else {
        Write-Host "[-] pg_dump a echoue (code de sortie : $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
} finally {
    # Toujours effacer le mot de passe de l'environnement
    [void](Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue)
}

# --- Nettoyage des anciens backups ---------------------------------------------
Write-Host ""
Write-Host "[*] Nettoyage des backups de plus de $RETAIN_DAYS jours..." -ForegroundColor Yellow
$cutoff = (Get-Date).AddDays(-$RETAIN_DAYS)
$old = Get-ChildItem $BACKUP_DIR -Filter "cnive_backup_*.zip" | Where-Object { $_.LastWriteTime -lt $cutoff }
if ($old.Count -gt 0) {
    $old | Remove-Item -Force
    Write-Host "   $($old.Count) ancien(s) fichier(s) supprime(s)" -ForegroundColor Gray
} else {
    Write-Host "   Aucun fichier a supprimer" -ForegroundColor Gray
}

# --- Resume final --------------------------------------------------------------
$allBackups = Get-ChildItem $BACKUP_DIR -Filter "cnive_backup_*.zip" | Sort-Object LastWriteTime -Descending
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Backups disponibles ($($allBackups.Count) fichiers)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
$allBackups | Select-Object -First 5 | ForEach-Object {
    $s = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  [Backup] $($_.Name)  ($s MB)" -ForegroundColor White
}
if ($allBackups.Count -gt 5) {
    Write-Host "  ... et $($allBackups.Count - 5) autres" -ForegroundColor Gray
}
Write-Host ""
