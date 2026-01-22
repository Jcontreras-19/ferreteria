# 🔧 Configurar N8N para Parsear JSON Automáticamente

## Problema

Cuando se envía el PDF usando `multipart/form-data`, el campo `body` llega como un **string JSON** a N8N, no como un objeto parseado. Por eso `{{ $json.body.cliente.email }}` devuelve `undefined`.

## Solución: Agregar Nodo Function para Parsear JSON

Para que `{{ $json.body.cliente.email }}` funcione como antes, necesitas agregar un nodo **Function** (o **Code**) después del nodo Webhook que parsee el JSON automáticamente.

### Paso 1: Agregar Nodo Function

1. En tu workflow de N8N, después del nodo **Webhook**, agrega un nodo **Function** (o **Code**)
2. Configura el nodo con este código:

```javascript
// Parsear el campo 'body' que viene como string JSON
const items = $input.all();

return items.map(item => {
  // Parsear el campo body si existe y es un string
  if (item.json.body && typeof item.json.body === 'string') {
    try {
      const parsedBody = JSON.parse(item.json.body);
      // Agregar el body parseado al objeto json
      item.json.body = parsedBody;
    } catch (e) {
      console.error('Error parsing body:', e);
    }
  }
  
  // También parsear el campo 'data' si existe
  if (item.json.data && typeof item.json.data === 'string') {
    try {
      const parsedData = JSON.parse(item.json.data);
      // Agregar el data parseado
      item.json.data = parsedData;
    } catch (e) {
      console.error('Error parsing data:', e);
    }
  }
  
  return item;
});
```

### Paso 2: Verificar que Funciona

Después del nodo Function, ahora puedes usar:
- `{{ $json.body.cliente.email }}` ✅
- `{{ $json.body.carrito }}` ✅
- `{{ $json.body.total }}` ✅
- `{{ $json.email }}` ✅ (también funciona, campo directo)

### Estructura del Workflow

```
Webhook → Function (Parse JSON) → CORREO CLIENTE → ...
```

## Alternativa: Usar Campo Directo (Más Simple)

Si no quieres agregar el nodo Function, puedes cambiar la expresión en el nodo de email a:

```
{{ $json.email }}
```

Este campo está disponible directamente sin necesidad de parsear nada.

## Verificación

Después de agregar el nodo Function:
1. Ejecuta el workflow
2. Verifica que el campo "To Email" muestre el email correcto (no `undefined`)
3. El email debería enviarse exitosamente
