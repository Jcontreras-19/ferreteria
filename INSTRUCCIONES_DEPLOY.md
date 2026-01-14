# 🚀 INSTRUCCIONES PARA SUBIR CAMBIOS A VERCEL

## ⚠️ PROBLEMA IDENTIFICADO
Los cambios están solo en tu computadora local. Necesitas subirlos a GitHub para que Vercel los despliegue automáticamente.

## 📋 ARCHIVOS MODIFICADOS (Deben estar en el commit):

1. ✅ `pages/api/productos/index.js` - Paginación
2. ✅ `pages/admin/productos.js` - Controles de paginación
3. ✅ `pages/api/clientes/[id].js` - Cambiar contraseña y eliminar
4. ✅ `pages/admin/clientes.js` - Botones y modales
5. ✅ `pages/admin/administradores.js` - Cambios de texto
6. ✅ `pages/mis-cotizaciones.js` - Panel mejorado
7. ✅ `pages/admin/cotizaciones.js` - Reporte mejorado
8. ✅ `components/Header.js` - Menú "Mis Cotizaciones"

## 🔧 PASOS PARA SUBIR A GITHUB:

### Opción 1: Usando Git en la Terminal

Abre tu terminal (PowerShell o CMD) en la carpeta del proyecto y ejecuta:

```bash
# 1. Ir a la carpeta del proyecto
cd d:\FERRETERIA2

# 2. Ver qué archivos han cambiado
git status

# 3. Agregar TODOS los cambios
git add .

# 4. Hacer commit con un mensaje descriptivo
git commit -m "Implementación completa: paginación productos, gestión usuarios, reportes mejorados, menú cliente"

# 5. Subir a GitHub (cambia 'main' por tu rama si es diferente)
git push origin main
```

### Opción 2: Usando GitHub Desktop (si lo tienes instalado)

1. Abre GitHub Desktop
2. Verás los archivos modificados en la columna izquierda
3. Escribe un mensaje de commit: "Implementación completa: paginación productos, gestión usuarios, reportes mejorados"
4. Haz clic en "Commit to main"
5. Haz clic en "Push origin"

### Opción 3: Usando VS Code (si lo usas)

1. Abre VS Code en la carpeta del proyecto
2. Ve a la pestaña "Source Control" (icono de ramificación en la barra lateral)
3. Verás todos los archivos modificados
4. Haz clic en el "+" junto a "Changes" para agregar todos
5. Escribe un mensaje de commit arriba
6. Haz clic en el checkmark (✓) para hacer commit
7. Haz clic en "..." y luego "Push" para subir

## ✅ DESPUÉS DEL PUSH:

1. Ve a tu repositorio en GitHub.com
2. Verifica que los cambios estén ahí
3. Ve a Vercel.com → Tu proyecto → Deployments
4. Verás un nuevo deploy iniciándose automáticamente
5. Espera 2-5 minutos a que termine el build
6. ¡Listo! Los cambios estarán en producción

## 🔍 VERIFICACIÓN POST-DEPLOY:

Una vez desplegado, verifica:

- [ ] Paginación en productos (10 por página)
- [ ] Botones "Cambiar Contraseña" y "Eliminar" en panel de clientes
- [ ] Título "GESTIÓN DE USUARIOS" en administradores
- [ ] Rol "Cliente" en lugar de "customer"
- [ ] Panel "Mis Cotizaciones" con filtros y exportación
- [ ] Reporte de cotizaciones con una fila por producto
- [ ] Enlace "Mis Cotizaciones" en el menú del usuario

## ❓ SI HAY PROBLEMAS:

Si git push falla, verifica:
- ¿Tienes conexión a internet?
- ¿Está configurado el remote de GitHub? (`git remote -v`)
- ¿Tienes permisos para hacer push?
- ¿Estás en la rama correcta? (`git branch`)

Si necesitas ayuda, comparte el mensaje de error.
