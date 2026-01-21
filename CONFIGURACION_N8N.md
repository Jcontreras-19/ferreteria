# 🔗 Configuración del Webhook N8N

## URL del Webhook de Producción

```
https://aquispe.app.n8n.cloud/webhook/envio-cotizaciones
```

## 📋 Variables de Entorno

### Para Desarrollo Local (.env.local)

Crea o actualiza el archivo `.env.local` en la raíz del proyecto con:

```env
N8N_WEBHOOK_URL=https://aquispe.app.n8n.cloud/webhook/envio-cotizaciones
```

### Para Producción (Vercel)

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega o actualiza:
   - **Key:** `N8N_WEBHOOK_URL`
   - **Value:** `https://aquispe.app.n8n.cloud/webhook/envio-cotizaciones`
   - **Environment:** Production (y Development si lo deseas)

## 📤 Formato del Payload

El webhook recibe los siguientes datos en formato JSON:

```json
{
  "cliente": {
    "nombre": "Nombre del Cliente",
    "email": "cliente@email.com",
    "whatsapp": "123456789"
  },
  "carrito": [
    {
      "nombre": "Producto 1",
      "cantidad": 2,
      "precio": 10.50
    }
  ],
  "productosNoEncontrados": [
    {
      "name": "Producto Personalizado",
      "quantity": 1,
      "description": "Descripción opcional"
    }
  ],
  "quoteId": "id_de_la_cotizacion",
  "quoteNumber": 1,
  "numeroCotizacion": "#1",
  "total": 51.88,
  "documentType": "boleta",
  "ruc": null,
  "businessName": null,
  "address": null,
  "createdAt": "2026-01-21T10:30:00.000Z"
}
```

## ✅ Verificación

Para verificar que el webhook está configurado correctamente:

1. Abre la consola del navegador (F12)
2. Ejecuta:
   ```javascript
   fetch('/api/diagnostico-webhook')
     .then(r => r.json())
     .then(data => console.log('Diagnóstico:', data))
   ```

Deberías ver:
- `webhookConfigurado: true`
- `testConexion.exitoso: true`

## 🔍 Logs

Cuando se envía una cotización, verás en los logs del servidor:

- `📤 Enviando cotización a N8N webhook...`
- `✅ Webhook N8N respondió exitosamente`

Si hay errores:
- `❌ Error sending to N8N webhook:`
- `⚠️ N8N_WEBHOOK_URL no está configurada...`
