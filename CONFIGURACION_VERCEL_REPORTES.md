# ⚙️ Configuración en Vercel para Reportes Programados

## ✅ Variables de Entorno Necesarias

Ve a **Vercel Dashboard** → Tu Proyecto → **Settings** → **Environment Variables** y agrega:

### 1. **CRON_SECRET** (Recomendado pero Opcional)
- **Key**: `CRON_SECRET`
- **Value**: Genera un token secreto (ej: `mi-token-secreto-2024-xyz123`)
- **Environment**: Marca todas (Production, Preview, Development)
- **Nota**: Si no lo configuras, el sistema solo aceptará llamadas desde Vercel Cron (más seguro)

### 2. **N8N_WEBHOOK_URL** (Obligatorio)
- **Key**: `N8N_WEBHOOK_URL`
- **Value**: Tu URL del webhook de N8N (ej: `https://aquispe.app.n8n.cloud/webhook/reportes-cotizaciones`)
- **Environment**: Marca todas (Production, Preview, Development)
- **Nota**: Este webhook debe estar configurado en N8N para recibir los reportes con PDF

### 3. **DATABASE_URL** (Ya configurado ✅)
- Ya lo tienes configurado, perfecto.

## 🔧 Configuración del Cron Job

El archivo `vercel.json` ya está configurado para ejecutar el cron job cada 5 minutos:

```json
{
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/reportes/ejecutar-programados",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Nota**: Vercel Cron está disponible en planes **Pro** y **Enterprise**. Si estás en plan Hobby, necesitarás usar un servicio externo.

## 📋 Pasos para Configurar

1. **Agrega las variables de entorno en Vercel:**
   - `CRON_SECRET` (opcional pero recomendado)
   - `N8N_WEBHOOK_URL` (obligatorio)

2. **Haz un nuevo deployment:**
   - Ve a **Deployments** → Haz clic en **Redeploy** en el último deployment
   - O haz `git push` para un nuevo deployment automático

3. **Verifica que el cron job esté activo:**
   - Ve a **Settings** → **Cron Jobs** en Vercel
   - Deberías ver el cron job listado

## 🔄 Alternativa: Servicio Externo de Cron (Si estás en plan Hobby)

Si no tienes acceso a Vercel Cron, puedes usar un servicio externo:

### Opción 1: EasyCron o Cron-job.org

1. Crea una cuenta en [EasyCron](https://www.easycron.com/) o [cron-job.org](https://cron-job.org/)
2. Crea un nuevo cron job:
   - **URL**: `https://tu-dominio.vercel.app/api/reportes/ejecutar-programados?secret=TU_CRON_SECRET`
   - **Schedule**: Cada 5 minutos (`*/5 * * * *`)
   - **Method**: GET

### Opción 2: GitHub Actions

Puedes crear un workflow de GitHub Actions que ejecute el endpoint cada 5 minutos.

## ✅ Verificación

Para verificar que todo funciona:

1. **Crea una programación de prueba:**
   - Ve a `/admin/reportes-programados`
   - Crea una programación con hora actual + 1 minuto
   - Espera a que se ejecute

2. **Revisa los logs:**
   - Ve a **Vercel Dashboard** → **Functions** → Busca `ejecutar-programados`
   - Revisa los logs para ver si se ejecutó correctamente

3. **Verifica en N8N:**
   - Revisa que el webhook recibió el PDF y los datos
   - Verifica que el correo se envió correctamente

## 🚨 Troubleshooting

### El cron job no se ejecuta:
- Verifica que estés en plan Pro o Enterprise
- Revisa que `vercel.json` esté correctamente configurado
- Verifica los logs en Vercel

### Error "No autorizado":
- Verifica que `CRON_SECRET` esté configurado correctamente
- O que el cron job esté usando el header `x-vercel-cron` de Vercel

### El PDF no se envía:
- Verifica que `N8N_WEBHOOK_URL` esté configurado
- Revisa que el webhook en N8N esté activo
- Verifica los logs del endpoint para ver errores
