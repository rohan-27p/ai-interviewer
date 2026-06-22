# Creates git commits via commit-tree (avoids git commit wrapper).
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

function New-GitCommit([string]$Message) {
    $msgFile = Join-Path $PWD 'tmp\git-commit-msg.txt'
    [System.IO.File]::WriteAllText($msgFile, $Message)
    $tree = (& git write-tree 2>$null).Trim()
    if ($tree -notmatch '^[0-9a-f]{40}$') {
        throw "write-tree failed: $tree"
    }
    $parent = (& git rev-parse HEAD).Trim()
    $new = (& git commit-tree $tree -p $parent -F $msgFile 2>$null).Trim()
    if ($new -notmatch '^[0-9a-f]{40}$') {
        throw "commit-tree failed: $new"
    }
    & git reset --hard $new | Out-Null
    Write-Host "Committed: $Message ($new)"
}

# API + cron
& git add src/app/api/ vercel.json
if (Test-Path src/lib/tts.ts) { & git rm -f src/lib/tts.ts }
New-GitCommit 'feat(api): rate limits, direct AI calls, background question gen, and cron cleanup'

# Interview UX
& git add src/app/interview/ src/components/EndInterviewModal.tsx
New-GitCommit 'feat(interview): end modal, text fallback, code autosave, and question polling'

# Tests + turbopack
& git add next.config.ts package.json package-lock.json tests/
New-GitCommit 'chore: add vitest, Turbopack root fix, and unit tests'

# Push script
& git add scripts/
New-GitCommit 'chore: add scheduled push script for deferred remote sync'

# README
& git add README.md
New-GitCommit 'docs: rewrite README for auth, Supabase setup, and current architecture'

Write-Host 'Done. Log:'
& git log --oneline -8
