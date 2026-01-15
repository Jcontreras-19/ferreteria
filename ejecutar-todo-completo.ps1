# Script para subir a GitHub, hacer build y deploy
Write-Host "🚀 Iniciando proceso completo..." -ForegroundColor Green

# Paso 1: Agregar y commitear cambios
Write-Host "`n📝 Agregando cambios a Git..." -ForegroundColor Yellow
git add -A
$status = git status --short
if ($status) {
    Write-Host "Cambios detectados:" -ForegroundColor Cyan
    Write-Host $status
    git commit -m "Mejora diseño tabla clientes: modal de acciones unificado y mejor presentación de iconos"
    Write-Host "✅ Cambios commiteados" -ForegroundColor Green
} else {
    Write-Host "⚠️  No hay cambios para commitear" -ForegroundColor Yellow
}

# Paso 2: Push a GitHub
Write-Host "`n📤 Subiendo a GitHub..." -ForegroundColor Yellow
$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Host "Remoto configurado: $remote" -ForegroundColor Cyan
    $branch = git branch --show-current
    Write-Host "Rama actual: $branch" -ForegroundColor Cyan
    git push origin $branch 2>&1 | Write-Host
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Código subido a GitHub exitosamente!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Error al subir a GitHub. Verifica tu conexión y permisos." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ No hay remoto configurado. Los cambios están solo localmente." -ForegroundColor Red
}

# Paso 3: Build
Write-Host "`n📦 Ejecutando build..." -ForegroundColor Yellow
npm run build 2>&1 | Write-Host
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build completado exitosamente!" -ForegroundColor Green
} else {
    Write-Host "❌ Error en el build. Revisa los errores arriba." -ForegroundColor Red
    exit 1
}

# Paso 4: Deploy a Vercel
Write-Host "`n🚀 Desplegando a Vercel..." -ForegroundColor Yellow
npm run deploy 2>&1 | Write-Host
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy completado exitosamente!" -ForegroundColor Green
} else {
    Write-Host "⚠️  El deploy puede haber fallado. Verifica en tu dashboard de Vercel." -ForegroundColor Yellow
}

Write-Host "`n✨ Proceso completado!" -ForegroundColor Green
