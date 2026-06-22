# Scheduled one-time push for AI_Interviewer (created 2026-06-22)
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LogFile = Join-Path $RepoRoot 'tmp\scheduled-push.log'

function Write-Log($Message) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Add-Content -Path $LogFile -Value $line
    Write-Host $line
}

New-Item -ItemType Directory -Force -Path (Split-Path $LogFile) | Out-Null
Set-Location $RepoRoot

Write-Log "Starting scheduled push from $RepoRoot"

$status = git status --porcelain
if ($status) {
    Write-Log "WARNING: Uncommitted changes remain; pushing committed history only."
    Write-Log $status
}

$branch = git rev-parse --abbrev-ref HEAD
Write-Log "Pushing branch: $branch"

git push origin HEAD
Write-Log "Push completed successfully."
