# Script de Deploy Automático para Vercel
Write-Host "🚀 Iniciando deploy automático..." -ForegroundColor Green

# Paso 1: Verificar build
Write-Host "`n📦 Verificando build local..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en el build. Abortando deploy." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build exitoso" -ForegroundColor Green

# Paso 2: Verificar que el archivo está correcto
Write-Host "`n🔍 Verificando archivo productos.js..." -ForegroundColor Yellow
$fileContent = Get-Content "pages\admin\productos.js" -Raw
if ($fileContent -match "Paginación para vista de cards") {
    Write-Host "❌ El archivo todavía tiene el comentario problemático" -ForegroundColor Red
    exit 1
}
if ($fileContent -match "pagination\?\.totalPages > 1") {
    Write-Host "✅ Archivo correcto (línea 982)" -ForegroundColor Green
} else {
    Write-Host "⚠️  No se encontró la validación esperada" -ForegroundColor Yellow
}

# Paso 3: Deploy a Vercel
Write-Host "`n🚀 Desplegando a Vercel..." -ForegroundColor Yellow
Write-Host "Ejecutando: vercel --prod --yes" -ForegroundColor Cyan

# Intentar deploy con Vercel CLI
$deployResult = vercel --prod --yes 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deploy completado exitosamente!" -ForegroundColor Green
    Write-Host $deployResult
} else {
    Write-Host "`n⚠️  El comando de deploy no produjo salida visible" -ForegroundColor Yellow
    Write-Host "Verifica en tu dashboard de Vercel si el deployment se inició" -ForegroundColor Cyan
    Write-Host "O ejecuta manualmente: vercel --prod" -ForegroundColor Cyan
}

Write-Host "`n✨ Proceso completado" -ForegroundColor Green
