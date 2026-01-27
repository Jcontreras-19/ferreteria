# 🔧 Variables de Entorno Requeridas en Vercel

## ⚠️ CRÍTICO: Variables Obligatorias para el Build

Para que el build en Vercel funcione correctamente, necesitas configurar estas variables de entorno:

### 1. **DATABASE_URL** (OBLIGATORIO para el build)
- **Key**: `DATABASE_URL`
- **Value**: Tu string de conexión de PostgreSQL de Supabase
- **Formato**: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres`
- **Environment**: Marca **TODAS** (Production, Preview, Development)
- **⚠️ IMPORTANTE**: Sin esta variable, el build fallará porque Prisma necesita generar el cliente durante `postinstall`

### 2. **JWT_SECRET** (OBLIGATORIO)
- **Key**: `JWT_SECRET`
- **Value**: Una clave secreta para firmar tokens JWT (ej: `ferreteria-secret-key-2024-super-segura`)
- **Environment**: Marca **TODAS** (Production, Preview, Development)

### 3. **SUPABASE_URL** (Ya configurado ✅)
- Ya lo tienes configurado

### 4. **SUPABASE_ANON_KEY** o **NEXT_PUBLIC_SUPABASE_ANON_KEY** (Ya configurado ✅)
- Ya lo tienes configurado

### 5. **N8N_WEBHOOK_URL** (Obligatorio para funcionalidad)
- **Key**: `N8N_WEBHOOK_URL`
- **Value**: `https://aquispe.app.n8n.cloud/webhook/envio-cotizaciones`
- **Environment**: Marca **TODAS** (Production, Preview, Development)

## 📋 Pasos para Configurar en Vercel

1. Ve a **Vercel Dashboard** → Tu Proyecto → **Settings** → **Environment Variables**

2. Agrega o verifica estas variables:
   - ✅ `DATABASE_URL` (CRÍTICO - debe estar configurada)
   - ✅ `JWT_SECRET`
   - ✅ `SUPABASE_URL` (ya configurado)
   - ✅ `SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ya configurado)
   - ✅ `N8N_WEBHOOK_URL`

3. **IMPORTANTE**: Después de agregar/modificar variables:
   - Ve a **Deployments**
   - Haz clic en **Redeploy** en el último deployment
   - O haz un nuevo `git push` para trigger un nuevo deployment

## 🔍 Cómo Verificar que Está Configurado Correctamente

1. Ve a **Settings** → **Environment Variables** en Vercel
2. Verifica que `DATABASE_URL` esté presente y tenga el formato correcto
3. Verifica que todas las variables estén marcadas para los ambientes correctos (Production, Preview, Development)

## 🚨 Error Común: "Build Failed"

Si ves "Build Failed" en Vercel, el problema más común es:

1. **Falta `DATABASE_URL`**: El build falla durante `prisma generate` porque no puede conectarse a la base de datos
2. **`DATABASE_URL` incorrecta**: Verifica que el formato sea correcto y que la contraseña esté bien
3. **Variables no aplicadas**: Después de agregar variables, debes hacer un **Redeploy**

## ✅ Después de Configurar

Una vez que hayas agregado todas las variables y hecho un redeploy, el build debería funcionar correctamente.
