Write-Host ""
Write-Host "NOVA Distributed CI/CD Demo"
Write-Host "===================================="
Write-Host ""

# ========================================
# LOW PRIORITY
# ========================================

Write-Host "Triggering LOW priority..."

Set-Location "C:\Users\Laksh\Nova\nova-repo-1"

git checkout docs/update-readme
git pull origin docs/update-readme --rebase

Add-Content trigger.txt "LOW_TRIGGER $(Get-Date)"

git add .
git commit -m "docs: low priority update"
git push origin docs/update-readme

Write-Host "LOW queued"
Write-Host ""

# ========================================
# MEDIUM PRIORITY
# ========================================

Write-Host "Triggering MEDIUM priority..."

Set-Location "C:\Users\Laksh\Nova\nova-repo-2"

git checkout feature/auth
git pull origin feature/auth --rebase

Add-Content trigger.txt "MEDIUM_TRIGGER $(Get-Date)"

git add .
git commit -m "feat: medium priority update"
git push origin feature/auth

Write-Host "MEDIUM queued"
Write-Host ""

# ========================================
# HIGH PRIORITY
# ========================================

Write-Host "Triggering HIGH priority..."

Set-Location "C:\Users\Laksh\Nova\nova-repo-1"

git checkout main
git pull origin main --rebase

Add-Content trigger.txt "HIGH_TRIGGER $(Get-Date)"

git add .
git commit -m "fix: high priority runtime patch"
git push origin main

Write-Host "HIGH queued"
Write-Host ""

# ========================================
# CRITICAL PRIORITY
# ========================================

Write-Host "Triggering CRITICAL priority..."

Set-Location "C:\Users\Laksh\Nova\nova-repo-3"

git checkout hotfix/docker
git pull origin hotfix/docker --rebase

Add-Content trigger.txt "CRITICAL_TRIGGER $(Get-Date)"

git add .
git commit -m "[URGENT] critical docker hotfix"
git push origin hotfix/docker

Write-Host "CRITICAL queued"
Write-Host ""

Write-Host "===================================="
Write-Host "ALL NOVA JOBS TRIGGERED"
Write-Host "===================================="
Write-Host ""

Write-Host "Dashboard:"
Write-Host "http://localhost:5173"

