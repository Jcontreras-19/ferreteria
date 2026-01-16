import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  FiUser, FiMail, FiCalendar, FiFileText, FiSearch, FiChevronDown, FiChevronUp, 
  FiPhone, FiEdit2, FiSave, FiX, FiTrendingUp, FiUsers, FiDownload,
  FiGrid, FiList, FiEye, FiFilter, FiLock, FiTrash2
} from 'react-icons/fi'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'

export default function AdminClientes() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCustomer, setExpandedCustomer] = useState(null)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [editFormData, setEditFormData] = useState({ email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'cards' or 'table'
  const [sortBy, setSortBy] = useState('name') // 'name', 'totalSpent', 'totalQuotes', 'date'
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showActionsModal, setShowActionsModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    checkAuth()
    fetchCustomers()
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

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/clientes')
      if (res.ok) {
        const data = await res.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount)
  }

  // Sistema de notificaciones
  const showNotification = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    const notification = { id, message, type }
    
    setNotifications(prev => [...prev, notification])
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completada'
      case 'sent':
        return 'Enviada'
      case 'pending':
        return 'Pendiente'
      default:
        return status
    }
  }

  const handleEdit = (customer) => {
    setEditingCustomer(customer.id)
    setEditFormData({
      email: customer.email || '',
      phone: customer.phone || '',
    })
  }

  const handleCancelEdit = () => {
    setEditingCustomer(null)
    setEditFormData({ email: '', phone: '' })
    setShowActionsModal(false)
  }

  const handleSaveEdit = async (customerId) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clientes/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      })

      if (res.ok) {
        await fetchCustomers()
        setEditingCustomer(null)
        setEditFormData({ email: '', phone: '' })
        setShowActionsModal(false)
        showNotification('Datos del cliente actualizados exitosamente', 'success')
      } else {
        const data = await res.json()
        showNotification(data.error || 'Error al actualizar cliente', 'error')
      }
    } catch (error) {
      console.error('Error updating customer:', error)
      showNotification('Error al actualizar cliente', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenActionsModal = (customer) => {
    setSelectedCustomer(customer)
    setShowActionsModal(true)
  }

  const handleCloseActionsModal = () => {
    setShowActionsModal(false)
    setSelectedCustomer(null)
  }

  const handleChangePassword = (customer) => {
    setShowActionsModal(false)
    setSelectedCustomer(customer)
    setShowPasswordModal(true)
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleDelete = (customer) => {
    setShowActionsModal(false)
    setSelectedCustomer(customer)
    setShowDeleteModal(true)
  }

  const handleEditFromModal = (customer) => {
    setShowActionsModal(false)
    setEditingCustomer(customer.id)
    setEditFormData({
      email: customer.email || '',
      phone: customer.phone || '',
    })
  }

  const handleSavePassword = async () => {
    if (!newPassword || !confirmPassword) {
      showNotification('Por favor completa todos los campos', 'warning')
      return
    }

    if (newPassword.length < 6) {
      showNotification('La contraseña debe tener al menos 6 caracteres', 'warning')
      return
    }

    if (newPassword !== confirmPassword) {
      showNotification('Las contraseñas no coinciden', 'warning')
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch(`/api/clientes/${selectedCustomer.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      if (res.ok) {
        showNotification('Contraseña actualizada exitosamente', 'success')
        setShowPasswordModal(false)
        setSelectedCustomer(null)
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await res.json()
        showNotification(data.error || 'Error al cambiar contraseña', 'error')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      showNotification('Error al cambiar contraseña', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/clientes/${selectedCustomer.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchCustomers()
        setShowDeleteModal(false)
        setSelectedCustomer(null)
        showNotification('Cliente eliminado exitosamente', 'success')
      } else {
        const data = await res.json()
        showNotification(data.error || 'Error al eliminar cliente', 'error')
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      showNotification('Error al eliminar cliente', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const filteredCustomers = customers
    .filter((customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'totalSpent':
          return (b.totalSpent || 0) - (a.totalSpent || 0)
        case 'totalQuotes':
          return (b.totalQuotes || 0) - (a.totalQuotes || 0)
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt)
        default:
          return a.name.localeCompare(b.name)
      }
    })

  const stats = {
    total: customers.length,
    withQuotes: customers.filter(c => (c.totalQuotes || 0) > 0).length,
    totalSpent: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
    totalQuotes: customers.reduce((sum, c) => sum + (c.totalQuotes || 0), 0),
    avgSpent: customers.length > 0 
      ? customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0) / customers.length 
      : 0,
  }

  const exportToExcel = async () => {
    try {
      // Crear nuevo workbook
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Clientes')

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

      // Agregar logo/icono de la empresa en la parte superior
      // Insertar fila para el logo
      worksheet.insertRow(1, [''])
      worksheet.mergeCells('A1:F1')
      const logoCell = worksheet.getCell('A1')
      logoCell.value = 'CORPORACIÓN GRC'
      logoCell.font = {
        name: 'Arial',
        size: 18,
        bold: true,
        color: { argb: 'FF16A34A' } // Verde corporativo
      }
      logoCell.alignment = { 
        vertical: 'middle', 
        horizontal: 'center' 
      }
      logoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0FDF4' } // Verde muy claro de fondo
      }
      // Agregar borde al título
      logoCell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
      worksheet.getRow(1).height = 35

      // Agregar información de la empresa
      worksheet.insertRow(2, [''])
      worksheet.mergeCells('A2:F2')
      const companyCell = worksheet.getCell('A2')
      companyCell.value = 'SERVICIOS DE APOYO A LAS EMPRESAS - ISO 9001:2015'
      companyCell.font = {
        name: 'Arial',
        size: 10,
        bold: true, // Negrita
        color: { argb: 'FF6B7280' } // Gris
      }
      companyCell.alignment = { 
        vertical: 'middle', 
        horizontal: 'center' 
      }
      worksheet.getRow(2).height = 20

      // Fecha de exportación
      worksheet.insertRow(3, [''])
      worksheet.mergeCells('A3:F3')
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
        bold: true, // Negrita
        color: { argb: 'FF6B7280' }
      }
      dateCell.alignment = { 
        vertical: 'middle', 
        horizontal: 'center' 
      }
      worksheet.getRow(3).height = 18

      // Fila vacía
      worksheet.insertRow(4, [''])
      worksheet.getRow(4).height = 5

      // Encabezados de la tabla (sin ID)
      const headers = ['Nombre', 'Email', 'Teléfono', 'Fecha Registro', 'Total Cotizaciones', 'Total Gastado']
      const headerRow = worksheet.addRow(headers)
      
      // Formatear encabezados con bordes negros
      const blackBorder = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }

      headerRow.eachCell((cell, colNumber) => {
        cell.fill = headerFill
        cell.font = headerFont
        cell.alignment = { 
          vertical: 'middle', 
          horizontal: 'center',
          wrapText: true
        }
        cell.border = blackBorder
      })
      headerRow.height = 25

      // Agregar datos (sin ID)
      filteredCustomers.forEach((customer, index) => {
        const row = worksheet.addRow([
          customer.name,
          customer.email,
          customer.phone || 'N/A',
          formatDate(customer.createdAt),
          customer.totalQuotes || 0,
          customer.totalSpent || 0
        ])

        // Formatear filas de datos con bordes negros
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          }
          cell.alignment = { 
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
          }
          cell.font = {
            name: 'Arial',
            size: 10
          }

          // Formato numérico para columnas específicas
          if (colNumber === 6) { // Total Gastado
            cell.numFmt = '"S/ "#,##0.00' // Formato de moneda con símbolo de soles
          }

          // Color alternado de filas
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' } // Blanco
            }
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' } // Gris muy claro
            }
          }
        })
        // Altura fija de 35 para todas las filas
        row.height = 35
      })

      // Ajustes específicos de ancho para columnas (sin ID)
      worksheet.getColumn(1).width = 25 // Nombre
      worksheet.getColumn(2).width = 30 // Email
      worksheet.getColumn(3).width = 15 // Teléfono
      worksheet.getColumn(4).width = 25 // Fecha Registro
      worksheet.getColumn(5).width = 18 // Total Cotizaciones
      worksheet.getColumn(6).width = 15 // Total Gastado

      // Asegurar que todas las celdas de la tabla tengan bordes negros
      const headerRowNumber = 5 // Fila de encabezados (después de las 4 filas iniciales)
      const lastRow = worksheet.rowCount
      const lastCol = headers.length // 6 columnas (sin ID)
      
      // Aplicar bordes negros a todas las celdas de la tabla (encabezados y datos)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= headerRowNumber && rowNumber <= lastRow) {
          row.eachCell((cell, colNumber) => {
            if (colNumber <= lastCol) {
              // Asegurar bordes negros en todas las celdas
              cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
              }
            }
          })
        }
      })

      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `clientes-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al exportar a Excel:', error)
      alert('Error al generar el archivo Excel. Por favor intenta de nuevo.')
    }
  }

  const exportCustomerHistoryPDF = async (customer) => {
    try {
      if (!customer.quotes || customer.quotes.length === 0) {
        showNotification('Este cliente no tiene cotizaciones para generar el reporte', 'warning')
        return
      }

      // Obtener todas las cotizaciones completas del cliente
      const quotesRes = await fetch('/api/cotizaciones')
      if (!quotesRes.ok) {
        throw new Error('Error al obtener cotizaciones')
      }
      const allQuotes = await quotesRes.json()
      const customerQuotes = allQuotes.filter(q => q.email === customer.email)

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPos = margin

      // ========== ENCABEZADO CORPORATIVO GRC ==========
      const GRC_DARK = [22, 163, 74]  // green-600 #16a34a
      const GRC_DARKER = [20, 83, 45]  // green-800 #14532d
      
      doc.setFillColor(GRC_DARKER[0], GRC_DARKER[1], GRC_DARKER[2])
      doc.rect(0, 0, pageWidth, 12, 'F')
      doc.setFillColor(GRC_DARK[0], GRC_DARK[1], GRC_DARK[2])
      doc.rect(0, 12, pageWidth, 25, 'F')
      
      // Logo GRC
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
      doc.text('Historial de Cotizaciones', pageWidth / 2, 27, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('SERVICIOS DE APOYO A LAS EMPRESAS - ISO 9001:2015', pageWidth / 2, 33, { align: 'center' })

      doc.setTextColor(0, 0, 0)
      yPos = 45

      // Información del cliente
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(`Cliente: ${customer.name || 'N/A'}`, margin, yPos)
      yPos += 6
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Email: ${customer.email || 'N/A'}`, margin, yPos)
      yPos += 5
      if (customer.phone) {
        doc.text(`Teléfono: ${customer.phone}`, margin, yPos)
        yPos += 5
      }
      doc.setFont('helvetica', 'bold')
      doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, margin, yPos)
      yPos += 6
      doc.text(`Total de cotizaciones: ${customerQuotes.length}`, margin, yPos)
      yPos += 6
      const totalSpent = customerQuotes.reduce((sum, q) => sum + (q.total || 0), 0)
      doc.text(`Total gastado: S/. ${totalSpent.toFixed(2)}`, margin, yPos)
      yPos += 10

      // Tabla
      const colWidths = [12, 50, 35, 30, 35]
      const colHeaders = ['N°', 'Fecha', 'Total', 'Estado', 'N° Cotización']
      const colX = [
        margin,
        margin + colWidths[0],
        margin + colWidths[0] + colWidths[1],
        margin + colWidths[0] + colWidths[1] + colWidths[2],
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
      ]
      const tableWidth = pageWidth - (margin * 2)
      const rowHeight = 8

      // Encabezado de tabla
      doc.setFillColor(GRC_DARK[0], GRC_DARK[1], GRC_DARK[2])
      doc.rect(margin, yPos - rowHeight, tableWidth, rowHeight, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      
      colHeaders.forEach((header, idx) => {
        const cellCenterX = colX[idx] + colWidths[idx] / 2
        doc.text(header, cellCenterX, yPos - 3, { align: 'center' })
      })
      
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(0.3)
      for (let i = 1; i < colX.length; i++) {
        doc.line(colX[i], yPos - rowHeight, colX[i], yPos)
      }
      
      doc.setTextColor(0, 0, 0)
      yPos += 2

      // Filas
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      customerQuotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach((quote, index) => {
        if (yPos > pageHeight - 30) {
          doc.addPage()
          yPos = margin + 20
          doc.setFillColor(GRC_DARK[0], GRC_DARK[1], GRC_DARK[2])
          doc.rect(margin, yPos - rowHeight, tableWidth, rowHeight, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          colHeaders.forEach((header, idx) => {
            const cellCenterX = colX[idx] + colWidths[idx] / 2
            doc.text(header, cellCenterX, yPos - 3, { align: 'center' })
          })
          doc.setDrawColor(255, 255, 255)
          doc.setLineWidth(0.3)
          for (let i = 1; i < colX.length; i++) {
            doc.line(colX[i], yPos - rowHeight, colX[i], yPos)
          }
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          yPos += 2
        }

        const rowStartY = yPos - 5
        const rowEndY = yPos + 1

        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, rowStartY, tableWidth, rowHeight, 'F')
        }

        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.2)
        doc.line(margin, rowEndY, pageWidth - margin, rowEndY)
        for (let i = 1; i < colX.length; i++) {
          doc.line(colX[i], rowStartY, colX[i], rowEndY)
        }
        doc.line(margin, rowStartY, margin, rowEndY)
        doc.line(pageWidth - margin, rowStartY, pageWidth - margin, rowEndY)

        const cellCenterY = rowStartY + rowHeight / 2 + 2
        
        // N° - Centrado
        doc.text(String(index + 1), colX[0] + colWidths[0] / 2, cellCenterY, { align: 'center' })
        
        // Fecha - Centrado
        const dateText = new Date(quote.createdAt).toLocaleDateString('es-PE', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
        doc.text(dateText, colX[1] + colWidths[1] / 2, cellCenterY, { align: 'center' })
        
        // Total - Centrado
        doc.setFont('helvetica', 'bold')
        doc.text(`S/. ${(quote.total || 0).toFixed(2)}`, colX[2] + colWidths[2] / 2, cellCenterY, { align: 'center' })
        
        // Estado - Centrado
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.text(getStatusLabel(quote.status), colX[3] + colWidths[3] / 2, cellCenterY, { align: 'center' })
        
        // N° Cotización - Centrado
        doc.setFontSize(8)
        const quoteNumber = quote.quoteNumber ? String(quote.quoteNumber).padStart(7, '0') : quote.id.slice(0, 8).toUpperCase()
        doc.text(quoteNumber, colX[4] + colWidths[4] / 2, cellCenterY, { align: 'center' })
        
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
      a.download = `historial-cotizaciones-${customer.name?.replace(/\s+/g, '-') || 'cliente'}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showNotification('Reporte PDF generado exitosamente', 'success')
    } catch (error) {
      console.error('Error generating customer history PDF:', error)
      showNotification('Error al generar el reporte PDF', 'error')
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

      // Encabezado
      doc.setFillColor(37, 99, 235) // blue-600
      doc.rect(0, 0, pageWidth, 30, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('CORPORACIÓN GRC', pageWidth - margin, 12, { align: 'right' })
      doc.setFontSize(14)
      doc.text('Reporte de Clientes', pageWidth - margin, 20, { align: 'right' })
      doc.setFontSize(10)
      doc.text('ISO 9001:2015', pageWidth - margin, 26, { align: 'right' })

      doc.setTextColor(0, 0, 0)
      yPos = 40

      // Información del reporte
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, margin, yPos)
      yPos += 6
      doc.text(`Total de clientes: ${filteredCustomers.length}`, margin, yPos)
      yPos += 10

      // Tabla
      const colWidths = [15, 50, 45, 30, 30]
      const colHeaders = ['N°', 'Nombre', 'Email', 'Teléfono', 'Total Gastado']
      const colX = [
        margin,
        margin + colWidths[0],
        margin + colWidths[0] + colWidths[1],
        margin + colWidths[0] + colWidths[1] + colWidths[2],
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
      ]

      // Encabezado de tabla
      doc.setFillColor(59, 130, 246) // blue-500
      doc.rect(margin, yPos - 8, pageWidth - (margin * 2), 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      colHeaders.forEach((header, idx) => {
        doc.text(header, colX[idx] + 2, yPos - 2)
      })
      doc.setTextColor(0, 0, 0)
      yPos += 5

      // Filas
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      filteredCustomers.forEach((customer, index) => {
        if (yPos > pageHeight - 30) {
          doc.addPage()
          yPos = margin + 20
          doc.setFillColor(59, 130, 246)
          doc.rect(margin, yPos - 8, pageWidth - (margin * 2), 8, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          colHeaders.forEach((header, idx) => {
            doc.text(header, colX[idx] + 2, yPos - 2)
          })
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          yPos += 5
        }

        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, yPos - 4, pageWidth - (margin * 2), 6, 'F')
        }

        doc.text(String(index + 1), colX[0] + 2, yPos)
        doc.text(customer.name, colX[1] + 2, yPos)
        doc.setFontSize(7.5)
        doc.text(customer.email || 'N/A', colX[2] + 2, yPos)
        doc.setFontSize(8)
        doc.text(customer.phone || 'N/A', colX[3] + 2, yPos)
        doc.text(`S/. ${(customer.totalSpent || 0).toFixed(2)}`, colX[4] + 2, yPos)
        yPos += 7
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
      a.download = `clientes-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al generar reporte PDF')
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
        <title>Clientes - Panel Administrador</title>
      </Head>
      <AdminLayout user={user}>
        <div className="space-y-6">
          {/* Header Compacto con Estadísticas */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">GESTIÓN DE CLIENTES</h1>
                <p className="text-gray-600 text-xs mt-0.5">
                  {customers.length} cliente{customers.length !== 1 ? 's' : ''} en total
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

            {/* Estadísticas Compactas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-800 text-xs font-semibold">Total</span>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                    <FiUsers className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-2 border-purple-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-purple-800 text-xs font-semibold">Con Cotizaciones</span>
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                    <FiFileText className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-purple-900">{stats.withQuotes}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-green-800 text-xs font-semibold">Total Ventas</span>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <FiTrendingUp className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-lg font-bold text-green-900">S/. {stats.totalSpent.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 border-2 border-indigo-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-indigo-800 text-xs font-semibold">Promedio</span>
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shadow-md">
                    <FiTrendingUp className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-lg font-bold text-indigo-900">S/. {stats.avgSpent.toFixed(2)}</p>
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
                  {searchQuery && (
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
                    placeholder="Buscar clientes por nombre, email o teléfono..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    style={{ color: '#111827' }}
                  />
                </div>

                {/* Ordenar */}
                <div className="min-w-[150px]">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                    style={{ color: '#111827' }}
                  >
                    <option value="name">Ordenar por Nombre</option>
                    <option value="totalSpent">Ordenar por Total Gastado</option>
                    <option value="totalQuotes">Ordenar por Cotizaciones</option>
                    <option value="date">Ordenar por Fecha</option>
                  </select>
                </div>

                {/* Botones de Exportar */}
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiDownload size={14} />
                  <span>Excel</span>
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiFileText size={14} />
                  <span>PDF</span>
                </button>
              </div>

              {/* Contador de resultados */}
              <div className="flex items-center justify-between text-xs text-gray-600 pt-2 mt-2 border-t border-gray-200">
                <span>Mostrando {filteredCustomers.length} de {customers.length} clientes</span>
              </div>
            </div>
          </div>

          {/* Vista de Cards o Tabla */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredCustomers.length === 0 ? (
                <div className="col-span-full bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <FiUsers className="mx-auto text-gray-400" size={48} />
                  <p className="mt-4 text-gray-600 text-lg">
                    {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                  </p>
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <div key={customer.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden group">
                    {/* Header de la Card */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/30">
                          <span className="text-white font-bold text-xl">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg truncate">{customer.name}</h3>
                          <p className="text-xs text-purple-100 font-mono">ID: {customer.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Contenido de la Card */}
                    <div className="p-5 space-y-4">
                      <div className="space-y-2">
                        {editingCustomer === customer.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <FiMail size={14} className="text-gray-400" />
                              <input
                                type="email"
                                value={editFormData.email}
                                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                                placeholder="Email"
                                style={{ color: '#111827' }}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <FiPhone size={14} className="text-gray-400" />
                              <input
                                type="tel"
                                value={editFormData.phone}
                                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                                placeholder="Teléfono"
                                style={{ color: '#111827' }}
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => handleSaveEdit(customer.id)}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                              >
                                <FiSave size={14} />
                                Guardar
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="flex-1 flex items-center justify-center gap-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                              >
                                <FiX size={14} />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <FiMail size={16} className="text-gray-400" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                            {customer.phone ? (
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <FiPhone size={16} className="text-gray-400" />
                                <span>{customer.phone}</span>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 italic">Sin teléfono registrado</div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <FiCalendar size={14} className="text-gray-400" />
                              <span>{formatDate(customer.createdAt)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">Cotizaciones</span>
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            customer.totalQuotes > 0
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-300'
                          }`}>
                            <FiFileText size={12} className="inline mr-1" />
                            {customer.totalQuotes || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">Total Gastado</span>
                          <span className={`text-base font-bold ${
                            customer.totalSpent > 0 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {formatCurrency(customer.totalSpent || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      {editingCustomer !== customer.id && (
                        <div className="flex flex-col gap-2 pt-3 border-t">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition-colors font-medium"
                          >
                            <FiEdit2 size={16} />
                            <span>EDITAR CONTACTO</span>
                          </button>
                          <button
                            onClick={() => handleChangePassword(customer)}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors font-medium"
                          >
                            <FiLock size={16} />
                            <span>CAMBIAR CONTRASEÑA</span>
                          </button>
                          <button
                            onClick={() => handleDelete(customer)}
                            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition-colors font-medium"
                          >
                            <FiTrash2 size={16} />
                            <span>ELIMINAR CLIENTE</span>
                          </button>
                          <button
                            onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm transition-colors font-medium"
                          >
                            {expandedCustomer === customer.id ? (
                              <>
                                <FiChevronUp size={16} />
                                <span>OCULTAR HISTORIAL</span>
                              </>
                            ) : (
                              <>
                                <FiChevronDown size={16} />
                                <span>VER HISTORIAL</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Historial Expandido */}
                    {expandedCustomer === customer.id && customer.quotes && customer.quotes.length > 0 && (
                      <div className="border-t bg-gradient-to-br from-purple-50 to-indigo-50 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <FiFileText size={16} className="text-purple-600" />
                            Historial de Cotizaciones
                            <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">
                              {customer.quotes.length}
                            </span>
                          </h4>
                          <button
                            onClick={() => exportCustomerHistoryPDF(customer)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                            title="Generar reporte PDF del historial"
                          >
                            <FiDownload size={14} />
                            <span className="hidden sm:inline">Reporte PDF</span>
                            <span className="sm:hidden">PDF</span>
                          </button>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {customer.quotes.map((quote) => (
                            <div
                              key={quote.id}
                              className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 shadow-sm hover:shadow transition-all"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-gray-100 text-gray-700 rounded border border-gray-300">
                                    #{quote.id.slice(0, 8).toUpperCase()}
                                  </span>
                                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getStatusColor(quote.status)}`}>
                                    {getStatusLabel(quote.status)}
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-green-600">
                                  {formatCurrency(quote.total)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                                <FiCalendar size={12} className="text-gray-400" />
                                <span>{formatDate(quote.createdAt)}</span>
                              </div>
                              <a
                                href={`/api/cotizaciones/${quote.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors"
                              >
                                <FiEye size={12} />
                                Ver PDF
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {expandedCustomer === customer.id && (!customer.quotes || customer.quotes.length === 0) && (
                      <div className="border-t bg-gradient-to-br from-gray-50 to-purple-50 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full mb-3">
                          <FiFileText size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm font-medium">
                          Este cliente aún no ha realizado cotizaciones
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Vista de Tabla - Responsive sin scroll horizontal */
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="overflow-hidden">
                <table className="w-full table-fixed">
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
                    <tr>
                      <th className="w-[20%] px-3 md:px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiUser size={14} />
                          <span>Cliente</span>
                        </div>
                      </th>
                      <th className="w-[25%] px-3 md:px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiMail size={14} />
                          <span>Contacto</span>
                        </div>
                      </th>
                      <th className="w-[15%] px-3 md:px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <FiCalendar size={14} />
                          <span>Fecha Registro</span>
                        </div>
                      </th>
                      <th className="w-[12%] px-3 md:px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center justify-center gap-2">
                          <FiFileText size={14} />
                          <span className="hidden sm:inline">Cotizaciones</span>
                          <span className="sm:hidden">Cot.</span>
                        </div>
                      </th>
                      <th className="w-[13%] px-3 md:px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                        <span className="hidden sm:inline">Total Gastado</span>
                        <span className="sm:hidden">Total</span>
                      </th>
                      <th className="w-[15%] px-3 md:px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center">
                            <FiUsers className="mx-auto text-gray-400" size={48} />
                            <p className="mt-4 text-gray-600 text-lg">
                              {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((customer, index) => (
                          <tr key={customer.id} className={`transition-colors ${
                            index % 2 === 0 
                              ? 'bg-white hover:bg-blue-50' 
                              : 'bg-gray-50 hover:bg-blue-50'
                          }`}>
                            <td className="px-3 md:px-5 py-4">
                              <div className="flex items-center">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mr-2 md:mr-3 shadow-lg ring-2 ring-purple-200 hover:ring-purple-300 transition-all flex-shrink-0">
                                  <span className="text-white font-bold text-base md:text-lg">
                                    {customer.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs md:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                    <FiUser size={12} className="text-purple-600 flex-shrink-0 hidden sm:inline" />
                                    <span className="break-words">{customer.name}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {customer.id.slice(0, 8)}</div>
                                  {/* Fecha en móviles y tablets */}
                                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-1 lg:hidden">
                                    <FiCalendar size={10} />
                                    <span className="break-words">{formatDate(customer.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 md:px-5 py-4">
                              {editingCustomer === customer.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="email"
                                    value={editFormData.email}
                                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                    className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white w-full"
                                    placeholder="Email"
                                    style={{ color: '#111827' }}
                                  />
                                  <input
                                    type="tel"
                                    value={editFormData.phone}
                                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                    className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white w-full"
                                    placeholder="Teléfono"
                                    style={{ color: '#111827' }}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleSaveEdit(customer.id)}
                                      disabled={saving}
                                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                                    >
                                      <FiSave size={12} />
                                      <span className="hidden sm:inline">Guardar</span>
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs font-medium rounded-lg transition-colors"
                                    >
                                      <FiX size={12} />
                                      <span className="hidden sm:inline">Cancelar</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5 md:space-y-2">
                                  <div className="text-xs md:text-sm text-gray-900 flex items-start gap-2 group">
                                    <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors flex-shrink-0 mt-0.5">
                                      <FiMail size={12} className="md:w-4 md:h-4 text-blue-600" />
                                    </div>
                                    <span className="font-medium break-words">{customer.email}</span>
                                  </div>
                                  {customer.phone ? (
                                    <div className="text-xs md:text-sm text-gray-600 flex items-start gap-2 group">
                                      <div className="w-6 h-6 md:w-8 md:h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors flex-shrink-0 mt-0.5">
                                        <FiPhone size={12} className="md:w-4 md:h-4 text-green-600" />
                                      </div>
                                      <span className="break-words">{customer.phone}</span>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-400 italic flex items-center gap-2">
                                      <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FiPhone size={10} className="md:w-3.5 md:h-3.5 text-gray-400" />
                                      </div>
                                      <span className="hidden sm:inline">Sin teléfono</span>
                                      <span className="sm:hidden">Sin tel.</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 md:px-5 py-4 hidden lg:table-cell">
                              <div className="text-sm text-gray-900 flex items-center gap-2 group">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors flex-shrink-0">
                                  <FiCalendar size={16} className="text-purple-600" />
                                </div>
                                <span className="font-medium break-words">{formatDate(customer.createdAt)}</span>
                              </div>
                            </td>
                            <td className="px-3 md:px-6 py-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-lg shadow-sm transition-all ${
                                customer.totalQuotes > 0
                                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-2 border-green-300 hover:border-green-400'
                                  : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
                              }`}>
                                <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  customer.totalQuotes > 0 ? 'bg-green-500' : 'bg-gray-400'
                                }`}>
                                  <FiFileText size={10} className="md:w-3 md:h-3 text-white" />
                                </div>
                                {customer.totalQuotes || 0}
                              </span>
                            </td>
                            <td className="px-3 md:px-6 py-4 text-right">
                              <div className={`flex items-center justify-end gap-1.5 md:gap-2 ${
                                customer.totalSpent > 0 ? 'text-green-600' : 'text-gray-500'
                              }`}>
                                <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  customer.totalSpent > 0 ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                  <FiTrendingUp size={12} className={`md:w-4 md:h-4 ${customer.totalSpent > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                                </div>
                                <span className="text-xs md:text-sm font-bold break-words">{formatCurrency(customer.totalSpent || 0)}</span>
                              </div>
                            </td>
                            <td className="px-3 md:px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-1.5 md:gap-2 flex-wrap">
                                {editingCustomer !== customer.id && (
                                  <button
                                    onClick={() => handleOpenActionsModal(customer)}
                                    className="group relative flex items-center justify-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-medium text-xs md:text-sm"
                                    title="Gestionar cliente"
                                  >
                                    <FiEdit2 size={14} className="md:w-4 md:h-4 group-hover:rotate-12 transition-transform" />
                                    <span className="hidden sm:inline">Gestionar</span>
                                    <span className="sm:hidden">Gest.</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                                  className="px-2 md:px-3 py-1 md:py-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-all flex items-center gap-1 font-medium border border-purple-200 hover:border-purple-300 text-xs md:text-sm"
                                >
                                  {expandedCustomer === customer.id ? (
                                    <>
                                      <FiChevronUp size={14} className="md:w-4 md:h-4" />
                                      <span className="hidden sm:inline">Ocultar</span>
                                    </>
                                  ) : (
                                    <>
                                      <FiChevronDown size={14} className="md:w-4 md:h-4" />
                                      <span className="hidden sm:inline">Ver más</span>
                                      <span className="sm:hidden">+</span>
                                    </>
                                  )}
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

          {/* Historial Expandido en Vista de Tabla */}
          {viewMode === 'table' && expandedCustomer && filteredCustomers.find(c => c.id === expandedCustomer)?.quotes && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FiFileText size={20} className="text-purple-600" />
                  Historial de Cotizaciones - {filteredCustomers.find(c => c.id === expandedCustomer)?.name}
                  <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">
                    {filteredCustomers.find(c => c.id === expandedCustomer)?.quotes.length}
                  </span>
                </h3>
                <button
                  onClick={() => exportCustomerHistoryPDF(filteredCustomers.find(c => c.id === expandedCustomer))}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                  title="Generar reporte PDF del historial"
                >
                  <FiDownload size={16} />
                  Reporte PDF
                </button>
              </div>
              <div className="grid gap-3">
                {filteredCustomers.find(c => c.id === expandedCustomer)?.quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 text-xs font-mono font-bold bg-white text-gray-700 rounded-lg border border-gray-300">
                          #{quote.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${getStatusColor(quote.status)}`}>
                          {getStatusLabel(quote.status)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatDate(quote.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-green-600">
                          {formatCurrency(quote.total)}
                        </span>
                        <a
                          href={`/api/cotizaciones/${quote.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
                        >
                          Ver PDF
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal de Cambiar Contraseña */}
          {showPasswordModal && selectedCustomer && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FiLock size={20} className="text-blue-600" />
                    Cambiar Contraseña
                  </h3>
                  <button
                    onClick={() => {
                      setShowPasswordModal(false)
                      setSelectedCustomer(null)
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Cliente: <span className="font-semibold text-gray-900">{selectedCustomer.name}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedCustomer.email}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nueva Contraseña *
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      placeholder="Mínimo 6 caracteres"
                      style={{ color: '#111827' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Contraseña *
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      placeholder="Repite la contraseña"
                      style={{ color: '#111827' }}
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800">
                      <strong>Nota:</strong> El cliente deberá usar esta nueva contraseña para iniciar sesión.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setShowPasswordModal(false)
                        setSelectedCustomer(null)
                        setNewPassword('')
                        setConfirmPassword('')
                      }}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSavePassword}
                      disabled={changingPassword || !newPassword || !confirmPassword}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {changingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Acciones Unificado */}
          {showActionsModal && selectedCustomer && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleCloseActionsModal}>
              <div className="bg-white rounded-xl max-w-md w-full shadow-2xl transform transition-all" onClick={(e) => e.stopPropagation()}>
                {/* Header del Modal */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/30">
                        <span className="text-white font-bold text-xl">
                          {selectedCustomer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Gestionar Cliente</h3>
                        <p className="text-sm text-purple-100">{selectedCustomer.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleCloseActionsModal}
                      className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
                    >
                      <FiX size={24} />
                    </button>
                  </div>
                </div>

                {/* Contenido del Modal */}
                <div className="p-6 space-y-3">
                  {/* Opción 1: Editar Datos */}
                  <button
                    onClick={() => handleEditFromModal(selectedCustomer)}
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 hover:border-blue-300 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md group"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <FiEdit2 size={24} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-bold text-gray-900 text-base">Editar Datos</h4>
                      <p className="text-sm text-gray-600">Modificar email y teléfono del cliente</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Opción 2: Cambiar Contraseña */}
                  <button
                    onClick={() => handleChangePassword(selectedCustomer)}
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 border-green-200 hover:border-green-300 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md group"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <FiLock size={24} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-bold text-gray-900 text-base">Cambiar Contraseña</h4>
                      <p className="text-sm text-gray-600">Establecer una nueva contraseña para el cliente</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Opción 3: Eliminar Cliente */}
                  <button
                    onClick={() => handleDelete(selectedCustomer)}
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 border-2 border-red-200 hover:border-red-300 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md group"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <FiTrash2 size={24} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-bold text-gray-900 text-base">Eliminar Cliente</h4>
                      <p className="text-sm text-gray-600">Eliminar permanentemente este cliente</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Footer del Modal */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
                  <button
                    onClick={handleCloseActionsModal}
                    className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Eliminar Cliente */}
          {showDeleteModal && selectedCustomer && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                    <FiTrash2 size={20} />
                    Eliminar Cliente
                  </h3>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false)
                      setSelectedCustomer(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    ¿Estás seguro de que deseas eliminar al cliente:
                  </p>
                  <p className="text-base font-bold text-gray-900 mb-1">
                    {selectedCustomer.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedCustomer.email}
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-red-800">
                    <strong>Advertencia:</strong> Esta acción no se puede deshacer. Se eliminarán todos los datos del cliente, incluyendo sus cotizaciones asociadas.
                  </p>
                </div>

                {selectedCustomer.totalQuotes > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-yellow-800">
                      <strong>Atención:</strong> Este cliente tiene {selectedCustomer.totalQuotes} cotización{selectedCustomer.totalQuotes !== 1 ? 'es' : ''} asociada{selectedCustomer.totalQuotes !== 1 ? 's' : ''}.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false)
                      setSelectedCustomer(null)
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {deleting ? 'Eliminando...' : 'Eliminar Cliente'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sistema de Notificaciones */}
          <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
            {notifications.map((notification) => {
              const bgColor = {
                success: 'bg-green-500',
                error: 'bg-red-500',
                warning: 'bg-yellow-500',
                info: 'bg-blue-500'
              }[notification.type] || 'bg-gray-500'

              const borderColor = {
                success: 'border-green-600',
                error: 'border-red-600',
                warning: 'border-yellow-600',
                info: 'border-blue-600'
              }[notification.type] || 'border-gray-600'

              const icon = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
              }[notification.type] || '•'

              return (
                <div
                  key={notification.id}
                  className={`${bgColor} ${borderColor} border-l-4 text-white px-5 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[320px] max-w-[420px] pointer-events-auto transform transition-all duration-300 ease-out animate-slide-in`}
                  style={{
                    animation: 'slideInRight 0.4s ease-out forwards'
                  }}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/30 flex items-center justify-center font-bold text-base">
                    {icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm leading-tight">{notification.message}</p>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                    className="flex-shrink-0 text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded"
                    aria-label="Cerrar notificación"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </AdminLayout>
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideInRight 0.4s ease-out forwards;
        }
      `}</style>
    </>
  )
}
