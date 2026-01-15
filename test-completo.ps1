# Script de Pruebas Completas
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  VERIFICACIÓN COMPLETA DEL SISTEMA" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Verificar Git
Write-Host "1. Verificando Git..." -ForegroundColor Yellow
$gitStatus = git status --short 2>&1
if ($LASTEXITCODE -eq 0) {
    if ($gitStatus) {
        Write-Host "   ⚠️  Hay cambios sin commitear" -ForegroundColor Yellow
        Write-Host "   $gitStatus" -ForegroundColor Gray
    } else {
        Write-Host "   ✅ Git limpio" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Error verificando Git" -ForegroundColor Red
}

# 2. Verificar Build
Write-Host "`n2. Ejecutando Build..." -ForegroundColor Yellow
$buildOutput = npm run build 2>&1
$buildSuccess = $LASTEXITCODE -eq 0
if ($buildSuccess) {
    Write-Host "   ✅ Build exitoso" -ForegroundColor Green
    if ($buildOutput -match "✓ Compiled successfully") {
        Write-Host "   ✅ Compilación exitosa" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Build falló" -ForegroundColor Red
    Write-Host "   $buildOutput" -ForegroundColor Red
}

# 3. Verificar Archivos Clave
Write-Host "`n3. Verificando archivos clave..." -ForegroundColor Yellow

$filesToCheck = @(
    @{Path="pages/admin/productos.js"; Check="pagination?.totalPages"},
    @{Path="components/Header.js"; Check="mis-cotizaciones"},
    @{Path="pages/index.js"; Check="SERVICIOS DE APOYO A LAS EMPRESAS"},
    @{Path="pages/api/productos/index.js"; Check="pagination"},
    @{Path="pages/api/clientes/[id].js"; Check="DELETE"},
    @{Path="pages/admin/administradores.js"; Check="GESTIÓN DE USUARIOS"}
)

$allOk = $true
foreach ($file in $filesToCheck) {
    if (Test-Path $file.Path) {
        $content = Get-Content $file.Path -Raw
        if ($content -match $file.Check) {
            Write-Host "   ✅ $($file.Path)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $($file.Path) - No encontrado: $($file.Check)" -ForegroundColor Red
            $allOk = $false
        }
    } else {
        Write-Host "   ❌ $($file.Path) - Archivo no existe" -ForegroundColor Red
        $allOk = $false
    }
}

# 4. Verificar Linter
Write-Host "`n4. Verificando Linter..." -ForegroundColor Yellow
$lintOutput = npm run lint 2>&1 | Out-String
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Sin errores de linter" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Errores de linter encontrados" -ForegroundColor Yellow
}

# 5. Resumen
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build: $(if ($buildSuccess) { '✅ Exitoso' } else { '❌ Falló' })" -ForegroundColor $(if ($buildSuccess) { 'Green' } else { 'Red' })
Write-Host "Archivos: $(if ($allOk) { '✅ Todos correctos' } else { '❌ Algunos con problemas' })" -ForegroundColor $(if ($allOk) { 'Green' } else { 'Red' })
Write-Host "`n" -ForegroundColor White
