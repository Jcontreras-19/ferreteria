import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  FiEye, FiCheck, FiX, FiDownload, FiFileText, FiSearch, FiFilter, FiCalendar, 
  FiUser, FiMail, FiPhone, FiDollarSign, FiTrendingUp, FiClock, FiCheckCircle,
  FiChevronDown, FiChevronUp, FiGrid, FiList, FiPrinter, FiPackage, FiShoppingCart,
  FiTag, FiExternalLink, FiXCircle, FiAlertCircle, FiInfo
} from 'react-icons/fi'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'

export default function AdminCotizaciones() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState([])
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateFilters, setShowDateFilters] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'cards' or 'table'

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (res.ok) {
        const userData = await res.json()
        const adminRoles = ['admin', 'superadmin', 'editor', 'viewer']
        if (!adminRoles.includes(userData.role)) {
          window.location.href = '/'
          return
        }
        setUser(userData)
      } else {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Auth error:', error)
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  const fetchQuotes = useCallback(async () => {
    try {
      const res = await fetch('/api/cotizaciones', {
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (res.ok) {
        const data = await res.json()
        setQuotes(data)
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
    }
  }, [])

  // Refresco automático periódico para ver cambios casi en tiempo real
  useEffect(() => {
    // Cargar una vez al montar
    fetchQuotes()

    // Actualizar cada 10 segundos
    const interval = setInterval(() => {
      fetchQuotes()
    }, 10000)

    return () => clearInterval(interval)
  }, [fetchQuotes])

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = searchQuery === '' ||
      quote.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.whatsapp?.includes(searchQuery) ||
      (quote.quoteNumber && quote.quoteNumber.toString().includes(searchQuery))
    
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'approved' &&
        (quote.status === 'approved' || quote.status === 'authorized')) ||
      (statusFilter === 'completed' &&
        (quote.status === 'completed' || quote.status === 'dispatched')) ||
      (statusFilter !== 'approved' &&
        statusFilter !== 'completed' &&
        quote.status === statusFilter)
    
    const matchesDate = (!dateFrom && !dateTo) || (
      (!dateFrom || new Date(quote.createdAt) >= new Date(dateFrom)) &&
      (!dateTo || new Date(quote.createdAt) <= new Date(dateTo + 'T23:59:59'))
    )
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    approved: quotes.filter(q => q.status === 'approved' || q.status === 'authorized').length,
    completed: quotes.filter(q => q.status === 'completed' || q.status === 'dispatched').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
    totalAmount: quotes.reduce((sum, q) => sum + (q.total || 0), 0),
    avgAmount: quotes.length > 0 ? quotes.reduce((sum, q) => sum + (q.total || 0), 0) / quotes.length : 0,
  }

  const handleViewQuote = (quote) => {
    try {
      const products = typeof quote.products === 'string' ? JSON.parse(quote.products) : quote.products
      const items = products.items || products
      const notFoundProducts = products.notFoundProducts || []
      setSelectedQuote({ ...quote, products: items, notFoundProducts: notFoundProducts })
      setShowModal(true)
    } catch (error) {
      console.error('Error parsing products:', error)
      setSelectedQuote({ ...quote, products: [], notFoundProducts: [] })
      setShowModal(true)
    }
  }

  const handleViewPdf = async (quote) => {
    try {
      const pdfUrl = `/api/cotizaciones/${quote.id}/pdf`
      setPdfUrl(pdfUrl)
      setShowPdfModal(true)
    } catch (error) {
      console.error('Error loading PDF:', error)
      alert('Error al cargar el PDF: ' + error.message)
    }
  }

  const handleDownloadPdf = async (quote) => {
    try {
      window.open(`/api/cotizaciones/${quote.id}/pdf?download=1`, '_blank')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Error al descargar el PDF')
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completada'
      case 'sent':
        return 'Enviada'
      case 'approved':
        return 'Aprobada'
      case 'authorized':
        return 'Aprobada'
      case 'dispatched':
        return 'Completada'
      case 'rejected':
        return 'Rechazada'
      case 'pending':
        return 'Pendiente'
      default:
        return status || 'Sin estado'
    }
  }

  const exportToExcel = async () => {
    try {
      // Crear una fila por cada producto de cada cotización
      const data = []
      
      filteredQuotes.forEach(quote => {
        let products = []
        let notFoundProducts = []
        try {
          const parsed = typeof quote.products === 'string' ? JSON.parse(quote.products) : quote.products
          products = parsed.items || parsed
          if (!Array.isArray(products)) products = []

          // Productos no encontrados (si existen)
          notFoundProducts = (parsed.notFoundProducts || []).filter(p => p && p.name && p.name.trim() !== '')
          if (!Array.isArray(products)) products = []
        } catch (e) {
          products = []
          notFoundProducts = []
        }

        // Formatear fecha
        const formatDate = (dateString) => {
          const date = new Date(dateString)
          return date.toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        }

        // Si no hay productos, crear una fila con datos de la cotización
        if (products.length === 0 && notFoundProducts.length === 0) {
          data.push({
            'N° Cotización': quote.quoteNumber || 'N/A',
            'Fecha': formatDate(quote.createdAt),
            'Email': quote.email || 'N/A',
            'Total': quote.total || 0,
            'Cantidad': 0,
            'P. Unitario': 0,
            'Estado': getStatusLabel(quote.status),
            'Productos': 'Sin productos',
            'Productos No Encontrados': '',
            'Número de celular o whtsp': quote.whatsapp || quote.phone || 'N/A',
            'Motivo Rechazo': quote.rejectionReason || '',
          })
        } else {
          // Crear una fila por cada producto
          products.forEach(product => {
            const quantity = product.quantity || 1
            const unitPrice = product.price || (product.total ? product.total / quantity : 0)
            
            data.push({
              'N° Cotización': quote.quoteNumber || 'N/A',
              'Fecha': formatDate(quote.createdAt),
              'Email': quote.email || 'N/A',
              'Total': quote.total || 0,
              'Cantidad': quantity,
              'P. Unitario': parseFloat(unitPrice.toFixed(2)),
              'Estado': getStatusLabel(quote.status),
              'Productos': product.name || 'N/A',
              'Productos No Encontrados': '',
              'Número de celular o whtsp': quote.whatsapp || quote.phone || 'N/A',
              'Motivo Rechazo': quote.rejectionReason || '',
            })
          })

          // Agregar filas para productos NO encontrados (si existen)
          notFoundProducts.forEach(product => {
            const quantity = product.quantity || 1

            data.push({
              'N° Cotización': quote.quoteNumber || 'N/A',
              'Fecha': formatDate(quote.createdAt),
              'Email': quote.email || 'N/A',
              'Total': quote.total || 0,
              'Cantidad': quantity,
              'P. Unitario': 0,
              'Estado': getStatusLabel(quote.status),
              'Productos': `${product.name || 'N/A'} (NO ENCONTRADO)`,
              'Productos No Encontrados': product.description || '',
              'Número de celular o whtsp': quote.whatsapp || quote.phone || 'N/A',
              'Motivo Rechazo': quote.rejectionReason || '',
            })
          })
        }
      })

      // Crear nuevo workbook
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Cotizaciones')

      // Colores corporativos GRC (verde)
      const headerFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF16A34A' } // green-600
      }

      const headerFont = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' } // Blanco
      }

      // Bordes negros
      const blackBorder = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }

      // Agregar logo/icono de la empresa
      worksheet.insertRow(1, [''])
      worksheet.mergeCells('A1:K1')
      const logoCell = worksheet.getCell('A1')
      logoCell.value = 'CORPORACIÓN GRC'
      logoCell.font = {
        name: 'Arial',
        size: 18,
        bold: true,
        color: { argb: 'FF16A34A' }
      }
      logoCell.alignment = { vertical: 'middle', horizontal: 'center' }
      logoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0FDF4' }
      }
      logoCell.border = blackBorder
      worksheet.getRow(1).height = 35

      // Información de la empresa
      worksheet.insertRow(2, [''])
      worksheet.mergeCells('A2:K2')
      const companyCell = worksheet.getCell('A2')
      companyCell.value = 'SERVICIOS DE APOYO A LAS EMPRESAS - ISO 9001:2015'
      companyCell.font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: 'FF6B7280' }
      }
      companyCell.alignment = { vertical: 'middle', horizontal: 'center' }
      worksheet.getRow(2).height = 20

      // Fecha de exportación
      worksheet.insertRow(3, [''])
      worksheet.mergeCells('A3:J3')
      const dateCell = worksheet.getCell('A3')
      dateCell.value = `Fecha de exportación: ${new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`
      dateCell.font = {
        name: 'Arial',
        size: 9,
        bold: true,
        color: { argb: 'FF6B7280' }
      }
      dateCell.alignment = { vertical: 'middle', horizontal: 'center' }
      worksheet.getRow(3).height = 18

      // Fila vacía
      worksheet.insertRow(4, [''])
      worksheet.getRow(4).height = 5

      // Encabezados
      const headers = [
        'N° Cotización',
        'Fecha',
        'Email',
        'Total',
        'Cantidad',
        'P. Unitario',
        'Estado',
        'Productos',
        'Productos No Encontrados',
        'Número de celular o whtsp',
        'Motivo Rechazo',
      ]
      const headerRow = worksheet.addRow(headers)
      
      headerRow.eachCell((cell) => {
        cell.fill = headerFill
        cell.font = headerFont
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.border = blackBorder
      })
      headerRow.height = 25

      // Agregar datos
      data.forEach((rowData, index) => {
        const row = worksheet.addRow([
          rowData['N° Cotización'],
          rowData['Fecha'],
          rowData['Email'],
          rowData['Total'],
          rowData['Cantidad'],
          rowData['P. Unitario'],
          rowData['Estado'],
          rowData['Productos'],
          rowData['Productos No Encontrados'],
          rowData['Número de celular o whtsp'],
          rowData['Motivo Rechazo']
        ])

        // Aplicar formato y alineación a cada celda
        row.eachCell((cell, colNumber) => {
          // Aplicar formato numérico PRIMERO si es necesario
          if (colNumber === 4 || colNumber === 6) { // Total, P. Unitario
            cell.numFmt = '"S/ "#,##0.00' // Formato de moneda con símbolo de soles
          } else if (colNumber === 5) { // Cantidad
            cell.numFmt = '0'
          }

          // Aplicar fuente
          cell.font = { name: 'Arial', size: 10 }

          // Aplicar bordes negros
          cell.border = blackBorder

          // Fondo alternado base
          const isEven = index % 2 === 0
          const baseColor = isEven ? 'FFFFFFFF' : 'FFF9FAFB'
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseColor } }

          // Resaltar celda de Estado según el valor
          if (colNumber === 7) {
            const status = rowData['Estado']
            const statusColors = {
              'Pendiente': { bg: 'FFFEF3C7', text: 'FF92400E' },   // amarillo
              'Enviada': { bg: 'FFDBEAFE', text: 'FF1D4ED8' },     // azul
              'Aprobada': { bg: 'FFEDE9FE', text: 'FF5B21B6' },    // violeta
              'Completada': { bg: 'FFDCFCE7', text: 'FF166534' },  // verde
              'Rechazada': { bg: 'FFFEE2E2', text: 'FF991B1B' },   // rojo
            }
            const colors = statusColors[status] || { bg: baseColor, text: 'FF111827' }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } }
            cell.font = {
              name: 'Arial',
              size: 10,
              bold: true,
              color: { argb: colors.text }
            }
          }

          // Aplicar alineación CENTRADA AL FINAL (asegura que se aplique correctamente)
          // Esto es crítico: la alineación debe aplicarse después de todos los demás formatos
          cell.alignment = { 
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true 
          }
        })
        
        // Altura fija de 35 para todas las filas (asegura espacio vertical para centrado)
        row.height = 35
      })

      // Ajustar ancho de columnas
      worksheet.getColumn(1).width = 15 // N° Cotización
      worksheet.getColumn(2).width = 20 // Fecha
      worksheet.getColumn(3).width = 30 // Email
      worksheet.getColumn(4).width = 12 // Total
      worksheet.getColumn(5).width = 10 // Cantidad
      worksheet.getColumn(6).width = 12 // P. Unitario
      worksheet.getColumn(7).width = 15 // Estado
      worksheet.getColumn(8).width = 40 // Productos
      worksheet.getColumn(9).width = 35 // Productos No Encontrados
      worksheet.getColumn(10).width = 25 // Número de celular
      worksheet.getColumn(11).width = 35 // Motivo Rechazo

      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cotizaciones-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al exportar a Excel:', error)
      alert('Error al generar el archivo Excel. Por favor intenta de nuevo.')
    }
  }

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPos = margin

      // ========== ENCABEZADO CORPORATIVO GRC ==========
      // Colores corporativos GRC (verde)
      const GRC_DARK = [22, 163, 74]  // green-600 #16a34a
      const GRC_DARKER = [20, 83, 45]  // green-800 #14532d
      
      // Fondo verde corporativo en dos secciones
      doc.setFillColor(GRC_DARKER[0], GRC_DARKER[1], GRC_DARKER[2])
      doc.rect(0, 0, pageWidth, 12, 'F')
      doc.setFillColor(GRC_DARK[0], GRC_DARK[1], GRC_DARK[2])
      doc.rect(0, 12, pageWidth, 25, 'F')
      
      // Logo GRC (círculo con texto)
      const logoX = margin + 5
      const logoY = 20
      const logoRadius = 8
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(1.5)
      doc.circle(logoX + logoRadius, logoY, logoRadius + 1, 'FD')
      doc.setFillColor(GRC_DARKER[0], GRC_DARKER[1], GRC_DARKER[2])
      doc.circle(logoX + logoRadius, logoY, logoRadius - 0.5, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('GRC', logoX + logoRadius, logoY + 1.5, { align: 'center' })
      
      // Información de la empresa
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('CORPORACIÓN GRC', pageWidth / 2, 20, { align: 'center' })
      doc.setFontSize(14)
      doc.text('Reporte de Cotizaciones', pageWidth / 2, 27, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('SERVICIOS DE APOYO A LAS EMPRESAS - ISO 9001:2015', pageWidth / 2, 33, { align: 'center' })

      doc.setTextColor(0, 0, 0)
      yPos = 45

      // Información del reporte
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, margin, yPos)
      yPos += 6
      doc.text(`Total de cotizaciones: ${filteredQuotes.length}`, margin, yPos)
      yPos += 10

      // Tabla con anchos mejorados (incluyendo Fecha)
      const colWidths = [10, 35, 30, 25, 20, 30]
      const colHeaders = ['N°', 'Cliente', 'Email', 'Fecha', 'Total', 'Estado']
      const colX = [
        margin,
        margin + colWidths[0],
        margin + colWidths[0] + colWidths[1],
        margin + colWidths[0] + colWidths[1] + colWidths[2],
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4],
      ]
      const tableWidth = pageWidth - (margin * 2)
      const rowHeight = 8

      // Encabezado de tabla con color corporativo
      doc.setFillColor(GRC_DARK[0], GRC_DARK[1], GRC_DARK[2])
      doc.rect(margin, yPos - rowHeight, tableWidth, rowHeight, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      
      // Centrar encabezados (horizontal y vertical)
      const headerCenterY = yPos - rowHeight + (rowHeight / 2) + 1.5
      colHeaders.forEach((header, idx) => {
        const cellCenterX = colX[idx] + colWidths[idx] / 2
        doc.text(header, cellCenterX, headerCenterY, { align: 'center' })
      })
      
      // Dibujar líneas verticales del encabezado
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(0.3)
      for (let i = 1; i < colX.length; i++) {
        doc.line(colX[i], yPos - rowHeight, colX[i], yPos)
      }
      
      doc.setTextColor(0, 0, 0)
      yPos = yPos + rowHeight // Ajustar posición inicial para primera fila

      // Filas
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      filteredQuotes.forEach((quote, index) => {
        if (yPos > pageHeight - 30) {
          doc.addPage()
          yPos = margin + rowHeight
          // Redibujar encabezado
          doc.setFillColor(GRC_DARK[0], GRC_DARK[1], GRC_DARK[2])
          doc.rect(margin, yPos - rowHeight, tableWidth, rowHeight, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          const headerCenterY = yPos - rowHeight + (rowHeight / 2) + 1.5
          colHeaders.forEach((header, idx) => {
            const cellCenterX = colX[idx] + colWidths[idx] / 2
            doc.text(header, cellCenterX, headerCenterY, { align: 'center' })
          })
          doc.setDrawColor(255, 255, 255)
          doc.setLineWidth(0.3)
          for (let i = 1; i < colX.length; i++) {
            doc.line(colX[i], yPos - rowHeight, colX[i], yPos)
          }
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          yPos = yPos + rowHeight
        }

        // Calcular posición de la fila de manera consistente
        const rowStartY = yPos - rowHeight
        const rowEndY = yPos

        // Fondo alternado
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, rowStartY, tableWidth, rowHeight, 'F')
        }

        // Dibujar bordes de la fila
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.2)
        // Línea inferior
        doc.line(margin, rowEndY, pageWidth - margin, rowEndY)
        // Líneas verticales
        for (let i = 1; i < colX.length; i++) {
          doc.line(colX[i], rowStartY, colX[i], rowEndY)
        }
        // Líneas laterales
        doc.line(margin, rowStartY, margin, rowEndY)
        doc.line(pageWidth - margin, rowStartY, pageWidth - margin, rowEndY)

        // Calcular posición Y centrada verticalmente
        // En jsPDF, el parámetro Y es la línea base del texto
        // Para centrar verticalmente, necesitamos: centro de la celda + (altura de fuente / 2)
        const cellCenterY = rowStartY + (rowHeight / 2) + 1.5 // +1.5 para ajuste fino
        
        // N° - Centrado horizontal y vertical
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text(String(index + 1), colX[0] + colWidths[0] / 2, cellCenterY, { align: 'center' })
        
        // Cliente - Centrado horizontal y vertical
        const nameText = (quote.name || 'N/A').length > 18 
          ? (quote.name || 'N/A').substring(0, 15) + '...' 
          : (quote.name || 'N/A')
        doc.text(nameText, colX[1] + colWidths[1] / 2, cellCenterY, { align: 'center' })
        
        // Email - Centrado horizontal y vertical
        doc.setFontSize(7.5)
        const emailText = (quote.email || 'N/A').length > 20 
          ? (quote.email || 'N/A').substring(0, 17) + '...' 
          : (quote.email || 'N/A')
        doc.text(emailText, colX[2] + colWidths[2] / 2, cellCenterY, { align: 'center' })
        
        // Fecha - Centrado horizontal y vertical
        doc.setFontSize(7.5)
        const dateText = new Date(quote.createdAt).toLocaleDateString('es-PE', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
        doc.text(dateText, colX[3] + colWidths[3] / 2, cellCenterY, { align: 'center' })
        
        // Total - Centrado horizontal y vertical
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(`S/. ${(quote.total || 0).toFixed(2)}`, colX[4] + colWidths[4] / 2, cellCenterY, { align: 'center' })
        
        // Estado - Centrado horizontal y vertical
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.text(getStatusLabel(quote.status), colX[5] + colWidths[5] / 2, cellCenterY, { align: 'center' })
        
        yPos += rowHeight + 1
      })

      // Pie de página
      const footerY = pageHeight - 20
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text('Corporación GRC - Av. José Gálvez 1322 Dpto. 302 La Perla - Callao', margin, footerY)
      doc.text('Email: corporaciongrc@gmail.com | WhatsApp: (511) 957 216 908', margin, footerY + 5)
      doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageWidth - margin, footerY + 5, { align: 'right' })

      const pdfBlob = doc.output('blob')
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-cotizaciones-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al generar PDF')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-2 border-emerald-400 shadow-sm'
      case 'dispatched':
        return 'bg-emerald-50 text-emerald-700 border-2 border-emerald-400 shadow-sm'
      case 'sent':
        return 'bg-cyan-50 text-cyan-700 border-2 border-cyan-400 shadow-sm'
      case 'approved':
        return 'bg-violet-50 text-violet-700 border-2 border-violet-400 shadow-sm'
      case 'authorized':
        return 'bg-violet-50 text-violet-700 border-2 border-violet-400 shadow-sm'
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-2 border-rose-400 shadow-sm'
      default:
        return 'bg-amber-50 text-amber-700 border-2 border-amber-400 shadow-sm'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle size={14} className="inline mr-1" />
      case 'sent':
        return <FiFileText size={14} className="inline mr-1" />
      case 'approved':
        return <FiCheckCircle size={14} className="inline mr-1" />
      case 'authorized':
        return <FiCheckCircle size={14} className="inline mr-1" />
      case 'rejected':
        return <FiX size={14} className="inline mr-1" />
      default:
        return <FiClock size={14} className="inline mr-1" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Cotizaciones - Panel Administrador</title>
      </Head>
      <AdminLayout user={user}>
        <div className="space-y-4">
          {/* Header Compacto con Estadísticas */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">GESTIÓN DE COTIZACIONES</h1>
                <p className="text-gray-600 text-xs mt-0.5">
                  {quotes.length} cotización{quotes.length !== 1 ? 'es' : ''} en total
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Vista de cards"
                >
                  <FiGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Vista de tabla"
                >
                  <FiList size={16} />
                </button>
              </div>
            </div>

            {/* Estadísticas Compactas con Mejor Contraste */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 border-2 border-yellow-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-yellow-800 text-xs font-semibold">Pendientes</span>
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
                    <FiClock className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-800 text-xs font-semibold">Enviadas</span>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                    <FiCheckCircle className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.sent}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 border-2 border-indigo-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-indigo-800 text-xs font-semibold">Aprobadas</span>
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shadow-md">
                    <FiCheckCircle className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{stats.approved}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-green-800 text-xs font-semibold">Completadas</span>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <FiTrendingUp className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg p-3 border-2 border-rose-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-rose-800 text-xs font-semibold">Rechazadas</span>
                  <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center shadow-md">
                    <FiX className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-rose-900">{stats.rejected}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-2 border-purple-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-purple-800 text-xs font-semibold">Total Ventas</span>
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                    <FiDollarSign className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-lg font-bold text-purple-900">S/. {stats.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Filtros Compactos en una sola fila */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Título de Filtros */}
                <div className="flex items-center gap-2 mr-2">
                  <FiFilter size={16} className="text-gray-600" />
                  <h2 className="text-sm font-bold text-gray-800">Filtros</h2>
                  {(dateFrom || dateTo || statusFilter !== 'all') && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      Filtros activos
                    </span>
                  )}
                </div>

                {/* Búsqueda */}
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar por cliente, email, WhatsApp o número..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    style={{ color: '#111827' }}
                  />
                </div>

                {/* Estado */}
                <div className="min-w-[170px]">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                    style={{ color: '#111827' }}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="pending">Pendientes</option>
                    <option value="sent">Enviadas</option>
                    <option value="approved">Aprobadas</option>
                    <option value="completed">Completadas</option>
                    <option value="rejected">Rechazadas</option>
                  </select>
                </div>

                {/* Botón Fechas */}
                <button
                  onClick={() => setShowDateFilters(!showDateFilters)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiCalendar size={14} />
                  <span>Fechas</span>
                  {showDateFilters ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                </button>

                {/* Botones de Exportar */}
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiDownload size={14} />
                  <span>Excel</span>
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiFileText size={14} />
                  <span>PDF</span>
                </button>
              </div>

              {/* Filtros de Fecha Colapsables */}
              {showDateFilters && (
                <div className="mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                      <div className="relative">
                        <FiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-blue-600" size={14} />
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                          style={{ color: '#111827' }}
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
                      <div className="relative">
                        <FiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-blue-600" size={14} />
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                          style={{ color: '#111827' }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setDateFrom('')
                        setDateTo('')
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors flex items-center justify-center gap-1 h-[38px]"
                    >
                      <FiX size={14} />
                      <span>Limpiar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Contador de resultados */}
              <div className="flex items-center justify-between text-xs text-gray-600 pt-2 mt-2 border-t border-gray-200">
                <span>Mostrando {filteredQuotes.length} de {quotes.length} cotizaciones</span>
              </div>
            </div>
          </div>

          {/* Vista de Cards o Tabla */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredQuotes.length === 0 ? (
                <div className="col-span-full bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <FiFileText className="mx-auto text-gray-400" size={48} />
                  <p className="mt-4 text-gray-600 text-lg">No hay cotizaciones disponibles</p>
                </div>
              ) : (
                filteredQuotes.map((quote) => {
                  let products = []
                  try {
                    const parsed = typeof quote.products === 'string' ? JSON.parse(quote.products) : quote.products
                    products = parsed.items || parsed
                  } catch (e) {
                    products = []
                  }

                  return (
                    <div key={quote.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden group">
                      {/* Header de la Card */}
                      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-4 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8"></div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/30">
                                <FiUser size={18} />
                              </div>
                              <div>
                                <h3 className="font-bold text-sm truncate max-w-[120px]">{quote.name}</h3>
                                <p className="text-xs text-blue-100 font-mono">#{quote.quoteNumber || quote.id.slice(0, 8)}</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-md ${getStatusColor(quote.status)} flex items-center gap-1`}>
                              {getStatusIcon(quote.status)}
                              {getStatusLabel(quote.status)}
                            </span>
                          </div>
                          <div className="text-2xl font-bold mt-2">
                            S/. {quote.total?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>

                      {/* Contenido de la Card */}
                      <div className="p-4 space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FiMail size={14} className="text-gray-400" />
                            <span className="truncate">{quote.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FiPhone size={14} className="text-gray-400" />
                            <span>{quote.whatsapp}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <FiCalendar size={12} className="text-gray-400" />
                            <span>{new Date(quote.createdAt).toLocaleDateString('es-PE', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        </div>

                        <div className="border-t pt-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span className="font-semibold">Productos ({products.length})</span>
                          </div>
                          <div className="text-xs text-gray-500 line-clamp-2">
                            {products.slice(0, 2).map((p, idx) => (
                              <span key={idx}>
                                {p.name} x{p.quantity || 1}
                                {idx < Math.min(products.length, 2) - 1 ? ', ' : ''}
                              </span>
                            ))}
                            {products.length > 2 && <span className="text-gray-400"> +{products.length - 2} más</span>}
                          </div>
                        </div>

                        {/* Botones de Acción Mejorados */}
                        <div className="flex flex-col gap-2 pt-2 border-t">
                          <button
                            onClick={() => handleViewQuote(quote)}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-2.5 rounded-lg text-sm transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                          >
                            <div className="p-1 bg-white/20 rounded">
                              <FiEye size={14} />
                            </div>
                            <span>VER DETALLES</span>
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleViewPdf(quote)}
                              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-2 py-2 rounded-lg text-xs transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                            >
                              <FiFileText size={14} />
                              <span>VER PDF</span>
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(quote)}
                              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-2 py-2 rounded-lg text-xs transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                            >
                              <FiDownload size={14} />
                              <span>DESCARGAR</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            /* Vista de Tabla Mejorada */
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiUser size={14} />
                          Cliente
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiMail size={14} />
                          Contacto
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiDollarSign size={14} />
                          Total
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiCheckCircle size={14} />
                          Estado
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiCalendar size={14} />
                          Fecha
                        </div>
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredQuotes.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <FiFileText className="mx-auto text-gray-400 mb-3" size={48} />
                          <p className="text-gray-600 text-lg">No hay cotizaciones disponibles</p>
                        </td>
                      </tr>
                    ) : (
                      filteredQuotes.map((quote, index) => (
                        <tr 
                          key={quote.id} 
                          className={`transition-colors ${
                            index % 2 === 0 
                              ? 'bg-white hover:bg-blue-50' 
                              : 'bg-gray-50 hover:bg-blue-50'
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-white font-bold text-sm">
                                  {quote.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{quote.name}</div>
                                {quote.quoteNumber && (
                                  <div className="text-xs text-gray-500 font-mono">
                                    #{quote.quoteNumber}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-900">
                                <FiMail size={14} className="text-gray-400" />
                                <span className="truncate max-w-[200px]">{quote.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <FiPhone size={14} className="text-gray-400" />
                                <span>{quote.whatsapp}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-base font-bold text-green-600">
                              S/. {quote.total?.toFixed(2) || '0.00'}
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg ${getStatusColor(quote.status)} shadow-sm`}>
                              {getStatusIcon(quote.status)}
                              {getStatusLabel(quote.status)}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(quote.createdAt).toLocaleDateString('es-PE', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(quote.createdAt).toLocaleTimeString('es-PE', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleViewQuote(quote)}
                                className="group relative flex items-center justify-center w-9 h-9 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 hover:border-blue-400 text-blue-600 hover:text-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110"
                                title="Ver detalles"
                              >
                                <FiEye size={18} />
                              </button>
                              <button
                                onClick={() => handleViewPdf(quote)}
                                className="group relative flex items-center justify-center w-9 h-9 bg-purple-50 hover:bg-purple-100 border-2 border-purple-300 hover:border-purple-400 text-purple-600 hover:text-purple-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110"
                                title="Ver PDF"
                              >
                                <FiFileText size={18} />
                              </button>
                              <button
                                onClick={() => handleDownloadPdf(quote)}
                                className="group relative flex items-center justify-center w-9 h-9 bg-green-50 hover:bg-green-100 border-2 border-green-300 hover:border-green-400 text-green-600 hover:text-green-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110"
                                title="Descargar PDF"
                              >
                                <FiDownload size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Detalles - Compacto Sin Scroll */}
        {showModal && selectedQuote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-lg w-full max-w-6xl shadow-2xl border border-gray-300 flex flex-col animate-slideUp my-4" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
              {/* Header con Gradiente Colorido */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between border-b border-indigo-700 shadow-lg flex-shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center ring-2 ring-white/30 flex-shrink-0">
                    <FiFileText className="text-white" size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">Detalles de Cotización</h3>
                    <p className="text-blue-100 text-xs flex items-center gap-1 truncate">
                      <FiTag size={10} className="flex-shrink-0" />
                      {selectedQuote.quoteNumber 
                        ? `Cotización ${String(selectedQuote.quoteNumber).padStart(7, '0')}`
                        : `#${selectedQuote.id.slice(0, 8).toUpperCase()}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setSelectedQuote(null)
                  }}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ring-2 ring-white/30 flex-shrink-0 ml-2"
                >
                  <FiX className="text-white" size={16} />
                </button>
              </div>

              {/* Contenido Compacto Sin Scroll con Colores */}
              <div className="p-2 sm:p-4 bg-gradient-to-br from-gray-50 to-white overflow-hidden flex-1 min-h-0">
                <div className="grid grid-cols-12 gap-2 sm:gap-3">
                  {/* Columna Izquierda - Info Principal con Colores (Más Estrecha) */}
                  <div className="col-span-12 lg:col-span-3 space-y-2 order-2 lg:order-1">
                    {/* Total con Gradiente Verde - Más Compacto */}
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg border-2 border-green-400 shadow-lg p-2 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -mr-6 -mt-6"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-green-100 font-semibold flex items-center gap-1">
                            <FiDollarSign size={10} />
                            Total
                          </span>
                          <div className="w-6 h-6 bg-white/20 backdrop-blur-sm rounded flex items-center justify-center">
                            <FiDollarSign className="text-white" size={12} />
                          </div>
                        </div>
                        <p className="text-lg font-bold">S/. {selectedQuote.total?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>

                    {/* Estado con Color según Estado - Más Compacto */}
                    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                          <FiTag size={10} />
                          Estado
                        </span>
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                          selectedQuote.status === 'rejected' ? 'bg-red-100' :
                          selectedQuote.status === 'approved' || selectedQuote.status === 'completed' ? 'bg-green-100' :
                          selectedQuote.status === 'pending' ? 'bg-yellow-100' :
                          'bg-blue-100'
                        }`}>
                          {selectedQuote.status === 'rejected' ? (
                            <FiXCircle className="text-red-600" size={12} />
                          ) : selectedQuote.status === 'approved' || selectedQuote.status === 'completed' ? (
                            <FiCheckCircle className="text-green-600" size={12} />
                          ) : (
                            <FiClock className="text-yellow-600" size={12} />
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg shadow-sm ${getStatusColor(selectedQuote.status)}`}>
                        {getStatusIcon(selectedQuote.status)}
                        {getStatusLabel(selectedQuote.status)}
                      </span>
                    </div>

                    {/* Motivo del Rechazo */}
                    {selectedQuote.status === 'rejected' && selectedQuote.rejectionReason && (
                      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border-2 border-red-200 shadow-md p-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <FiXCircle className="text-red-600" size={12} />
                          <span className="text-xs text-red-700 font-semibold">Motivo del Rechazo</span>
                        </div>
                        <div className="p-1.5 bg-red-50 rounded border border-red-100">
                          <p className="text-xs text-gray-900 font-medium leading-relaxed">{selectedQuote.rejectionReason}</p>
                        </div>
                      </div>
                    )}

                    {/* Cliente con Color Azul - Más Compacto */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-md p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-blue-700 font-semibold flex items-center gap-1">
                          <FiUser size={10} />
                          Cliente
                        </span>
                        <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center shadow-sm">
                          <FiUser className="text-white" size={12} />
                        </div>
                      </div>
                      <p className="text-xs font-bold text-gray-900 truncate">{selectedQuote.name}</p>
                    </div>

                    {/* Contacto con Iconos Coloridos - Más Compacto */}
                    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <FiMail className="text-blue-500" size={12} />
                        <span className="text-xs text-gray-600 font-semibold">Contacto</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 p-1.5 bg-blue-50 rounded border border-blue-100">
                          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
                            <FiMail className="text-white" size={10} />
                          </div>
                          <p className="text-xs text-gray-900 truncate font-medium">{selectedQuote.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 p-1.5 bg-green-50 rounded border border-green-100">
                          <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center flex-shrink-0">
                            <FiPhone className="text-white" size={10} />
                          </div>
                          <p className="text-xs text-gray-900 font-medium">{selectedQuote.whatsapp}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha - Tabla de Productos con Colores (Más Ancha) */}
                  <div className="col-span-12 lg:col-span-9 order-1 lg:order-2">
                    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md overflow-hidden">
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-2 sm:px-3 py-2 sm:py-2.5 border-b border-purple-700">
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white/20 backdrop-blur-sm rounded flex items-center justify-center flex-shrink-0">
                            <FiPackage className="text-white" size={10} />
                          </div>
                          <span className="truncate">Productos ({selectedQuote.products?.length || 0})</span>
                        </h4>
                      </div>
                      <div className="max-h-64 overflow-y-auto overflow-x-auto">
                        <table className="w-full text-xs min-w-[500px]">
                          <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 border-b-2 border-gray-300">
                            <tr>
                              <th className="px-2 py-2 text-left font-bold text-gray-700">
                                <div className="flex items-center gap-1">
                                  <FiPackage size={10} />
                                  Producto
                                </div>
                              </th>
                              <th className="px-2 py-2 text-center font-bold text-gray-700">
                                <div className="flex items-center justify-center gap-1">
                                  <FiShoppingCart size={10} />
                                  Cant.
                                </div>
                              </th>
                              <th className="px-2 py-2 text-right font-bold text-gray-700">
                                <div className="flex items-center justify-end gap-1">
                                  <FiDollarSign size={10} />
                                  P. Unit.
                                </div>
                              </th>
                              <th className="px-2 py-2 text-right font-bold text-gray-700">
                                <div className="flex items-center justify-end gap-1">
                                  <FiTrendingUp size={10} />
                                  Subtotal
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedQuote.products?.map((product, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}>
                                <td className="px-2 py-2">
                                  <div className="flex items-start gap-2">
                                    <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <FiPackage className="text-blue-600" size={10} />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-gray-900">{product.name}</div>
                                      {product.description && (
                                        <div className="text-gray-500 text-xs mt-0.5 line-clamp-1">{product.description}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <span className="inline-flex items-center justify-center w-7 h-7 bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs">
                                    {product.quantity}
                                  </span>
                                </td>
                                <td className="px-2 py-2 text-right text-gray-900 font-medium">S/. {product.price?.toFixed(2) || '0.00'}</td>
                                <td className="px-2 py-2 text-right">
                                  <span className="font-bold text-green-600 text-xs">
                                    S/. {((product.price || 0) * (product.quantity || 0)).toFixed(2)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-300">
                            <tr>
                              <td colSpan="3" className="px-2 py-2 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <FiDollarSign className="text-green-600" size={12} />
                                  <span className="font-bold text-gray-700 text-xs">Total:</span>
                                </div>
                              </td>
                              <td className="px-2 py-2 text-right">
                                <span className="font-bold text-green-600 text-sm">
                                  S/. {selectedQuote.total?.toFixed(2) || '0.00'}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Sección de Productos No Encontrados */}
                    {selectedQuote.notFoundProducts && selectedQuote.notFoundProducts.length > 0 && (
                      <div className="bg-white rounded-lg border-2 border-yellow-300 shadow-md overflow-hidden mt-2 sm:mt-3">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-2 sm:px-3 py-2 sm:py-2.5 border-b border-orange-600">
                          <h4 className="text-xs font-bold text-white flex items-center gap-2">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white/20 backdrop-blur-sm rounded flex items-center justify-center flex-shrink-0">
                              <FiAlertCircle className="text-white" size={10} />
                            </div>
                            <span className="truncate">Productos No Encontrados ({selectedQuote.notFoundProducts.length})</span>
                          </h4>
                        </div>
                        <div className="max-h-48 overflow-y-auto overflow-x-auto">
                          <table className="w-full text-xs min-w-[500px]">
                            <thead className="bg-gradient-to-r from-yellow-100 to-orange-100 sticky top-0 border-b-2 border-yellow-300">
                              <tr>
                                <th className="px-2 py-2 text-left font-bold text-gray-700">
                                  <div className="flex items-center gap-1">
                                    <FiPackage size={10} />
                                    Producto
                                  </div>
                                </th>
                                <th className="px-2 py-2 text-left font-bold text-gray-700">
                                  <div className="flex items-center gap-1">
                                    <FiFileText size={10} />
                                    Descripción
                                  </div>
                                </th>
                                <th className="px-2 py-2 text-center font-bold text-gray-700">
                                  <div className="flex items-center justify-center gap-1">
                                    <FiShoppingCart size={10} />
                                    Cant.
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-yellow-200">
                              {selectedQuote.notFoundProducts.map((product, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-yellow-50' : 'bg-yellow-50 hover:bg-yellow-100'}>
                                  <td className="px-2 py-2">
                                    <div className="flex items-start gap-2">
                                      <div className="w-6 h-6 bg-yellow-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <FiAlertCircle className="text-yellow-600" size={10} />
                                      </div>
                                      <div>
                                        <div className="font-semibold text-gray-900">{product.name || 'Sin nombre'}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-2">
                                    <div className="text-gray-600 text-xs">
                                      {product.description || 'Sin descripción'}
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <span className="inline-flex items-center justify-center w-7 h-7 bg-yellow-100 text-yellow-700 font-bold rounded-lg text-xs">
                                      {product.quantity || 1}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="bg-yellow-50 border-t border-yellow-200 px-3 py-2">
                          <p className="text-xs text-yellow-800 italic">
                            <FiInfo className="inline mr-1" size={10} />
                            Los productos no encontrados en nuestro catálogo. Nos contactaremos contigo cuando tengamos la cotización.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer con Botones Coloridos y Diseño Mejorado */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-300 px-2 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 shadow-inner flex-shrink-0">
                <div className="flex items-center gap-2 text-xs text-gray-600 bg-white px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm justify-center sm:justify-start">
                  <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                    <FiClock className="text-blue-600" size={12} />
                  </div>
                  <span className="font-medium text-center sm:text-left">{new Date(selectedQuote.createdAt).toLocaleDateString('es-PE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowModal(false)
                      handleViewPdf(selectedQuote)
                    }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex-1 sm:flex-initial min-w-[100px]"
                  >
                    <FiExternalLink size={12} />
                    <span className="hidden sm:inline">Ver PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(selectedQuote)}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex-1 sm:flex-initial min-w-[100px]"
                  >
                    <FiDownload size={12} />
                    <span className="hidden sm:inline">Descargar</span>
                    <span className="sm:hidden">Desc.</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setSelectedQuote(null)
                    }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow flex-1 sm:flex-initial min-w-[100px]"
                  >
                    <FiX size={12} />
                    <span>Cerrar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de PDF */}
        {showPdfModal && pdfUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-xl font-bold text-gray-900">Vista Previa del PDF</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadPdf(selectedQuote)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold flex items-center gap-2"
                  >
                    <FiDownload size={18} />
                    Descargar
                  </button>
                  <button
                    onClick={() => {
                      setShowPdfModal(false)
                      setPdfUrl(null)
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-gray-100 p-4">
                <embed
                  src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  type="application/pdf"
                  className="w-full h-full min-h-[600px]"
                  title="Vista previa del PDF"
                />
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  )
}
