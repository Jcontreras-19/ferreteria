# Script para subir código a GitHub
Write-Host "🚀 Configurando Git y subiendo a GitHub..." -ForegroundColor Green

# Verificar si hay un remoto configurado
$remoteUrl = git remote get-url origin 2>$null

if ($remoteUrl) {
    Write-Host "`n✅ Remoto ya configurado: $remoteUrl" -ForegroundColor Green
    Write-Host "`n📤 Subiendo cambios a GitHub..." -ForegroundColor Yellow
    git push -u origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Código subido exitosamente a GitHub!" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Intenta con la rama master:" -ForegroundColor Yellow
        git push -u origin master
    }
} else {
    Write-Host "`n❌ No hay remoto configurado" -ForegroundColor Red
    Write-Host "`n📝 Pasos para configurar:" -ForegroundColor Yellow
    Write-Host "1. Ve a https://github.com y crea un nuevo repositorio" -ForegroundColor Cyan
    Write-Host "2. Copia la URL del repositorio (ej: https://github.com/tu-usuario/ferreteria.git)" -ForegroundColor Cyan
    Write-Host "3. Ejecuta estos comandos:" -ForegroundColor Cyan
    Write-Host "   git remote add origin [URL_DEL_REPOSITORIO]" -ForegroundColor White
    Write-Host "   git branch -M main" -ForegroundColor White
    Write-Host "   git push -u origin main" -ForegroundColor White
    Write-Host "`nO si ya tienes el repositorio, ejecuta:" -ForegroundColor Yellow
    Write-Host "   git remote add origin [URL_DEL_REPOSITORIO]" -ForegroundColor White
}
