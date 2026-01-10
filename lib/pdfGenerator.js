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
  doc.text('FERRETERÍA', pageWidth - margin, 28, { align: 'right' })
  
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
  doc.rect(0, 0, pageWidth, 45, 'F')
  
  // Logo GRC más grande y destacado con mejor visibilidad
  drawGRCLogo(doc, margin, 8, 32, 32)
  
  // Información de la empresa a la derecha del logo
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('FERRETERÍA', margin + 38, 18)
  
  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.text('Cotización', margin + 38, 26)
  
  doc.setFontSize(9)
  doc.text('ISO 9001:2015', margin + 38, 33)
  
  // Número de cotización y fecha en la parte superior derecha
  const quoteNumber = quote.quoteNumber 
    ? String(quote.quoteNumber).padStart(7, '0')
    : quote.id.slice(0, 8)
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`N°: ${quoteNumber}`, pageWidth - margin, 15, { align: 'right' })
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Fecha: ${new Date(quote.createdAt).toLocaleDateString('es-PE', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, pageWidth - margin, 22, { align: 'right' })
  
  yPos = 55

  // ========== DATOS DEL CLIENTE CON DISEÑO MEJORADO ==========
  // Fondo gris claro para sección de cliente
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 25, 'F')
  
  // Borde verde
  doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setLineWidth(0.5)
  doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 25, 'S')
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
  doc.text('DATOS DEL CLIENTE', margin + 3, yPos)
  yPos += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRC_COLORS.text[0], GRC_COLORS.text[1], GRC_COLORS.text[2])
  
  doc.text(`Nombre: ${quote.name}`, margin + 3, yPos)
  yPos += 5
  
  doc.text(`Email: ${quote.email}`, margin + 3, yPos)
  yPos += 5
  
  doc.text(`WhatsApp: ${quote.whatsapp}`, margin + 3, yPos)
  yPos += 5

  // Si es factura, mostrar datos fiscales
  if (documentType === 'factura' && fiscalData) {
    doc.text(`RUC: ${fiscalData.ruc}`, margin + 3, yPos)
    yPos += 5
    doc.text(`Razón Social: ${fiscalData.businessName}`, margin + 3, yPos)
    yPos += 5
    doc.text(`Dirección: ${fiscalData.address}`, margin + 3, yPos)
    yPos += 5
  }

  yPos += 10

  // ========== TABLA DE PRODUCTOS CON DISEÑO PROFESIONAL ==========
  const tableStartY = yPos
  const tableHeaderHeight = 12
  const colWidths = [105, 22, 20, 33]
  const colX = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2]
  ]
  
  // Encabezado de tabla con gradiente verde
  doc.setFillColor(GRC_COLORS.primary[0], GRC_COLORS.primary[1], GRC_COLORS.primary[2])
  doc.rect(margin, tableStartY - tableHeaderHeight, pageWidth - (margin * 2), tableHeaderHeight, 'F')
  
  // Borde del encabezado
  doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setLineWidth(0.5)
  doc.rect(margin, tableStartY - tableHeaderHeight, pageWidth - (margin * 2), tableHeaderHeight, 'S')

  // Texto del encabezado en blanco
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  
  doc.text('Descripción', colX[0] + 3, tableStartY - 4)
  doc.text('Cantidad', colX[1] + 1, tableStartY - 4, { align: 'center' })
  doc.text('UND', colX[2] + 1, tableStartY - 4, { align: 'center' })
  doc.text('Total', colX[3] + 1, tableStartY - 4, { align: 'right' })

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
      doc.rect(margin, yPos - 12, pageWidth - (margin * 2), 12, 'F')
      doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
      doc.rect(margin, yPos - 12, pageWidth - (margin * 2), 12, 'S')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Descripción', colX[0] + 3, yPos - 4)
      doc.text('Cantidad', colX[1] + 1, yPos - 4, { align: 'center' })
      doc.text('UND', colX[2] + 1, yPos - 4, { align: 'center' })
      doc.text('Total', colX[3] + 1, yPos - 4, { align: 'right' })
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
    const nameLines = doc.splitTextToSize(productName, colWidths[0] - 6)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const descLines = productDesc ? doc.splitTextToSize(productDesc, colWidths[0] - 6) : []
    
    // Calcular altura real de la fila
    const nameHeight = nameLines.length * 4
    const descHeight = descLines.length > 0 ? descLines.length * 3.5 + 2 : 0
    const actualRowHeight = Math.max(nameHeight + descHeight + 6, 10)
    
    // Posición inicial de la fila
    const rowStartY = yPos - actualRowHeight
    
    // Dibujar fondo alternado sutil para filas (solo si es necesario)
    if (rowIndex % 2 === 1) {
      doc.setFillColor(250, 250, 250)
      doc.rect(margin, rowStartY, pageWidth - (margin * 2), actualRowHeight, 'F')
    }
    
    // Línea separadora superior de la fila (solo línea, sin borde completo)
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.line(margin, rowStartY, pageWidth - margin, rowStartY)
    
    // Posición del texto dentro del cuadro
    const textStartY = rowStartY + 5
    
    // Nombre del producto en negrita - alineado desde arriba
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(nameLines, colX[0] + 3, textStartY)
    
    // Descripción del producto (si existe) - justo debajo del nombre
    if (productDesc && descLines.length > 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      const descY = textStartY + nameHeight + 1
      doc.text(descLines, colX[0] + 3, descY)
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
    }
    
    // Calcular posición vertical centrada para las columnas derechas
    const centerY = rowStartY + actualRowHeight / 2 + 2
    
    // Cantidad centrada verticalmente
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(String(quantity), colX[1] + colWidths[1] / 2, centerY, { align: 'center' })
    
    // UND (Unidad) centrada verticalmente
    doc.text('UND', colX[2] + colWidths[2] / 2, centerY, { align: 'center' })
    
    // Total alineado a la derecha y centrado verticalmente
    doc.setFont('helvetica', 'bold')
    doc.text(`S/. ${total.toFixed(2)}`, colX[3] + colWidths[3] - 2, centerY, { align: 'right' })
    
    yPos += actualRowHeight
    rowIndex++
  })

  // Línea final de la tabla
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.2)
  doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
  yPos += 10

  // ========== RESUMEN CON DISEÑO MEJORADO ==========
  const summaryX = pageWidth - margin - 45
  const discount = 0 // Por ahora sin descuento
  const summaryStartY = yPos - 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRC_COLORS.text[0], GRC_COLORS.text[1], GRC_COLORS.text[2])
  doc.text('SUBTOTAL:', summaryX, yPos, { align: 'right' })
  doc.text(`S/. ${subtotal.toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' })
  yPos += 6

  doc.text('DESCUENTO:', summaryX, yPos, { align: 'right' })
  doc.text(`S/. ${discount.toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' })
  yPos += 6

  // Línea separadora antes del total
  doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setLineWidth(0.5)
  doc.line(summaryX - 15, yPos + 1, pageWidth - margin - 3, yPos + 1)
  yPos += 5

  // Total destacado con fondo verde
  const totalY = yPos
  const totalHeight = 8
  
  // Fondo verde para el TOTAL
  doc.setFillColor(GRC_COLORS.primary[0], GRC_COLORS.primary[1], GRC_COLORS.primary[2])
  doc.rect(summaryX - 15, totalY - 3, 60, totalHeight, 'F')
  
  // Borde verde más oscuro
  doc.setDrawColor(GRC_COLORS.dark[0], GRC_COLORS.dark[1], GRC_COLORS.dark[2])
  doc.setLineWidth(0.5)
  doc.rect(summaryX - 15, totalY - 3, 60, totalHeight, 'S')
  
  // Texto del total en blanco
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL:', summaryX, totalY + 1, { align: 'right' })
  doc.text(`S/. ${(subtotal - discount).toFixed(2)}`, pageWidth - margin - 3, totalY + 1, { align: 'right' })
  
  yPos = totalY + totalHeight + 2
  
  yPos += 15

  // ========== PRODUCTOS NO ENCONTRADOS ==========
  if (notFoundProducts && notFoundProducts.length > 0) {
    const validNotFound = notFoundProducts.filter(p => p.name && p.name.trim() !== '')
    if (validNotFound.length > 0) {
      if (yPos > pageHeight - 80) {
        doc.addPage()
        yPos = margin + 20
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(GRC_COLORS.darker[0], GRC_COLORS.darker[1], GRC_COLORS.darker[2])
      doc.text('# PRODUCTOS NO ENCONTRADOS', margin, yPos)
      yPos += 8

      // Encabezado de tabla
      doc.setFillColor(GRC_COLORS.primary[0], GRC_COLORS.primary[1], GRC_COLORS.primary[2])
      doc.rect(margin, yPos - 8, pageWidth - (margin * 2), 8, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('Producto', margin + 2, yPos - 3)
      doc.text('Descripción del producto', margin + 50, yPos - 3)
      doc.text('Cantidad', pageWidth - margin - 20, yPos - 3, { align: 'right' })

      doc.setTextColor(0, 0, 0)
      yPos += 3

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      validNotFound.forEach((product) => {
        if (yPos > pageHeight - 50) {
          doc.addPage()
          yPos = margin + 20
        }

        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.2)
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)

        const nameLines = doc.splitTextToSize(product.name || 'Sin nombre', 40)
        doc.text(nameLines, margin + 2, yPos)
        
        const descLines = doc.splitTextToSize(product.description || '', 50)
        doc.text(descLines, margin + 50, yPos)
        
        doc.text(String(product.quantity || 1), pageWidth - margin - 2, yPos, { align: 'right' })
        
        yPos += Math.max(nameLines.length * 4, descLines.length * 4, 6)
      })

      yPos += 5
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(GRC_COLORS.textLight[0], GRC_COLORS.textLight[1], GRC_COLORS.textLight[2])
      doc.text('Los productos no encontrados en nuestro catálogo. Nos contactaremos contigo cuando tengamos la cotización.', margin, yPos, { maxWidth: pageWidth - (margin * 2) })
      yPos += 10
    }
  }

  // ========== NOTA Y TÉRMINOS ==========
  if (yPos > pageHeight - 60) {
    doc.addPage()
    yPos = margin + 20
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRC_COLORS.text[0], GRC_COLORS.text[1], GRC_COLORS.text[2])
  
  const noteText = 'Nota: La cotización es válida por 7 días. La fecha de ejecución se coordinará según disponibilidad.'
  const noteLines = doc.splitTextToSize(noteText, pageWidth - (margin * 2))
  doc.text(noteLines, margin, yPos)
  yPos += noteLines.length * 5 + 10

  // ========== INFORMACIÓN DE CONTACTO ==========
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

  // Retornar como Buffer para uso en Node.js
  return Buffer.from(doc.output('arraybuffer'))
}











