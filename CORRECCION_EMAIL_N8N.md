# 🔧 Corrección del Email en N8N

## Cambios Realizados

### 1. Nombre del PDF ✅
El nombre del PDF ahora es: **`cotizacion - 89.pdf`** (formato simple)

### 2. Campos Disponibles en N8N ✅

Ahora enviamos estos campos directamente en el FormData, disponibles en `$json.body.*`:

- `clientNombre` - Nombre del cliente
- `numeroCotizacion` - Número de cotización (ej: "#89")
- `quoteNumber` - Número de cotización sin el #
- `total` - Total como string
- `email` - Email del cliente
- `name` - Nombre del cliente (alternativo)
- `phone` - Teléfono/WhatsApp

## Corrección del HTML del Email en N8N

Actualiza tu nodo "CORREO CLIENTE" con este HTML corregido:

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
      <b>Número de Cotización:</b> {{ $json.body.numeroCotizacion || $json.body.quoteNumber || '—' }}
    </p>
    <p style="margin:0 0 6px 0;">
      <b>Fecha:</b> {{ $now.format('DD MMM YYYY', { locale: 'es' }) }}
    </p>
    <p style="margin:0;">
      <b>Total:</b> {{ new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(parseFloat($json.body.total || 0)) }}
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

## Cambios en las Expresiones

### Nombre del Cliente:
**Antes:** `{{ $json.body.clientNombre || $json.body['cliente[nombre]'] || 'Cliente' }}`  
**Ahora:** `{{ $json.body.clientNombre || $json.body.name || 'Cliente' }}` ✅

### Número de Cotización:
**Antes:** `{{ $json.body.numeroCotizacion || $json.body.quoteNumber || '—' }}`  
**Ahora:** (Sin cambios, pero ahora funciona correctamente) ✅

### Total:
**Antes:** `{{ new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(parseFloat($json.body.total)) }}`  
**Ahora:** `{{ new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(parseFloat($json.body.total || 0)) }}` ✅

### Fecha:
**Antes:** `{{ $now.format('DD MMM YYYY', { locale: 'es' }).replace('.', '') }}`  
**Ahora:** `{{ $now.format('DD MMM YYYY', { locale: 'es' }) }}` ✅ (removido el `.replace` que causaba el problema)

## Verificación

Después de actualizar el HTML en N8N:
1. El nombre del cliente debería aparecer correctamente
2. El número de cotización debería mostrar "#89" (o el número correspondiente)
3. El total debería mostrar "S/ 61.97" (o el monto correcto)
4. El PDF adjunto debería llamarse "cotizacion - 89.pdf"
