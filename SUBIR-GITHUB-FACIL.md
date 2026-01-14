# 🚀 Subir Código a GitHub - Forma Fácil

## Opción 1: GitHub Desktop (MÁS FÁCIL) ⭐

1. **Descarga GitHub Desktop** (si no lo tienes):
   - https://desktop.github.com
   - Instala y abre

2. **Abre tu proyecto**:
   - File → Add Local Repository
   - Selecciona la carpeta: `D:\FERRETERIA2`
   - Click en "Add Repository"

3. **Sube el código**:
   - Verás todos tus archivos listos
   - Escribe un mensaje: "Initial commit"
   - Click en "Commit to main"
   - Click en "Publish repository"
   - Selecciona: "Jcontreras-19/ferreteria"
   - Click en "Publish repository"

¡Listo! Tu código estará en GitHub.

---

## Opción 2: Desde la Terminal (Si GitHub Desktop no funciona)

1. **Abre PowerShell como Administrador**

2. **Ejecuta estos comandos uno por uno**:

```powershell
cd D:\FERRETERIA2
git remote add origin https://github.com/Jcontreras-19/ferreteria.git
git branch -M main
git push -u origin main
```

3. **Cuando pida usuario y contraseña**:
   - Usuario: `Jcontreras-19`
   - Contraseña: Tu contraseña de GitHub (o crea un token si pide)

---

## Opción 3: Usar SSH (Sin contraseñas)

Si tienes SSH configurado:

```powershell
git remote set-url origin git@github.com:Jcontreras-19/ferreteria.git
git push -u origin main
```

---

## ✅ Verificar

Ve a: https://github.com/Jcontreras-19/ferreteria

Deberías ver todos tus archivos.
