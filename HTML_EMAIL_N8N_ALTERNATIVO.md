# 📧 HTML Alternativo para Email en N8N (con múltiples fallbacks)

Si el HTML básico no funciona, usa este HTML que intenta múltiples formas de acceder a los datos:

```html
<div style="font-family: Arial, sans-serif; color:#333; padding:20px; border:1px solid #e5e7eb; border-radius:12px; max-width:640px; margin:auto; background:#ffffff;">
  <h2 style="color:#0a6fb7; text-align:center; margin:0 0 18px 0; font-weight:700;">
    ¡Gracias por tu preferencia!
  </h2>

  <p style="margin:0 0 8px 0;">
    Hola <b>{{ $json.body.clientNombre || $json.body.name || (JSON.parse($json.body.body || '{}').cliente?.nombre) || 'Cliente' }}</b>,
  </p>
  <p style="margin:0 0 16px 0;">Adjunto encontrarás tu cotización en formato PDF.</p>

  <div style="background:#f5f7fb; padding:14px 16px; border-radius:8px; border:1px solid #e6eefc;">
    <p style="margin:0 0 6px 0;">
      <b>Número de Cotización:</b> {{ 
        $json.body.numeroCotizacion || 
        $json.body.quoteNumber || 
        (JSON.parse($json.body.body || '{}').numeroCotizacion) || 
        ('#' + (JSON.parse($json.body.body || '{}').quoteNumber || '')) || 
        '—' 
      }}
    </p>
    <p style="margin:0 0 6px 0;">
      <b>Fecha:</b> {{ $now.format('DD MMM YYYY', { locale: 'es' }) }}
    </p>
    <p style="margin:0;">
      <b>Total:</b> {{ 
        (() => {
          const total = $json.body.total || JSON.parse($json.body.body || '{}').total || 0;
          return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(parseFloat(total));
        })()
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

## Versión Simplificada (Recomendada)

Si la versión anterior es muy compleja, usa esta versión más simple que primero intenta los campos directos:

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

## Cómo Probar

1. Agrega un nodo "Function" antes del nodo de correo para ver qué datos llegan
2. Usa este código en el nodo Function:

```javascript
return {
  json: {
    // Datos directos del FormData
    clientNombre: $json.body.clientNombre,
    numeroCotizacion: $json.body.numeroCotizacion,
    quoteNumber: $json.body.quoteNumber,
    total: $json.body.total,
    
    // Datos del JSON parseado (si existen)
    bodyParsed: JSON.parse($json.body.body || '{}'),
    
    // Todos los datos disponibles
    allBody: $json.body
  }
}
```

3. Ejecuta el workflow y revisa la salida del nodo Function
4. Ajusta las expresiones en el HTML según lo que veas en el debug
