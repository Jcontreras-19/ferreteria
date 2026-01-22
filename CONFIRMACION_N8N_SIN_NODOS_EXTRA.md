# ✅ CONFIRMACIÓN: NO NECESITAS NODOS ADICIONALES EN N8N

## 🎯 Respuesta Directa

**NO, NO necesitas agregar más nodos en tu workflow de N8N.**

Los datos ya están siendo enviados directamente como campos individuales en el FormData, por lo que N8N puede acceder a ellos directamente desde el nodo Webhook sin necesidad de nodos "Function" o "Code" adicionales.

## 📦 Qué se está enviando actualmente

Cuando se envía una cotización, el código envía estos campos **directamente** en el FormData:

### Campos Directos (disponibles en `$json.body.*`):
- ✅ `clientNombre` → Nombre del cliente
- ✅ `numeroCotizacion` → Número de cotización con formato "#89"
- ✅ `quoteNumber` → Número de cotización sin el "#" (ej: "89")
- ✅ `total` → Total como string (ej: "61.97")
- ✅ `name` → Nombre del cliente (alternativo)
- ✅ `email` → Email del cliente
- ✅ `phone` → Teléfono/WhatsApp

### Campos JSON (para referencia, pero NO necesarios si usas los campos directos):
- `body` → JSON stringificado con todos los datos
- `data` → JSON stringificado con estructura completa

## 🔧 Lo ÚNICO que necesitas hacer

**Solo actualizar el HTML del nodo "CORREO CLIENTE"** en N8N con estas expresiones:

```html
<div style="font-family: Arial, sans-serif; color:#333; padding:20px; border:1px solid #e5e7eb; border-radius:12px; max-width:640px; margin:auto; background:#ffffff;">
  <h2 style="color:#0a6fb7; text-align:center; margin:0 0 18px 0; font-weight:700;">
    ¡Gracias por tu preferencia!
  </h2>

  <p style="margin:0 0 8px 0;">
    Hola <b>{{ $json.body.clientNombre || $json.body.name || 'Cliente' }}</b>,
  </p>
  <p style="margin:0 0 16px 0;">Adjunto encontrarás tu cotización en formato PDF.</p>

  <div style="background:#f5f7fb; padding:14px 16px; border-radius:8px; border:1px solid #e6eefc;">
    <p style="margin:0 0 6px 0;">
      <b>Número de Cotización:</b> {{ $json.body.numeroCotizacion || ('#' + $json.body.quoteNumber) || '—' }}
    </p>
    <p style="margin:0 0 6px 0;">
      <b>Fecha:</b> {{ $now.format('DD MMM YYYY', { locale: 'es' }) }}
    </p>
    <p style="margin:0;">
      <b>Total:</b> {{ 
        $json.body.total ? 
          new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(parseFloat($json.body.total)) : 
          'S/ 0.00'
      }}
    </p>
  </div>

  <p style="margin:16px 0 0 0;">Si tienes alguna consulta, no dudes en responder este correo.</p>

  <p style="margin-top:20px;">
    Saludos cordiales,<br>
    <b>Ferretería Danny</b>
  </p>

  <hr style="border:none; border-top:1px solid #e5e7eb; margin:22px 0;">
  <p style="font-size:12px; color:#6b7280; text-align:center; margin:0;">
    Este correo es generado automáticamente. Por favor, no responder a esta dirección.
  </p>
</div>
```

## 📋 Estructura del Workflow N8N (Mínima Necesaria)

Tu workflow solo necesita estos nodos:

```
1. Webhook (recibe los datos)
   ↓
2. CORREO CLIENTE (envía el email con el HTML actualizado)
```

**NO necesitas:**
- ❌ Nodo "Function" para parsear JSON
- ❌ Nodo "Code" para procesar datos
- ❌ Nodo "Set" para mapear campos
- ❌ Cualquier otro nodo adicional

## 🔍 Cómo funciona

Cuando N8N recibe un `multipart/form-data` request:

1. **N8N automáticamente mapea los campos del FormData a `$json.body.*`**
   - `formData.append('clientNombre', 'Juan')` → `$json.body.clientNombre = 'Juan'`
   - `formData.append('total', '61.97')` → `$json.body.total = '61.97'`
   - `formData.append('numeroCotizacion', '#89')` → `$json.body.numeroCotizacion = '#89'`

2. **Puedes acceder directamente a estos campos en cualquier expresión**
   - `{{ $json.body.clientNombre }}` → "Juan"
   - `{{ $json.body.total }}` → "61.97"
   - `{{ $json.body.numeroCotizacion }}` → "#89"

3. **El PDF adjunto está disponible automáticamente**
   - N8N maneja automáticamente los archivos adjuntos en `multipart/form-data`

## ✅ Garantía

**Confirmado:** Los campos `clientNombre`, `numeroCotizacion`, `quoteNumber`, y `total` están siendo enviados directamente en el FormData en ambos endpoints:
- ✅ `pages/api/cotizacion.js` (cuando un cliente envía cotización)
- ✅ `pages/api/cotizaciones/[id]/autorizar.js` (cuando un admin autoriza)

**Por lo tanto, NO necesitas nodos adicionales. Solo actualiza el HTML del nodo de correo.**

## 🧪 Si algo no funciona

Si después de actualizar el HTML los campos no aparecen, puedes agregar temporalmente un nodo "Function" SOLO para debugging (no es necesario para producción):

```javascript
// Nodo Function (solo para debugging - eliminar después)
return {
  json: {
    debug: $json.body,
    clientNombre: $json.body.clientNombre,
    numeroCotizacion: $json.body.numeroCotizacion,
    total: $json.body.total
  }
}
```

Pero esto es **solo para verificar qué datos llegan**. Una vez confirmado, puedes eliminar este nodo y usar directamente las expresiones en el HTML.

---

## 📝 Resumen

✅ **NO necesitas agregar más nodos**  
✅ **Solo actualiza el HTML del nodo de correo**  
✅ **Los datos están disponibles directamente en `$json.body.*`**  
✅ **El PDF se adjunta automáticamente**
