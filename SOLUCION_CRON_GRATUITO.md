# Solución para Cron Jobs en Plan Gratuito de Vercel

## Problema
Vercel Hobby (plan gratuito) solo permite cron jobs que se ejecuten **una vez al día**. Para ejecutar reportes programados a diferentes horas, necesitamos una alternativa.

## Solución Recomendada: Servicio Externo Gratuito

### Opción 1: cron-job.org (Recomendado - Gratuito)

1. **Crear cuenta en**: https://cron-job.org (gratuito)
2. **Configurar el cron job**:
   - **URL**: `https://tu-dominio.vercel.app/api/reportes/ejecutar-programados?secret=TU_CRON_SECRET`
   - **Frecuencia**: Cada 5 minutos (`*/5 * * * *`)
   - **Método**: GET
   - **Timeout**: 60 segundos

3. **Configurar CRON_SECRET en Vercel**:
   - Ve a Vercel Dashboard → Settings → Environment Variables
   - Agrega: `CRON_SECRET` = (un string aleatorio seguro, ej: `tu-secret-super-seguro-123`)

### Opción 2: EasyCron (Gratuito)

1. **Crear cuenta en**: https://www.easycron.com (plan gratuito disponible)
2. **Configurar similar a cron-job.org**

### Opción 3: UptimeRobot (Gratuito - Monitoreo + Cron)

1. **Crear cuenta en**: https://uptimerobot.com
2. Configurar como "HTTP(s) Monitor" que llame al endpoint cada 5 minutos

## Configuración del Endpoint

El endpoint `/api/reportes/ejecutar-programados` ya está preparado para aceptar:
- Llamadas desde Vercel Cron (header `x-vercel-cron`)
- Llamadas externas con `CRON_SECRET` en query string o header

## Ejemplo de URL para Servicio Externo

```
https://tu-app.vercel.app/api/reportes/ejecutar-programados?secret=TU_CRON_SECRET
```

## Ventajas

✅ **Gratuito** - No requiere upgrade a Vercel Pro
✅ **Flexible** - Puedes configurar cualquier frecuencia
✅ **Confiable** - Servicios profesionales con alta disponibilidad
✅ **Fácil de configurar** - Solo necesitas la URL y el secret

## Desventajas

⚠️ Dependes de un servicio externo
⚠️ Necesitas crear cuenta en otro servicio

## Alternativa: Upgrade a Vercel Pro

Si prefieres mantener todo en Vercel, puedes hacer upgrade al plan Pro que permite cron jobs con cualquier frecuencia.
