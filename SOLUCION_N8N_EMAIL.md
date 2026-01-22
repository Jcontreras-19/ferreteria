# 🔧 Solución para el Error "No recipients defined" en N8N

## Problema

Cuando se envía el payload a N8N usando `multipart/form-data` (necesario para enviar el PDF), el campo `body` llega como un **string JSON**, no como un objeto parseado.

Por eso, la expresión `{{ $json.body.cliente.email }}` devuelve `undefined` porque `$json.body` es un string, no un objeto.

## Solución en N8N

Tienes **dos opciones** para acceder al email del cliente:

### Opción 1: Usar el campo directo (RECOMENDADO) ✅

En el nodo de email de N8N, cambia la expresión del campo **"To Email"** a:

```
{{ $json.email }}
```

Este campo está disponible directamente porque lo enviamos como `formData.append('email', email)`.

### Opción 2: Parsear el JSON del campo body

Si necesitas mantener la estructura `body.cliente.email`, usa:

```
{{ JSON.parse($json.body).cliente.email }}
```

Esto parsea el string JSON del campo `body` y luego accede a `cliente.email`.

## Campos Disponibles en N8N

Cuando recibes el webhook, tienes acceso a estos campos:

### Campos Directos (sin parsear):
- `{{ $json.name }}` - Nombre del cliente
- `{{ $json.email }}` - Email del cliente ⭐ **USA ESTE PARA EL EMAIL**
- `{{ $json.phone }}` - Teléfono/WhatsApp del cliente

### Campos JSON (necesitan parseo):
- `{{ $json.body }}` - String JSON con toda la información
- `{{ $json.data }}` - String JSON con el payload completo

Para acceder a datos dentro de `body` o `data`, usa:
- `{{ JSON.parse($json.body).cliente.email }}`
- `{{ JSON.parse($json.body).carrito }}`
- `{{ JSON.parse($json.body).total }}`
- etc.

## Ejemplo Completo en N8N

**Nodo: CORREO CLIENTE**

- **From Email:** `jcontreras0011@gmail.com`
- **To Email:** `{{ $json.email }}` ⬅️ **CAMBIA ESTO**
- **Subject:** `TU COTIZACIÓN | FERRETERIA DANNY`
- **Email Format:** `HTML`

## Verificación

Después de hacer el cambio, ejecuta el workflow y verifica que:
1. El campo "To Email" muestre el email correcto (no `undefined`)
2. El email se envíe exitosamente
3. No aparezca el error "No recipients defined"
