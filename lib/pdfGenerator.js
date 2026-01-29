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

  // ========== NOTA Y TÉRMINOS EN CUADRO AMARILLO (SIEMPRE DESPUÉS DEL TOTAL) ==========
  // Colocamos la nota inmediatamente debajo del resumen para que quede en la primera hoja
  const noteTextLines = [
    'Nota: La cotización es válida por 7 días. La fecha de ejecución se coordinará según disponibilidad.',
    'Esta cotización no incluye IGV.'
  ]
  const noteBoxWidth = pageWidth * 0.65 // cuadro más angosto y centrado
  const noteStartX = (pageWidth - noteBoxWidth) / 2
  const noteLines = doc.splitTextToSize(noteTextLines.join(' '), noteBoxWidth - 10)
  const noteHeight = noteLines.length * 4.5 + 6

  // Verificar si hay espacio suficiente para la nota; si no, saltar a nueva página
  if (yPos + noteHeight > pageHeight - 40) {
    doc.addPage()
    yPos = margin + 20
  }

  // Fondo amarillo para la nota
  doc.setFillColor(255, 243, 205) // Amarillo claro
  doc.rect(noteStartX, yPos - 2, noteBoxWidth, noteHeight, 'F')

  // Borde amarillo más oscuro
  doc.setDrawColor(255, 193, 7) // Amarillo más oscuro
  doc.setLineWidth(0.5)
  doc.rect(noteStartX, yPos - 2, noteBoxWidth, noteHeight, 'S')

  // Texto de la nota - CENTRADO
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(133, 77, 14) // Texto marrón/amarillo oscuro para buen contraste
  const noteCenterY = yPos - 2 + noteHeight / 2 + 2
  doc.text(noteLines, pageWidth / 2, noteCenterY, { align: 'center' })
  yPos += noteHeight + 10

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
      // Dibujar el encabezado inmediatamente DEBAJO del título
      doc.rect(margin, yPos, notFoundTableWidth, notFoundHeaderHeight, 'F')
      
      // Bordes del encabezado
      doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
      doc.setLineWidth(0.5)
      doc.rect(margin, yPos, notFoundTableWidth, notFoundHeaderHeight, 'S')
      
      // Líneas verticales
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(0.3)
      for (let i = 1; i < notFoundColX.length; i++) {
        doc.line(notFoundColX[i], yPos, notFoundColX[i], yPos + notFoundHeaderHeight)
      }

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const notFoundHeaderY = yPos + (notFoundHeaderHeight / 2) + 2
      doc.text('Producto', notFoundColX[0] + notFoundColWidths[0] / 2, notFoundHeaderY, { align: 'center' })
      doc.text('Descripción del producto', notFoundColX[1] + notFoundColWidths[1] / 2, notFoundHeaderY, { align: 'center' })
      doc.text('Cantidad', notFoundColX[2] + notFoundColWidths[2] / 2, notFoundHeaderY, { align: 'center' })

      doc.setTextColor(0, 0, 0)
      yPos += notFoundHeaderHeight + 2

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

      yPos += 6

      // Mensaje en recuadro centrado (similar a la nota de la hoja 1)
      const nfMessage =
        'Estos productos no los tenemos en stock, pero buscaremos adquirirlos y nos contactaremos contigo.'
      const nfBoxWidth = pageWidth * 0.7
      const nfStartX = (pageWidth - nfBoxWidth) / 2
      const nfLines = doc.splitTextToSize(nfMessage, nfBoxWidth - 10)
      const nfHeight = nfLines.length * 4.5 + 6

      // Fondo suave
      doc.setFillColor(245, 249, 255)
      doc.rect(nfStartX, yPos - 2, nfBoxWidth, nfHeight, 'F')

      // Borde azul suave
      doc.setDrawColor(148, 163, 184)
      doc.setLineWidth(0.4)
      doc.rect(nfStartX, yPos - 2, nfBoxWidth, nfHeight, 'S')

      // Texto centrado
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(GRC_COLORS.textLight[0], GRC_COLORS.textLight[1], GRC_COLORS.textLight[2])
      const nfCenterY = yPos - 2 + nfHeight / 2 + 1.5
      doc.text(nfLines, pageWidth / 2, nfCenterY, { align: 'center' })

      yPos += nfHeight + 8
    }
  }

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
  
  // Título del reporte - posición calculada primero
  const titleY = 58
  
  // Altura del header verde ajustada para terminar justo después del título (unos 6px más abajo)
  const headerHeight = titleY + 6 - 8 // El verde termina 6px después del título (ajustado desde y=8)
  doc.setFillColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.rect(0, 8, pageWidth, headerHeight, 'F')
  
  // Logo GRC a la izquierda
  drawGRCLogo(doc, margin, 18, 28, 28)

  // Información de la empresa en el centro-izquierda (después del logo)
  const logoEndX = margin + 30
  const companyStartX = logoEndX + 12
  
  doc.setTextColor(255, 255, 255)
  
  // Nombre de la empresa - primera línea
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('CORPORACIÓN GRC', companyStartX, 25)
  
  // Subtítulo de la empresa - segunda línea
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('SERVICIOS GENERALES', companyStartX, 31)
  
  // Información adicional - tercera línea
  doc.setFontSize(7)
  doc.text('SERVICIOS DE APOYO A LAS EMPRESAS', companyStartX, 37)
  
  // ISO y Dirección - cuarta y quinta línea
  doc.text('ISO 9001:2015', companyStartX, 42)
  doc.setFontSize(6)
  doc.text('Av. José Gálvez 1322 Dpto. 302 La Perla - Callao', companyStartX, 47)

  // Título del reporte en una línea propia, centrado
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('REPORTE DE COTIZACIONES', pageWidth / 2, titleY, { align: 'center' })

  // Información del reporte a la derecha (bien separada, en su propia columna)
  const rightMargin = pageWidth - margin
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const periodLabels = {
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual'
  }
  doc.text(`Período: ${periodLabels[periodType] || periodType}`, rightMargin, 25, { align: 'right' })
  
  const dateRange = `${startDate.toLocaleDateString('es-PE')} - ${endDate.toLocaleDateString('es-PE')}`
  doc.text(`Rango: ${dateRange}`, rightMargin, 31, { align: 'right' })
  
  doc.setFontSize(7)
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-PE', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, rightMargin, 37, { align: 'right' })

  // Iniciar contenido justo después del header verde (con poco espacio)
  yPos = 8 + headerHeight + 6 // Solo 6px de espacio después del verde

  // ========== RESUMEN ESTADÍSTICO MEJORADO Y ORDENADO ==========
  doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen Estadístico', margin, yPos)
  yPos += 12

  const totalQuotes = quotes.length
  const totalAmount = quotes.reduce((sum, q) => sum + (q.total || 0), 0)
  
  // Contar estados
  const approvedCount = quotes.filter(q => q.status === 'approved' || q.status === 'authorized').length
  const pendingCount = quotes.filter(q => q.status === 'pending').length

  // Diseño compacto: 4 tarjetas en 1 fila horizontal - más bajo y presentable
  const totalSpacing = 8 // Espacio entre tarjetas reducido
  const totalCardWidth = pageWidth - (margin * 2) - (totalSpacing * 3) // Ancho total disponible menos espacios
  const cardWidth = totalCardWidth / 4 // Ancho de cada tarjeta
  const cardHeight = 16 // Altura más compacta y presentable

  // Colores corporativos variados pero armoniosos (tonos verdes y un amarillo suave)
  const cardColors = [
    [34, 197, 94],    // green-500 - Total Cotizaciones
    [22, 163, 74],    // green-600 - Monto Total  
    [16, 185, 129],   // emerald-500 - Aprobadas
    [251, 191, 36]    // yellow-400 - Pendientes
  ]

  const cardLabels = ['Total Cotizaciones', 'Monto Total', 'Aprobadas', 'Pendientes']
  const cardValues = [
    totalQuotes.toString(),
    `S/. ${totalAmount.toFixed(2)}`,
    approvedCount.toString(),
    pendingCount.toString()
  ]

  // Dibujar las 4 tarjetas en una fila horizontal
  cardLabels.forEach((label, index) => {
    const cardX = margin + (index * (cardWidth + totalSpacing))
    const color = cardColors[index]
    
    // Dibujar tarjeta con color
    doc.setFillColor(color[0], color[1], color[2])
    doc.setDrawColor(color[0] * 0.85, color[1] * 0.85, color[2] * 0.85)
    doc.setLineWidth(0.3)
    doc.roundedRect(cardX, yPos - 5, cardWidth, cardHeight, 2, 2, 'FD')
    
    // Texto del label - más compacto
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(label, cardX + 2, yPos - 1, { maxWidth: cardWidth - 4 })
    
    // Valor destacado - más compacto
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    const valueText = cardValues[index]
    doc.text(valueText, cardX + 2, yPos + 8, { maxWidth: cardWidth - 4 })
  })

  yPos += cardHeight + 10

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
  const tableWidth = pageWidth - (margin * 2)
  const tableHeaderHeight = 10
  const rowHeight = 7
  
  // Definir anchos de columnas (proporcionales, suman aproximadamente tableWidth)
  const colWidths = [
    22,  // N°
    58,  // Cliente
    28,  // Estado
    32,  // Monto
    30   // Fecha
  ]
  
  // Calcular posiciones X de cada columna (centradas)
  const colPositions = []
  let currentX = margin
  colWidths.forEach((width) => {
    colPositions.push(currentX + width / 2)
    currentX += width
  })
  
  doc.setFillColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setDrawColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, yPos - 6, tableWidth, tableHeaderHeight, 2, 2, 'FD')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const headerCenterY = yPos - 6 + tableHeaderHeight / 2 + 2 // Centrado verticalmente
  doc.text('N°', colPositions[0], headerCenterY, { align: 'center' })
  doc.text('Cliente', colPositions[1], headerCenterY, { align: 'center' })
  doc.text('Estado', colPositions[2], headerCenterY, { align: 'center' })
  doc.text('Monto', colPositions[3], headerCenterY, { align: 'center' })
  doc.text('Fecha', colPositions[4], headerCenterY, { align: 'center' })
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

    const rowY = yPos - 5
    const rowCenterY = rowY + rowHeight / 2 + 2 // Centro vertical de la fila

    // Alternar color de fondo con bordes sutiles
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251) // gray-50
      doc.setDrawColor(229, 231, 235) // gray-200
      doc.setLineWidth(0.2)
      doc.roundedRect(margin, rowY, tableWidth, rowHeight, 1, 1, 'FD')
    } else {
      doc.setDrawColor(229, 231, 235)
      doc.setLineWidth(0.2)
      doc.roundedRect(margin, rowY, tableWidth, rowHeight, 1, 1, 'D')
    }

    const quoteNumber = quote.quoteNumber ? `#${String(quote.quoteNumber).padStart(7, '0')}` : '-'
    const clientName = quote.name.length > 25 ? quote.name.substring(0, 22) + '...' : quote.name
    
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

    // Dibujar datos centrados horizontal y verticalmente
    doc.setTextColor(GRC_COLORS.text[0], GRC_COLORS.text[1], GRC_COLORS.text[2])
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    
    // N° - centrado
    doc.text(quoteNumber, colPositions[0], rowCenterY, { align: 'center' })
    
    // Cliente - centrado
    doc.text(clientName, colPositions[1], rowCenterY, { align: 'center', maxWidth: colWidths[1] - 4 })
    
    // Estado con color de fondo resaltado - centrado
    const statusColor = statusColors[status] || [200, 200, 200]
    const statusColX = colPositions[2]
    const statusColWidth = colWidths[2]
    const statusWidth = Math.min(28, statusColWidth - 4)
    const statusX = statusColX - statusWidth / 2
    const statusY = rowY + 1
    const statusHeight = rowHeight - 2
    
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
    doc.setDrawColor(statusColor[0] * 0.8, statusColor[1] * 0.8, statusColor[2] * 0.8)
    doc.setLineWidth(0.2)
    doc.roundedRect(statusX, statusY, statusWidth, statusHeight, 1, 1, 'FD')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(statusText, statusColX, statusY + statusHeight / 2 + 1.5, { align: 'center' })
    
    // Monto - centrado
    doc.setTextColor(GRC_COLORS.text[0], GRC_COLORS.text[1], GRC_COLORS.text[2])
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(amount, colPositions[3], rowCenterY, { align: 'center' })
    
    // Fecha - centrado
    doc.setFont('helvetica', 'normal')
    doc.text(date, colPositions[4], rowCenterY, { align: 'center' })

    yPos += rowHeight + 1
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
















