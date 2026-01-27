# Script para subir código a GitHub
Write-Host "`n🚀 SUBIENDO CÓDIGO A GITHUB`n" -ForegroundColor Green

# Verificar si ya existe git
if (-not (Test-Path .git)) {
    Write-Host "Inicializando repositorio Git..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# Verificar remote
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "Agregando remote de GitHub..." -ForegroundColor Yellow
    git remote add origin https://github.com/Jcontreras-19/ferreteria.git
}

# Agregar todos los archivos
Write-Host "`nAgregando archivos..." -ForegroundColor Yellow
git add .

# Commit
Write-Host "Creando commit..." -ForegroundColor Yellow
$fecha = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "Actualización: $fecha"

# Push
Write-Host "`nSubiendo a GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host "`n✅ Código subido exitosamente!`n" -ForegroundColor Green
