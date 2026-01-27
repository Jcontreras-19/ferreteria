# 📝 Código Completo para el Nodo Code en N8N

## ✅ Código Completo (Copia y Pega Todo)

```javascript
const item = $input.item;

// N8N puede recibir FormData de diferentes formas
// Intentamos todas las posibilidades

let email, reportType, period, totalQuotes, totalAmount, pdfData;

// Método 1: Datos directos en json
if (item.json && item.json.email) {
  email = item.json.email;
  reportType = item.json.reportType;
  period = item.json.period;
  totalQuotes = item.json.totalQuotes;
  totalAmount = item.json.totalAmount;
  pdfData = item.binary?.pdf?.data;
}
// Método 2: Datos en json.body
else if (item.json && item.json.body) {
  const body = typeof item.json.body === 'string' ? JSON.parse(item.json.body) : item.json.body;
  email = body.email;
  reportType = body.reportType;
  period = body.period;
  totalQuotes = body.totalQuotes;
  totalAmount = body.totalAmount;
  pdfData = item.binary?.pdf?.data;
}
// Método 3: Buscar en todas las claves del objeto
else {
  email = item.json?.email || item.json?.['email'];
  reportType = item.json?.reportType || item.json?.['reportType'];
  period = item.json?.period || item.json?.['period'];
  totalQuotes = item.json?.totalQuotes || item.json?.['totalQuotes'];
  totalAmount = item.json?.totalAmount || item.json?.['totalAmount'];
  pdfData = item.binary?.pdf?.data || item.binary?.data;
}

// Si aún no tenemos el PDF, buscar en binary
if (!pdfData && item.binary) {
  const binaryKeys = Object.keys(item.binary);
  if (binaryKeys.length > 0) {
    pdfData = item.binary[binaryKeys[0]].data;
  }
}

return {
  json: {
    email: email || 'correo-no-encontrado@ejemplo.com',
    reportType: reportType || 'unknown',
    period: period || 'N/A',
    totalQuotes: totalQuotes || '0',
    totalAmount: totalAmount || '0.00'
  },
  binary: pdfData ? {
    pdf: {
      data: pdfData,
      mimeType: 'application/pdf',
      fileName: `reporte-cotizaciones-${reportType || 'unknown'}.pdf`
    }
  } : {}
};
```

## 📋 Instrucciones

1. **Selecciona TODO el código** en el editor de N8N
2. **Bórralo completamente**
3. **Pega el código completo** de arriba
4. **Haz clic en "Execute step"** para probar
5. **Revisa la salida** para ver si los datos se extraen correctamente

## 🔍 Verificar que Funciona

Después de ejecutar el nodo Code, deberías ver en la salida:

```json
{
  "json": {
    "email": "tu-email@ejemplo.com",
    "reportType": "daily",
    "period": "01/01/2024 - 31/01/2024",
    "totalQuotes": "10",
    "totalAmount": "5000.00"
  },
  "binary": {
    "pdf": {
      "data": "[datos binarios del PDF]",
      "mimeType": "application/pdf",
      "fileName": "reporte-cotizaciones-daily.pdf"
    }
  }
}
```

## ⚠️ Si Aún Muestra "undefined"

Si después de pegar el código completo aún muestra `undefined`, necesitamos ver qué datos está recibiendo realmente el Webhook:

1. **Agrega un nodo "Set"** después del Webhook (antes del Code)
2. **Agrega estos campos**:
   - `allJson`: `{{ $json }}`
   - `binaryKeys`: `{{ Object.keys($binary) }}`
3. **Ejecuta el nodo Set** para ver qué datos llegan
4. **Comparte esa información** para ajustar el código
