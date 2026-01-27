import { jsPDF } from 'jspdf'

// Colores de Corporación GRC (verde)
const GRC_COLORS = {
  primary: [34, 197, 94],      // green-500 #22c55e
  dark: [22, 163, 74],         // green-600 #16a34a
  darker: [20, 83, 45],        // green-800 #14532d
  light: [74, 222, 128],       // green-400 #4ade80
  text: [0, 0, 0],             // Negro
  textLight: [107, 114, 128],  // gray-500
}

// Función auxiliar para dibujar logo GRC mejorado
function drawGRCLogo(doc, x, y, width, height) {
  // Fondo circular verde más oscuro para contraste
  const centerX = x + width / 2
  const centerY = y + height / 2
  const radius = Math.min(width, height) / 2
  
  // Círculo exterior con borde blanco grueso
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(2)
  doc.circle(centerX, centerY, radius + 1, 'FD')
  
  // Círculo interior verde
  doc.setFillColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.setDrawColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.setLineWidth(1)
  doc.circle(centerX, centerY, radius - 1, 'F')
  
  // Texto "GRC" en blanco, más grande y bold
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('GRC', centerX, centerY + 3, { align: 'center' })
  doc.setTextColor(0, 0, 0)
}

// Función para generar boleta o factura con diseño mejorado
export function generateDocumentPDF(quote) {
  // Parsear productos
  const productsData = typeof quote.products === 'string' 
    ? JSON.parse(quote.products) 
    : quote.products
  
  const products = productsData.items || productsData
  const documentType = quote.documentType || 'boleta'
  const fiscalData = productsData.fiscalData || null

  // Crear PDF
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPos = margin

  // ========== ENCABEZADO CON LOGO GRC ==========
  // Fondo verde para el encabezado
  doc.setFillColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.rect(0, 0, pageWidth, 50, 'F')

  // Logo GRC a la izquierda (más grande)
  drawGRCLogo(doc, margin, 10, 30, 30)
  
  // Información de la empresa a la derecha
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('CORPORACIÓN GRC', pageWidth - margin, 20, { align: 'right' })
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('SERVICIOS GENERALES', pageWidth - margin, 28, { align: 'right' })
  
  doc.setFontSize(10)
  doc.text('ISO 9001:2015', pageWidth - margin, 35, { align: 'right' })
  
  doc.setFontSize(8)
  doc.text('Av. José Gálvez 1322 Dpto. 302 La Perla - Callao', pageWidth - margin, 42, { align: 'right' })
  
  yPos = 60

  // ========== TÍTULO DEL DOCUMENTO ==========
  doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  const docTitle = documentType === 'factura' ? 'FACTURA' : 'BOLETA DE VENTA'
  doc.text(docTitle, pageWidth / 2, yPos, { align: 'center' })
  
  yPos += 10

  // Número de documento y fecha
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(GRC_COLORS.text[0], GRC_COLORS.text[1], GRC_COLORS.text[2])
  
  if (quote.documentNumber) {
    doc.setFont('helvetica', 'bold')
    doc.text(`N° ${quote.documentNumber}`, margin, yPos)
  }
  
  doc.setFont('helvetica', 'normal')
  const docDate = quote.authorizedAt || quote.createdAt
  doc.text(`Fecha: ${new Date(docDate).toLocaleDateString('es-PE', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, pageWidth - margin, yPos, { align: 'right' })
  
  yPos += 15

  // ========== DATOS DEL CLIENTE ==========
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.text('DATOS DEL CLIENTE', margin, yPos)
  yPos += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(GRC_COLORS.text[0], GRC_COLORS.text[1], GRC_COLORS.text[2])
  
  doc.text(`Nombre: ${quote.name}`, margin, yPos)
  yPos += 6
  
  doc.text(`Email: ${quote.email}`, margin, yPos)
  yPos += 6
  
  doc.text(`WhatsApp: ${quote.whatsapp}`, margin, yPos)
  yPos += 6

  // Si es factura, mostrar datos fiscales
  if (documentType === 'factura' && fiscalData) {
    doc.text(`RUC: ${fiscalData.ruc}`, margin, yPos)
    yPos += 6
    doc.text(`Razón Social: ${fiscalData.businessName}`, margin, yPos)
    yPos += 6
    doc.text(`Dirección Fiscal: ${fiscalData.address}`, margin, yPos)
    yPos += 6
  }

  yPos += 8

  // ========== TABLA DE PRODUCTOS ==========
  const tableStartY = yPos
  const tableHeaderHeight = 10
  const colWidths = [100, 25, 25, 30]
  const colX = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2]
  ]
  
  // Fondo verde para encabezado
  doc.setFillColor(GRC_COLORS.primary[0], GRC_COLORS.primary[1], GRC_COLORS.primary[2])
  doc.rect(margin, tableStartY - tableHeaderHeight, pageWidth - (margin * 2), tableHeaderHeight, 'F')

  // Texto del encabezado en blanco
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  
  doc.text('Descripción', colX[0] + 2, tableStartY - 3)
  doc.text('Cantidad', colX[1] + 2, tableStartY - 3, { align: 'center' })
  doc.text('UND', colX[2] + 2, tableStartY - 3, { align: 'center' })
  doc.text('Total', colX[3] + 2, tableStartY - 3, { align: 'right' })

  doc.setTextColor(0, 0, 0)
  yPos = tableStartY + 3

  // Filas de productos
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  let subtotal = 0

  products.forEach((product) => {
    if (yPos > pageHeight - 100) {
      doc.addPage()
      yPos = margin + 20
    }

    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)

    const productName = product.name || 'Sin nombre'
    const productDesc = product.description || ''
    const quantity = product.quantity || 1
    const price = product.price || 0
    const total = price * quantity
    subtotal += total

    const nameLines = doc.splitTextToSize(productName, colWidths[0] - 4)
    doc.text(nameLines, colX[0] + 2, yPos)
    
    if (productDesc) {
      const descLines = doc.splitTextToSize(productDesc, colWidths[0] - 4)
      doc.text(descLines, colX[0] + 2, yPos + 4)
    }
    
    doc.text(String(quantity), colX[1] + 2, yPos, { align: 'center' })
    doc.text('UND', colX[2] + 2, yPos, { align: 'center' })
    doc.text(`S/. ${total.toFixed(2)}`, colX[3] + 2, yPos, { align: 'right' })
    
    const lineHeight = Math.max((nameLines.length * 4) + (productDesc ? 4 : 0), 8)
    yPos += lineHeight
  })

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
  yPos += 5

  // ========== SUBTOTAL, IGV, TOTAL ==========
  const summaryX = pageWidth - margin - 50
  const igv = subtotal * 0.18
  const total = subtotal + igv

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('SUBTOTAL:', summaryX, yPos, { align: 'right' })
  doc.text(`S/. ${subtotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
  yPos += 6

  doc.text('IGV (18%):', summaryX, yPos, { align: 'right' })
  doc.text(`S/. ${igv.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
  yPos += 6

  doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setLineWidth(0.5)
  doc.line(summaryX - 10, yPos + 2, pageWidth - margin, yPos + 2)
  yPos += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.text('TOTAL:', summaryX, yPos, { align: 'right' })
  doc.text(`S/. ${total.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
  
  yPos += 15

  // ========== INFORMACIÓN DE CONTACTO Y PIE DE PÁGINA ==========
  if (yPos > pageHeight - 80) {
    doc.addPage()
    yPos = margin + 20
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRC_COLORS.textLight[0], GRC_COLORS.textLight[1], GRC_COLORS.textLight[2])
  
  doc.text('Tel: (511) 957 216 908', margin, yPos)
  yPos += 5
  doc.text('Correo: corporaciongrc@gmail.com', margin, yPos)
  yPos += 5
  doc.text('www.ferreteria-nu.vercel.app', margin, yPos)
  yPos += 5
  doc.text('Av. José Gálvez 1322 Dpto. 302 La Perla - Callao', margin, yPos)
  yPos += 5
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.text('Corporación GRC - ISO 9001:2015', margin, yPos)

  return Buffer.from(doc.output('arraybuffer'))
}

export function generateQuotePDF(quote) {
  // Parsear productos (compatible con formato antiguo y nuevo con metadata)
  const productsData = typeof quote.products === 'string' 
    ? JSON.parse(quote.products) 
    : quote.products
  
  // Si tiene formato nuevo con metadata, usar items, sino usar directamente
  const products = productsData.items || productsData
  const documentType = productsData.documentType || 'boleta'
  const fiscalData = productsData.fiscalData || null
  const notFoundProducts = productsData.notFoundProducts || null

  // Crear PDF
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPos = margin

  // ========== ENCABEZADO MEJORADO CON LOGO Y DISEÑO CORPORATIVO ==========
  // Fondo verde para el encabezado
  doc.setFillColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.rect(0, 0, pageWidth, 50, 'F')
  
  // Logo GRC más grande y destacado con mejor visibilidad
  drawGRCLogo(doc, margin, 8, 32, 32)
  
  // Número de cotización y fecha en la parte superior derecha (PRIMERO para no interferir)
  const quoteNumber = quote.quoteNumber 
    ? String(quote.quoteNumber).padStart(7, '0')
    : quote.id.slice(0, 8)
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(`N°: ${quoteNumber}`, pageWidth - margin, 15, { align: 'right' })
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Fecha: ${new Date(quote.createdAt).toLocaleDateString('es-PE', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, pageWidth - margin, 22, { align: 'right' })
  
  // Información de la empresa a la derecha del logo (con título más pequeño)
  const titleStartX = margin + 38
  const titleY = 16
  const maxTitleWidth = pageWidth - margin - 60 // Dejar espacio para N° y Fecha
  
  doc.setFontSize(14) // Reducido de 18 a 14
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  const titleLines = doc.splitTextToSize('SERVICIOS DE APOYO A LAS EMPRESAS', maxTitleWidth)
  doc.text(titleLines, titleStartX, titleY)
  
  // Sin líneas decorativas - texto directo
  const titleEndY = titleY + (titleLines.length * 5)
  
  doc.setFontSize(13) // Reducido de 16 a 13
  doc.setFont('helvetica', 'normal')
  doc.text('Cotización', titleStartX, titleEndY + 5)
  
  doc.setFontSize(8) // Reducido de 9 a 8
  doc.text('ISO 9001:2015', titleStartX, titleEndY + 14)
  
  yPos = 58

  // ========== DATOS DEL CLIENTE CON DISEÑO FORMAL Y CENTRADO ==========
  // Calcular altura dinámica según contenido
  let clientSectionHeight = 30
  if (documentType === 'factura' && fiscalData) {
    clientSectionHeight = 45
  }
  
  // Fondo gris claro para sección de cliente
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, yPos - 5, pageWidth - (margin * 2), clientSectionHeight, 'F')
  
  // Borde verde corporativo
  doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setLineWidth(0.5)
  doc.rect(margin, yPos - 5, pageWidth - (margin * 2), clientSectionHeight, 'S')
  
  // Título centrado
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.text('DATOS DEL CLIENTE', pageWidth / 2, yPos, { align: 'center' })
  yPos += 8

  // Información del cliente - CENTRADA
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRC_COLORS.text[0], GRC_COLORS.text[1], GRC_COLORS.text[2])
  
  doc.text(`Nombre: ${quote.name}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 5
  
  doc.text(`Email: ${quote.email}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 5
  
  doc.text(`WhatsApp: ${quote.whatsapp}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 5

  // Si es factura, mostrar datos fiscales - CENTRADOS
  if (documentType === 'factura' && fiscalData) {
    doc.text(`RUC: ${fiscalData.ruc}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
    doc.text(`Razón Social: ${fiscalData.businessName}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
    doc.text(`Dirección: ${fiscalData.address}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
  }

  yPos += 10

  // ========== TABLA DE PRODUCTOS CON DISEÑO PROFESIONAL Y CENTRADO ==========
  const tableStartY = yPos
  const tableHeaderHeight = 12
  // Anchos de columna optimizados para mejor presentación
  const colWidths = [80, 25, 20, 49] // Ajustado para mejor distribución
  const colX = [
    margin,  // Descripción
    margin + colWidths[0],  // Cantidad
    margin + colWidths[0] + colWidths[1],  // UND
    margin + colWidths[0] + colWidths[1] + colWidths[2]  // Precio
  ]
  const tableWidth = pageWidth - (margin * 2)
  
  // Encabezado de tabla con fondo verde corporativo
  doc.setFillColor(GRC_COLORS.primary[0], GRC_COLORS.primary[1], GRC_COLORS.primary[2])
  doc.rect(margin, tableStartY - tableHeaderHeight, tableWidth, tableHeaderHeight, 'F')
  
  // Borde del encabezado
  doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setLineWidth(0.5)
  doc.rect(margin, tableStartY - tableHeaderHeight, tableWidth, tableHeaderHeight, 'S')

  // Líneas verticales en el encabezado para mejor separación
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.3)
  for (let i = 1; i < colX.length; i++) {
    doc.line(colX[i], tableStartY - tableHeaderHeight, colX[i], tableStartY)
  }
  // Líneas laterales
  doc.line(margin, tableStartY - tableHeaderHeight, margin, tableStartY)
  doc.line(pageWidth - margin, tableStartY - tableHeaderHeight, pageWidth - margin, tableStartY)

  // Texto del encabezado en blanco - TODOS CENTRADOS
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  
  const headerCenterY = tableStartY - tableHeaderHeight + (tableHeaderHeight / 2) + 3
  doc.text('Descripción', colX[0] + colWidths[0] / 2, headerCenterY, { align: 'center' })
  doc.text('Cantidad', colX[1] + colWidths[1] / 2, headerCenterY, { align: 'center' })
  doc.text('UND', colX[2] + colWidths[2] / 2, headerCenterY, { align: 'center' })
  doc.text('Precio', colX[3] + colWidths[3] / 2, headerCenterY, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  yPos = tableStartY + 2

  // Filas de productos con diseño alternado
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  let subtotal = 0
  let rowIndex = 0

  products.forEach((product) => {
    if (yPos > pageHeight - 100) {
      doc.addPage()
      yPos = margin + 20
      // Redibujar encabezado de tabla en nueva página
      doc.setFillColor(GRC_COLORS.primary[0], GRC_COLORS.primary[1], GRC_COLORS.primary[2])
      doc.rect(margin, yPos - tableHeaderHeight, tableWidth, tableHeaderHeight, 'F')
      doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
      doc.rect(margin, yPos - tableHeaderHeight, tableWidth, tableHeaderHeight, 'S')
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(0.3)
      for (let i = 1; i < colX.length; i++) {
        doc.line(colX[i], yPos - tableHeaderHeight, colX[i], yPos)
      }
      doc.line(margin, yPos - tableHeaderHeight, margin, yPos)
      doc.line(pageWidth - margin, yPos - tableHeaderHeight, pageWidth - margin, yPos)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      const headerCenterY = yPos - tableHeaderHeight + (tableHeaderHeight / 2) + 3
      doc.text('Descripción', colX[0] + colWidths[0] / 2, headerCenterY, { align: 'center' })
      doc.text('Cantidad', colX[1] + colWidths[1] / 2, headerCenterY, { align: 'center' })
      doc.text('UND', colX[2] + colWidths[2] / 2, headerCenterY, { align: 'center' })
      doc.text('Precio', colX[3] + colWidths[3] / 2, headerCenterY, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos += 2
    }

    const productName = product.name || 'Sin nombre'
    const productDesc = product.description || ''
    const quantity = product.quantity || 1
    const price = product.price || 0
    const total = price * quantity
    subtotal += total

    // Calcular altura de la fila basada en el contenido PRIMERO
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    // Limitar ancho de descripción para que no se desborde
    const descMaxWidth = colWidths[0] - 8
    const nameLines = doc.splitTextToSize(productName, descMaxWidth)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const descLines = productDesc ? doc.splitTextToSize(productDesc, descMaxWidth) : []
    
    // Calcular altura real de la fila - más compacta para optimizar espacio
    const nameHeight = nameLines.length * 4
    const descHeight = descLines.length > 0 ? descLines.length * 3.2 + 1 : 0
    const actualRowHeight = Math.max(nameHeight + descHeight + 6, 10)
    
    // Posición inicial de la fila
    const rowStartY = yPos
    
    // Dibujar fondo alternado sutil para filas
    if (rowIndex % 2 === 1) {
      doc.setFillColor(250, 250, 250)
      doc.rect(margin, rowStartY, pageWidth - (margin * 2), actualRowHeight, 'F')
    }
    
    // Líneas verticales entre columnas para mejor alineación visual
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.2)
    doc.line(colX[1] - 1, rowStartY, colX[1] - 1, rowStartY + actualRowHeight)
    doc.line(colX[2] - 1, rowStartY, colX[2] - 1, rowStartY + actualRowHeight)
    doc.line(colX[3] - 1, rowStartY, colX[3] - 1, rowStartY + actualRowHeight)
    
    // Línea separadora superior de la fila
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.line(margin, rowStartY, pageWidth - margin, rowStartY)
    
    // Posición del texto dentro del cuadro - mejor padding
    const textStartY = rowStartY + 4
    
    // Nombre del producto en negrita - alineado desde arriba
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(nameLines, colX[0] + 2, textStartY)
    
    // Descripción del producto (si existe) - justo debajo del nombre con mejor espaciado
    if (productDesc && descLines.length > 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 100, 100)
      const descY = textStartY + nameHeight + 1
      doc.text(descLines, colX[0] + 2, descY)
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
    }
    
    // Calcular posición vertical centrada para las columnas derechas
    const centerY = rowStartY + actualRowHeight / 2 + 2
    
    // Cantidad centrada verticalmente y horizontalmente
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(String(quantity), colX[1] + colWidths[1] / 2, centerY, { align: 'center' })
    
    // UND (Unidad) centrada verticalmente y horizontalmente
    doc.setFontSize(8)
    doc.text('UND', colX[2] + colWidths[2] / 2, centerY, { align: 'center' })
    
    // Precio alineado a la izquierda y centrado verticalmente
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(`S/. ${total.toFixed(2)}`, colX[3] + 2, centerY) // Alineado a la izquierda
    
    // Línea separadora inferior
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.line(margin, rowStartY + actualRowHeight, pageWidth - margin, rowStartY + actualRowHeight)
    
    yPos += actualRowHeight
    rowIndex++
  })

  // Línea final de la tabla
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
  yPos += 4

  // ========== RESUMEN CON DISEÑO FORMAL Y CENTRADO ==========
  const summaryWidth = 85 // Aumentado para que quepa el total completo
  const summaryStartX = pageWidth - margin - summaryWidth
  const discount = 0 // Por ahora sin descuento
  const summaryBoxHeight = 42

  // Fondo para el resumen
  doc.setFillColor(250, 250, 250)
  doc.rect(summaryStartX, yPos - 5, summaryWidth, summaryBoxHeight, 'F')
  
  // Borde verde corporativo
  doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setLineWidth(0.5)
  doc.rect(summaryStartX, yPos - 5, summaryWidth, summaryBoxHeight, 'S')

  const summaryY = yPos
  const summaryCenterX = summaryStartX + summaryWidth / 2
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRC_COLORS.text[0], GRC_COLORS.text[1], GRC_COLORS.text[2])
  
  // SUBTOTAL - Centrado
  doc.text('SUBTOTAL:', summaryCenterX, summaryY, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.text(`S/. ${subtotal.toFixed(2)}`, summaryCenterX, summaryY + 6, { align: 'center' })
  
  doc.setFont('helvetica', 'normal')
  doc.text('DESCUENTO:', summaryCenterX, summaryY + 14, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.text(`S/. ${discount.toFixed(2)}`, summaryCenterX, summaryY + 20, { align: 'center' })

  // Línea separadora antes del total
  doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setLineWidth(0.5)
  doc.line(summaryStartX + 5, summaryY + 27, summaryStartX + summaryWidth - 5, summaryY + 27)

  // Total destacado con fondo verde - PERFECTAMENTE CENTRADO VERTICALMENTE
  const totalY = summaryY + 29
  const totalHeight = 13
  const totalStartX = summaryStartX + 2
  const totalWidth = summaryWidth - 4 // Más ancho para que quepa el texto completo
  const totalCenterX = totalStartX + totalWidth / 2
  
  // Fondo verde para el TOTAL
  doc.setFillColor(GRC_COLORS.primary[0], GRC_COLORS.primary[1], GRC_COLORS.primary[2])
  doc.rect(totalStartX, totalY, totalWidth, totalHeight, 'F')
  
  // Borde verde más oscuro
  doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setLineWidth(0.5)
  doc.rect(totalStartX, totalY, totalWidth, totalHeight, 'S')
  
  // Texto del total en blanco - PERFECTAMENTE CENTRADO VERTICALMENTE
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  const totalAmount = (subtotal - discount).toFixed(2)
  
  // Calcular el centro vertical del cuadro verde
  const totalBoxCenterY = totalY + totalHeight / 2
  
  // "TOTAL:" centrado horizontalmente, posicionado en la parte superior del centro
  doc.text('TOTAL:', totalCenterX, totalBoxCenterY - 2.5, { align: 'center' })
  
  // Monto centrado horizontalmente, posicionado en la parte inferior del centro
  doc.setFontSize(13)
  const totalAmountText = `S/. ${totalAmount}`
  doc.text(totalAmountText, totalCenterX, totalBoxCenterY + 3.5, { align: 'center' })
  
  yPos = summaryY + summaryBoxHeight + 5
  
  yPos += 8

  // ========== PRODUCTOS NO ENCONTRADOS ==========
  if (notFoundProducts && notFoundProducts.length > 0) {
    const validNotFound = notFoundProducts.filter(p => p.name && p.name.trim() !== '')
    if (validNotFound.length > 0) {
      // Optimizar: si hay pocos productos, intentar que quepa en la misma página
      const estimatedNotFoundHeight = 20 + (validNotFound.length * 8) + 15
      if (yPos + estimatedNotFoundHeight > pageHeight - 60) {
        doc.addPage()
        yPos = margin + 20
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
      doc.text('# PRODUCTOS NO ENCONTRADOS', margin, yPos)
      yPos += 6

      // Encabezado de tabla - CENTRADO
      const notFoundColWidths = [50, 70, 24]
      const notFoundColX = [
        margin,
        margin + notFoundColWidths[0],
        margin + notFoundColWidths[0] + notFoundColWidths[1]
      ]
      const notFoundTableWidth = pageWidth - (margin * 2)
      const notFoundHeaderHeight = 8
      
      doc.setFillColor(GRC_COLORS.primary[0], GRC_COLORS.primary[1], GRC_COLORS.primary[2])
      doc.rect(margin, yPos - notFoundHeaderHeight, notFoundTableWidth, notFoundHeaderHeight, 'F')
      
      // Bordes del encabezado
      doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
      doc.setLineWidth(0.5)
      doc.rect(margin, yPos - notFoundHeaderHeight, notFoundTableWidth, notFoundHeaderHeight, 'S')
      
      // Líneas verticales
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(0.3)
      for (let i = 1; i < notFoundColX.length; i++) {
        doc.line(notFoundColX[i], yPos - notFoundHeaderHeight, notFoundColX[i], yPos)
      }

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const notFoundHeaderY = yPos - notFoundHeaderHeight + (notFoundHeaderHeight / 2) + 2
      doc.text('Producto', notFoundColX[0] + notFoundColWidths[0] / 2, notFoundHeaderY, { align: 'center' })
      doc.text('Descripción del producto', notFoundColX[1] + notFoundColWidths[1] / 2, notFoundHeaderY, { align: 'center' })
      doc.text('Cantidad', notFoundColX[2] + notFoundColWidths[2] / 2, notFoundHeaderY, { align: 'center' })

      doc.setTextColor(0, 0, 0)
      yPos += 3

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      validNotFound.forEach((product, idx) => {
        if (yPos > pageHeight - 50) {
          doc.addPage()
          yPos = margin + 20
        }

        const nameLines = doc.splitTextToSize(product.name || 'Sin nombre', notFoundColWidths[0] - 4)
        const descLines = doc.splitTextToSize(product.description || '', notFoundColWidths[1] - 4)
        const rowHeight = Math.max(nameLines.length * 4.5, descLines.length * 4.5, 8)
        
        const rowStartY = yPos
        const rowEndY = rowStartY + rowHeight
        
        // Fondo alternado
        if (idx % 2 === 1) {
          doc.setFillColor(250, 250, 250)
          doc.rect(margin, rowStartY, notFoundTableWidth, rowHeight, 'F')
        }
        
        // Bordes negros
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.2)
        for (let i = 1; i < notFoundColX.length; i++) {
          doc.line(notFoundColX[i], rowStartY, notFoundColX[i], rowEndY)
        }
        doc.line(margin, rowStartY, margin, rowEndY)
        doc.line(pageWidth - margin, rowStartY, pageWidth - margin, rowEndY)
        doc.line(margin, rowStartY, pageWidth - margin, rowStartY)
        doc.line(margin, rowEndY, pageWidth - margin, rowEndY)
        
        // Texto CENTRADO
        const cellCenterY = rowStartY + (rowHeight / 2) + 2
        const nameStartY = cellCenterY - (nameLines.length * 2.25)
        
        doc.text(nameLines, notFoundColX[0] + notFoundColWidths[0] / 2, nameStartY, { align: 'center' })
        doc.text(descLines, notFoundColX[1] + notFoundColWidths[1] / 2, cellCenterY, { align: 'center' })
        doc.text(String(product.quantity || 1), notFoundColX[2] + notFoundColWidths[2] / 2, cellCenterY, { align: 'center' })
        
        yPos += rowHeight
      })

      yPos += 4
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(GRC_COLORS.textLight[0], GRC_COLORS.textLight[1], GRC_COLORS.textLight[2])
      doc.text('Los productos no encontrados en nuestro catálogo. Nos contactaremos contigo cuando tengamos la cotización.', margin, yPos, { maxWidth: pageWidth - (margin * 2) })
      yPos += 8
    }
  }

  // ========== NOTA Y TÉRMINOS EN CUADRO AMARILLO ==========
  // Optimizar espaciado para que quepa en una página
  const noteText = 'Nota: La cotización es válida por 7 días. La fecha de ejecución se coordinará según disponibilidad.'
  const noteLines = doc.splitTextToSize(noteText, pageWidth - (margin * 2) - 10)
  const noteHeight = noteLines.length * 4.5 + 6
  
  // Verificar si hay espacio suficiente, si no, nueva página
  const contactInfoHeight = 30
  if (yPos + noteHeight + contactInfoHeight > pageHeight - 20) {
    doc.addPage()
    yPos = margin + 20
  }
  
  // Fondo amarillo para la nota
  doc.setFillColor(255, 243, 205) // Amarillo claro
  doc.rect(margin, yPos - 2, pageWidth - (margin * 2), noteHeight, 'F')
  
  // Borde amarillo más oscuro
  doc.setDrawColor(255, 193, 7) // Amarillo más oscuro
  doc.setLineWidth(0.5)
  doc.rect(margin, yPos - 2, pageWidth - (margin * 2), noteHeight, 'S')
  
  // Texto de la nota - CENTRADO
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(133, 77, 14) // Texto marrón/amarillo oscuro para buen contraste
  const noteCenterY = yPos - 2 + noteHeight / 2 + 2
  doc.text(noteLines, pageWidth / 2, noteCenterY, { align: 'center' })
  yPos += noteHeight + 6

  // ========== INFORMACIÓN DE CONTACTO - CENTRADA Y COMPACTA ==========
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(GRC_COLORS.textLight[0], GRC_COLORS.textLight[1], GRC_COLORS.textLight[2])
  
  // Agrupar información de contacto de forma más compacta
  const contactInfo = [
    'Tel: (511) 957 216 908',
    'Correo: corporaciongrc@gmail.com',
    'www.ferreteria-nu.vercel.app',
    'Av. José Gálvez 1322 Dpto. 302 La Perla - Callao'
  ]
  
  contactInfo.forEach((info, index) => {
    doc.text(info, pageWidth / 2, yPos, { align: 'center' })
    yPos += 4
  })
  
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.text('Corporación GRC - ISO 9001:2015', pageWidth / 2, yPos, { align: 'center' })

  // Retornar como Buffer para uso en Node.js
  return Buffer.from(doc.output('arraybuffer'))
}

// Función para generar PDF de resumen de cotizaciones (diario, semanal o mensual)
export function generateQuotesSummaryPDF(quotes, periodType, startDate, endDate) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPos = margin

  // ========== ENCABEZADO MEJORADO CON DISEÑO CORPORATIVO ==========
  // Fondo verde corporativo en dos secciones para más profundidad visual
  doc.setFillColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.rect(0, 0, pageWidth, 8, 'F')
  doc.setFillColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.rect(0, 8, pageWidth, 55, 'F')

  // Logo GRC más grande y destacado
  drawGRCLogo(doc, margin, 12, 35, 35)

  // Información de la empresa a la derecha del logo (más espacio)
  const infoStartX = margin + 42
  const infoMaxWidth = pageWidth - margin - 50 // Dejar más espacio para evitar choque
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('CORPORACIÓN GRC', infoStartX, 20, { maxWidth: infoMaxWidth })
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('SERVICIOS GENERALES', infoStartX, 26, { maxWidth: infoMaxWidth })
  
  doc.setFontSize(8)
  doc.text('SERVICIOS DE APOYO A LAS EMPRESAS', infoStartX, 31, { maxWidth: infoMaxWidth })
  doc.text('ISO 9001:2015', infoStartX, 36, { maxWidth: infoMaxWidth })
  
  doc.setFontSize(7)
  doc.text('Av. José Gálvez 1322 Dpto. 302 La Perla - Callao', infoStartX, 41, { maxWidth: infoMaxWidth })

  // Información del reporte en una columna separada a la derecha
  const reportStartX = pageWidth - margin - 60
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('REPORTE DE COTIZACIONES', pageWidth - margin, 20, { align: 'right' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const periodLabels = {
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual'
  }
  doc.text(`Período: ${periodLabels[periodType] || periodType}`, pageWidth - margin, 28, { align: 'right' })
  
  const dateRange = `${startDate.toLocaleDateString('es-PE')} - ${endDate.toLocaleDateString('es-PE')}`
  doc.text(`Rango: ${dateRange}`, pageWidth - margin, 33, { align: 'right' })
  
  doc.setFontSize(7)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PE', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, pageWidth - margin, 38, { align: 'right' })

  yPos = 75

  // ========== RESUMEN ESTADÍSTICO MEJORADO Y ORDENADO ==========
  doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen Estadístico', margin, yPos)
  yPos += 12

  const totalQuotes = quotes.length
  const totalAmount = quotes.reduce((sum, q) => sum + (q.total || 0), 0)
  const avgAmount = totalQuotes > 0 ? totalAmount / totalQuotes : 0

  // Diseño mejorado: 3 tarjetas en una fila ordenada
  const cardWidth = (pageWidth - (margin * 2) - 20) / 3 // 20px de espacio entre tarjetas
  const cardHeight = 25
  const cardSpacing = 10

  // Tarjeta 1: Total de Cotizaciones (izquierda)
  doc.setFillColor(GRC_COLORS.primary[0], GRC_COLORS.primary[1], GRC_COLORS.primary[2])
  doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, yPos - 8, cardWidth, cardHeight, 3, 3, 'FD')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Total Cotizaciones', margin + 4, yPos - 2)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(totalQuotes.toString(), margin + 4, yPos + 8)

  // Tarjeta 2: Monto Total (centro)
  doc.setFillColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.roundedRect(margin + cardWidth + cardSpacing, yPos - 8, cardWidth, cardHeight, 3, 3, 'FD')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Monto Total', margin + cardWidth + cardSpacing + 4, yPos - 2)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  const totalAmountText = `S/. ${totalAmount.toFixed(2)}`
  doc.text(totalAmountText, margin + cardWidth + cardSpacing + 4, yPos + 8)

  // Tarjeta 3: Promedio (derecha)
  doc.setFillColor(GRC_COLORS.light[0], GRC_COLORS.light[1], GRC_COLORS.light[2])
  doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.roundedRect(margin + (cardWidth + cardSpacing) * 2, yPos - 8, cardWidth, cardHeight, 3, 3, 'FD')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Promedio', margin + (cardWidth + cardSpacing) * 2 + 4, yPos - 2)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`S/. ${avgAmount.toFixed(2)}`, margin + (cardWidth + cardSpacing) * 2 + 4, yPos + 8)

  yPos += cardHeight + 8

  // ========== TABLA DE COTIZACIONES MEJORADA ==========
  if (yPos > pageHeight - 100) {
    doc.addPage()
    yPos = margin
  }

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.text('Detalle de Cotizaciones', margin, yPos)
  yPos += 12

  // Encabezado de tabla con diseño mejorado
  doc.setFillColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setDrawColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, yPos - 6, pageWidth - (margin * 2), 10, 2, 2, 'FD')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('N°', margin + 3, yPos)
  doc.text('Cliente', margin + 18, yPos)
  doc.text('Estado', margin + 75, yPos)
  doc.text('Monto', margin + 100, yPos)
  doc.text('Fecha', margin + 125, yPos)
  yPos += 12

  // Filas de cotizaciones con diseño mejorado y estados resaltados
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  const statusLabels = {
    pending: 'Pendiente',
    sent: 'Enviada',
    approved: 'Aprobada',
    completed: 'Completada',
    rejected: 'Rechazada'
  }

  const statusColors = {
    pending: [251, 191, 36],    // yellow-400
    sent: [59, 130, 246],       // blue-500
    approved: [34, 197, 94],     // green-500
    completed: [16, 185, 129],   // emerald-500
    rejected: [239, 68, 68]      // red-500
  }

  quotes.forEach((quote, index) => {
    if (yPos > pageHeight - 30) {
      doc.addPage()
      yPos = margin
    }

    // Alternar color de fondo con bordes sutiles
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251) // gray-50
      doc.setDrawColor(229, 231, 235) // gray-200
      doc.setLineWidth(0.2)
      doc.roundedRect(margin, yPos - 5, pageWidth - (margin * 2), 7, 1, 1, 'FD')
    } else {
      doc.setDrawColor(229, 231, 235)
      doc.setLineWidth(0.2)
      doc.roundedRect(margin, yPos - 5, pageWidth - (margin * 2), 7, 1, 1, 'D')
    }

    const quoteNumber = quote.quoteNumber ? `#${String(quote.quoteNumber).padStart(7, '0')}` : '-'
    const clientName = quote.name.length > 30 ? quote.name.substring(0, 27) + '...' : quote.name
    
    // Mapear estado según lógica unificada
    let status = quote.status
    if (status === 'authorized') status = 'approved'
    if (status === 'dispatched') status = 'completed'
    const statusText = statusLabels[status] || status
    
    const amount = `S/. ${(quote.total || 0).toFixed(2)}`
    const date = new Date(quote.createdAt).toLocaleDateString('es-PE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })

    // Dibujar datos normales
    doc.setTextColor(GRC_COLORS.text[0], GRC_COLORS.text[1], GRC_COLORS.text[2])
    doc.text(quoteNumber, margin + 3, yPos)
    doc.text(clientName, margin + 18, yPos)
    
    // Dibujar estado con color de fondo resaltado
    const statusColor = statusColors[status] || [200, 200, 200]
    const statusX = margin + 75
    const statusY = yPos - 4
    const statusWidth = 20
    const statusHeight = 5
    
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
    doc.setDrawColor(statusColor[0] * 0.8, statusColor[1] * 0.8, statusColor[2] * 0.8)
    doc.setLineWidth(0.2)
    doc.roundedRect(statusX, statusY, statusWidth, statusHeight, 1, 1, 'FD')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(statusText, statusX + statusWidth / 2, statusY + 3.5, { align: 'center' })
    
    // Continuar con el resto de datos
    doc.setTextColor(GRC_COLORS.text[0], GRC_COLORS.text[1], GRC_COLORS.text[2])
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(amount, margin + 100, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(date, margin + 125, yPos)

    yPos += 8
  })

  // ========== PIE DE PÁGINA MEJORADO ==========
  const totalPages = doc.internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    
    // Línea decorativa en el pie
    doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
    doc.setLineWidth(0.5)
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)
    
    doc.setFontSize(8)
    doc.setTextColor(GRC_COLORS.textLight[0], GRC_COLORS.textLight[1], GRC_COLORS.textLight[2])
    doc.setFont('helvetica', 'normal')
    doc.text(
      `CORPORACIÓN GRC - SERVICIOS GENERALES | Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
    doc.setFontSize(7)
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-PE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    )
  }

  return Buffer.from(doc.output('arraybuffer'))
}
















