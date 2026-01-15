# Script Automático - Ejecuta todo y muestra salida
$logFile = "ejecucion-log.txt"
"========================================" | Out-File $logFile
"  EJECUCIÓN AUTOMÁTICA - $(Get-Date)" | Out-File $logFile -Append
"========================================" | Out-File $logFile -Append
"" | Out-File $logFile -Append

# 1. Git Status
Write-Host "`n[1/4] Verificando Git..." -ForegroundColor Yellow
"--- GIT STATUS ---" | Out-File $logFile -Append
git status 2>&1 | Tee-Object -FilePath $logFile -Append | Write-Host
"" | Out-File $logFile -Append

# 2. Git Add y Commit
Write-Host "`n[2/4] Agregando cambios a Git..." -ForegroundColor Yellow
"--- GIT ADD & COMMIT ---" | Out-File $logFile -Append
git add -A 2>&1 | Out-File $logFile -Append
git commit -m "Auto: Cambios automáticos $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1 | Tee-Object -FilePath $logFile -Append | Write-Host
"" | Out-File $logFile -Append

# 3. Build
Write-Host "`n[3/4] Ejecutando Build..." -ForegroundColor Yellow
"--- BUILD ---" | Out-File $logFile -Append
$buildResult = npm run build 2>&1
$buildResult | Out-File $logFile -Append
$buildResult | Write-Host
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build exitoso!" -ForegroundColor Green
} else {
    Write-Host "❌ Build falló!" -ForegroundColor Red
}
"" | Out-File $logFile -Append

# 4. Git Push
Write-Host "`n[4/4] Subiendo a GitHub..." -ForegroundColor Yellow
"--- GIT PUSH ---" | Out-File $logFile -Append
git push origin master 2>&1 | Tee-Object -FilePath $logFile -Append | Write-Host
"" | Out-File $logFile -Append

Write-Host "`n✅ Proceso completado!" -ForegroundColor Green
Write-Host "📄 Log guardado en: $logFile" -ForegroundColor Cyan
