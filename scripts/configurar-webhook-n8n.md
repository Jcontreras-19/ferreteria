# 🔧 Script de Configuración del Webhook N8N

## URL del Webhook de Producción

```
https://aquispe.app.n8n.cloud/webhook/envio-cotizaciones
```

## ⚙️ Configuración Automática

### Opción 1: Configurar en Vercel (Recomendado para Producción)

1. Ve a https://vercel.com
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega o actualiza:
   - **Key:** `N8N_WEBHOOK_URL`
   - **Value:** `https://aquispe.app.n8n.cloud/webhook/envio-cotizaciones`
   - **Environment:** Selecciona Production, Preview y Development
5. Haz clic en **Save**
6. **IMPORTANTE:** Despliega nuevamente tu aplicación para que los cambios surtan efecto

### Opción 2: Configurar en Desarrollo Local

1. Crea o edita el archivo `.env.local` en la raíz del proyecto
2. Agrega esta línea:

```env
N8N_WEBHOOK_URL=https://aquispe.app.n8n.cloud/webhook/envio-cotizaciones
```

3. Reinicia tu servidor de desarrollo (`npm run dev`)

## ✅ Verificación

Después de configurar, verifica que funciona:

1. Abre la consola del navegador (F12)
2. Ejecuta:
   ```javascript
   fetch('/api/diagnostico-webhook')
     .then(r => r.json())
     .then(data => console.log('Diagnóstico:', data))
   ```

Deberías ver:
```json
{
  "webhookConfigurado": true,
  "webhookUrl": "https://aquispe.app.n8n.cloud/webhook/envio-cotizaciones",
  "testConexion": {
    "exitoso": true,
    "status": 200,
    "mensaje": "✅ Conexión exitosa con N8N"
  }
}
```

## 🚨 Solución de Problemas

### Si ves "webhookConfigurado: false"
- Verifica que la variable `N8N_WEBHOOK_URL` esté configurada en Vercel
- Asegúrate de haber desplegado nuevamente después de agregar la variable

### Si ves "Error de conexión"
- Verifica que la URL del webhook sea correcta
- Verifica que el webhook de N8N esté activo
- Revisa los logs de N8N para ver si está recibiendo las peticiones
