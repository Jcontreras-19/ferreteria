import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  FiCheck, FiX, FiSearch, FiDownload, FiFileText, FiPackage, FiClock, FiUser, FiMail, FiPhone, 
  FiCalendar, FiEye, FiCheckCircle, FiXCircle, FiFilter, FiAlertCircle, FiInfo, FiPrinter, FiChevronDown, FiChevronUp,
  FiGrid, FiList, FiTag, FiDollarSign, FiTrendingUp, FiShoppingCart, FiExternalLink
} from 'react-icons/fi'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'

export default function BoletasFacturas() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all') // all, boleta, factura
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showDateFilters, setShowDateFilters] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'cards' or 'table'

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchQuotes()
    }
  }, [user])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (res.ok) {
        const userData = await res.json()
        const adminRoles = ['admin', 'superadmin']
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
      const params = new URLSearchParams()
      params.append('status', 'authorized')
      if (dateFrom) {
        params.append('dateFrom', dateFrom)
      }
      if (dateTo) {
        params.append('dateTo', dateTo)
      }

      const res = await fetch(`/api/cotizaciones/autorizadas?${params.toString()}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setQuotes(data)
      } else {
        showNotification('Error al cargar boletas/facturas', 'error')
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
      showNotification('Error al cargar boletas/facturas', 'error')
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    if (user) {
      fetchQuotes()
    }
  }, [user, fetchQuotes])

  const showNotification = (message, type = 'success') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = searchQuery === '' ||
      quote.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.whatsapp?.includes(searchQuery) ||
      (quote.quoteNumber && quote.quoteNumber.toString().includes(searchQuery)) ||
      (quote.documentNumber && quote.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesDocumentType = documentTypeFilter === 'all' || 
      (documentTypeFilter === 'boleta' && quote.documentType === 'boleta') ||
      (documentTypeFilter === 'factura' && quote.documentType === 'factura')
    
    return matchesSearch && matchesDocumentType
  })

  const handleViewDetails = (quote) => {
    setSelectedQuote(quote)
    setShowDetailModal(true)
  }

  const handleViewPdf = async (quote) => {
    try {
      const res = await fetch(`/api/cotizaciones/${quote.id}/pdf`, {
        credentials: 'include',
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        setPdfPreviewUrl(url)
        setShowPdfModal(true)
      } else {
        showNotification('Error al generar PDF', 'error')
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      showNotification('Error al generar PDF', 'error')
    }
  }

  const handleDownloadPdf = async (quote) => {
    try {
      const res = await fetch(`/api/cotizaciones/${quote.id}/pdf`, {
        credentials: 'include',
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${quote.documentType === 'factura' ? 'Factura' : 'Boleta'}-${quote.documentNumber || quote.quoteNumber || 'N/A'}.pdf`
        document.body.appendChild(a)
        a.click()
        URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showNotification('PDF descargado exitosamente', 'success')
      } else {
        showNotification('Error al descargar PDF', 'error')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      showNotification('Error al descargar PDF', 'error')
    }
  }

  const exportToExcel = async () => {
    try {
      const data = filteredQuotes.map(quote => {
        let products = []
        try {
          products = quote.productsParsed || JSON.parse(quote.products || '[]')
        } catch (e) {
          products = []
        }
        return {
          'N° Cotización': quote.quoteNumber || 'N/A',
          'Tipo Documento': quote.documentType === 'factura' ? 'Factura' : 'Boleta',
          'N° Documento': quote.documentNumber || 'N/A',
          'Cliente': quote.name,
          'Email': quote.email,
          'WhatsApp': quote.whatsapp,
          'Total': quote.total,
          'Productos': products.map(p => `${p.name} (x${p.quantity || 1})`).join(', '),
          'Fecha Autorización': quote.authorizedAt ? new Date(quote.authorizedAt).toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }) : 'N/A',
          'Fecha Cotización': new Date(quote.createdAt).toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        }
      })

      // Crear nuevo workbook
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Boletas y Facturas')

      // Colores corporativos GRC (verde)
      const headerFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF16A34A' }
      }

      const headerFont = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      }

      const blackBorder = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }

      // Agregar logo/icono de la empresa
      worksheet.insertRow(1, [''])
      worksheet.mergeCells('A1:J1')
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
      worksheet.mergeCells('A2:J2')
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
      const headers = ['N° Cotización', 'Tipo Documento', 'N° Documento', 'Cliente', 'Email', 'WhatsApp', 'Total', 'Productos', 'Fecha Autorización', 'Fecha Cotización']
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
          rowData['Tipo Documento'],
          rowData['N° Documento'],
          rowData['Cliente'],
          rowData['Email'],
          rowData['WhatsApp'],
          rowData['Total'],
          rowData['Productos'],
          rowData['Fecha Autorización'],
          rowData['Fecha Cotización']
        ])

        row.eachCell((cell, colNumber) => {
          cell.border = blackBorder
          cell.alignment = { 
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true 
          }
          cell.font = { name: 'Arial', size: 10 }

          // Formato numérico para columnas específicas
          if (colNumber === 7) { // Total
            cell.numFmt = '"S/ "#,##0.00' // Formato de moneda con símbolo de soles
          }

          if (index % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
          }
        })
        // Altura fija de 35 para todas las filas
        row.height = 35
      })

      // Ajustar ancho de columnas
      worksheet.getColumn(1).width = 15 // N° Cotización
      worksheet.getColumn(2).width = 15 // Tipo Documento
      worksheet.getColumn(3).width = 20 // N° Documento
      worksheet.getColumn(4).width = 25 // Cliente
      worksheet.getColumn(5).width = 30 // Email
      worksheet.getColumn(6).width = 15 // WhatsApp
      worksheet.getColumn(7).width = 15 // Total
      worksheet.getColumn(8).width = 40 // Productos
      worksheet.getColumn(9).width = 20 // Fecha Autorización
      worksheet.getColumn(10).width = 20 // Fecha Cotización

      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `boletas-facturas-${dateFrom ? dateFrom.split('T')[0] : 'todas'}-${dateTo ? dateTo.split('T')[0] : new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showNotification('Excel exportado exitosamente', 'success')
    } catch (error) {
      console.error('Error al exportar a Excel:', error)
      showNotification('Error al generar el archivo Excel', 'error')
    }
  }

  if (loading || !user) {
    return (
      <AdminLayout user={user} loading={loading}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const stats = {
    total: quotes.length,
    boletas: quotes.filter(q => q.documentType === 'boleta').length,
    facturas: quotes.filter(q => q.documentType === 'factura').length,
    hoy: quotes.filter(q => {
      const authDate = q.authorizedAt ? new Date(q.authorizedAt) : null
      return authDate && authDate.toDateString() === new Date().toDateString()
    }).length,
  }

  return (
    <AdminLayout user={user} loading={false}>
      <Head>
        <title>Boletas y Facturas - Panel Admin</title>
      </Head>

      <div className="space-y-4">
        {/* Header Compacto con Estadísticas */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">BOLETAS Y FACTURAS</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                {quotes.length} documento{quotes.length !== 1 ? 's' : ''} en total
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
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-2 border-purple-300 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-purple-800 text-xs font-semibold">Total</span>
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                  <FiFileText className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-300 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-blue-800 text-xs font-semibold">Boletas</span>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                  <FiFileText className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.boletas}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-green-800 text-xs font-semibold">Facturas</span>
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                  <FiFileText className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.facturas}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border-2 border-orange-300 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-orange-800 text-xs font-semibold">Hoy</span>
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
                  <FiClock className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-orange-900">{stats.hoy}</p>
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
              </div>

              {/* Búsqueda */}
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar por cliente, email, número de documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  style={{ color: '#111827' }}
                />
              </div>

              {/* Tipo de Documento */}
              <div className="min-w-[120px]">
                <select
                  value={documentTypeFilter}
                  onChange={(e) => setDocumentTypeFilter(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                  style={{ color: '#111827' }}
                >
                  <option value="all">Todos</option>
                  <option value="boleta">Boletas</option>
                  <option value="factura">Facturas</option>
                </select>
              </div>

              {/* Botón de Fechas */}
              <button
                onClick={() => setShowDateFilters(!showDateFilters)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  showDateFilters 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiCalendar size={14} />
                <span>Fechas</span>
                {showDateFilters ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
              </button>

              {/* Botón de Exportar */}
              <button
                onClick={exportToExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
              >
                <FiDownload size={14} />
                <span>Excel</span>
              </button>
            </div>

            {/* Filtros de Fecha - Colapsable */}
            {showDateFilters && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
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
                  <div>
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
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setDateFrom('')
                        setDateTo('')
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <FiX size={14} />
                      <span>Limpiar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Contador de resultados */}
            <div className="flex items-center justify-between text-xs text-gray-600 pt-2 mt-2 border-t border-gray-200">
              <span>Mostrando {filteredQuotes.length} de {quotes.length} documentos</span>
            </div>
          </div>
        </div>

        {/* Vista de Cards o Tabla */}
        {viewMode === 'cards' ? (
          filteredQuotes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FiFileText className="mx-auto text-gray-400" size={48} />
              <p className="mt-4 text-gray-600 text-lg">No hay boletas o facturas generadas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredQuotes.map((quote) => {
              let products = []
              try {
                products = quote.productsParsed || JSON.parse(quote.products || '[]')
              } catch (e) {
                products = []
              }

              const isFactura = quote.documentType === 'factura'
              const bgColor = isFactura ? 'from-green-600 to-green-700' : 'from-blue-600 to-blue-700'

              return (
                <div key={quote.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200">
                  {/* Header de la Card */}
                  <div className={`bg-gradient-to-br ${bgColor} p-4 text-white`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold">
                        {isFactura ? 'F' : 'B'}-{quote.documentNumber?.split('-').pop() || 'N/A'}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-white/20">
                        {isFactura ? 'Factura' : 'Boleta'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold">
                      S/. {quote.total?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-xs text-white/80 mt-1">
                      Cotización #{quote.quoteNumber || 'N/A'}
                    </div>
                    <div className="text-xs text-white/80">
                      {quote.authorizedAt ? new Date(quote.authorizedAt).toLocaleDateString('es-PE') : 'N/A'}
                    </div>
                  </div>

                  {/* Contenido de la Card */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center space-x-2 text-gray-700 text-sm mb-1">
                        <FiUser size={14} className="text-gray-400" />
                        <span className="font-semibold">{quote.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600 text-xs">
                        <FiMail size={14} className="text-gray-400" />
                        <span className="truncate">{quote.email}</span>
                      </div>
                    </div>

                    {/* Productos - Resumen */}
                    <div className="border-t pt-2">
                      <div className="flex items-center space-x-2 mb-1">
                        <FiPackage size={14} className="text-gray-400" />
                        <span className="text-xs font-semibold text-gray-700">Productos ({products.length})</span>
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

                    {/* Botones de Acción */}
                    <div className="flex flex-col space-y-2 pt-2 border-t">
                      <button
                        onClick={() => handleViewDetails(quote)}
                        className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition-colors shadow-sm"
                      >
                        <FiEye size={16} />
                        <span>VER DETALLES</span>
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleViewPdf(quote)}
                          className="flex items-center justify-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded-lg text-xs transition-colors shadow-sm"
                        >
                          <FiEye size={14} />
                          <span>VER PDF</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(quote)}
                          className="flex items-center justify-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-2 rounded-lg text-xs transition-colors shadow-sm"
                        >
                          <FiDownload size={14} />
                          <span>DESCARGAR</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          )
        ) : (
          /* Vista de Tabla */
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
                        <FiFileText size={14} />
                        Documento
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
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <FiFileText className="mx-auto text-gray-400 mb-3" size={48} />
                        <p className="text-gray-600 text-lg">No hay boletas o facturas generadas</p>
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
                              <div className="text-xs text-gray-500">{quote.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-lg ${
                              quote.documentType === 'factura' 
                                ? 'bg-green-50 text-green-700 border-2 border-green-300' 
                                : 'bg-blue-50 text-blue-700 border-2 border-blue-300'
                            }`}>
                              {quote.documentType === 'factura' ? 'Factura' : 'Boleta'}
                            </span>
                            <div className="text-xs text-gray-500 font-mono mt-1">
                              {quote.documentNumber || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-base font-bold text-green-600">
                            S/. {quote.total?.toFixed(2) || '0.00'}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium text-gray-900">
                              {quote.authorizedAt ? new Date(quote.authorizedAt).toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              }) : 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {quote.authorizedAt ? new Date(quote.authorizedAt).toLocaleTimeString('es-PE', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true
                              }) : ''}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(quote)}
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
      {showDetailModal && selectedQuote && (() => {
        let products = []
        try {
          const productsData = typeof selectedQuote.products === 'string'
            ? JSON.parse(selectedQuote.products)
            : selectedQuote.products
          products = productsData.items || productsData
        } catch (e) {
          products = []
        }

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-lg w-full max-w-6xl shadow-2xl border border-gray-300 flex flex-col animate-slideUp" style={{ maxHeight: '90vh' }}>
              {/* Header con Gradiente Colorido */}
              <div className={`bg-gradient-to-r ${selectedQuote.documentType === 'factura' ? 'from-green-600 via-emerald-600 to-teal-600' : 'from-blue-600 via-indigo-600 to-purple-600'} px-4 py-3 flex items-center justify-between border-b ${selectedQuote.documentType === 'factura' ? 'border-teal-700' : 'border-indigo-700'} shadow-lg`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center ring-2 ring-white/30">
                    <FiFileText className="text-white" size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {selectedQuote.documentType === 'factura' ? 'Factura' : 'Boleta'} {selectedQuote.documentNumber || 'N/A'}
                    </h3>
                    <p className="text-blue-100 text-xs flex items-center gap-1">
                      <FiTag size={10} />
                      Cotización {selectedQuote.quoteNumber ? String(selectedQuote.quoteNumber).padStart(7, '0') : 'N/A'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ring-2 ring-white/30"
                >
                  <FiX className="text-white" size={16} />
                </button>
              </div>

              {/* Contenido Compacto Sin Scroll con Colores */}
              <div className="p-4 bg-gradient-to-br from-gray-50 to-white overflow-hidden">
                <div className="grid grid-cols-12 gap-3">
                  {/* Columna Izquierda - Info Principal con Colores (Más Estrecha) */}
                  <div className="col-span-12 lg:col-span-3 space-y-2">
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

                    {/* Tipo de Documento - Más Compacto */}
                    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                          <FiFileText size={10} />
                          Documento
                        </span>
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${selectedQuote.documentType === 'factura' ? 'bg-green-100' : 'bg-blue-100'}`}>
                          <FiFileText className={selectedQuote.documentType === 'factura' ? 'text-green-600' : 'text-blue-600'} size={12} />
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-lg shadow-sm ${
                        selectedQuote.documentType === 'factura' 
                          ? 'bg-green-50 text-green-700 border-2 border-green-300' 
                          : 'bg-blue-50 text-blue-700 border-2 border-blue-300'
                      }`}>
                        {selectedQuote.documentType === 'factura' ? 'Factura' : 'Boleta'} {selectedQuote.documentNumber || 'N/A'}
                      </span>
                    </div>

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

                    {/* Fecha de Autorización */}
                    {selectedQuote.authorizedAt && (
                      <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FiClock className="text-purple-500" size={12} />
                          <span className="text-xs text-gray-600 font-semibold">Autorizado</span>
                        </div>
                        <p className="text-xs text-gray-900 font-medium">
                          {new Date(selectedQuote.authorizedAt).toLocaleDateString('es-PE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Columna Derecha - Tabla de Productos con Colores (Más Ancha) */}
                  <div className="col-span-12 lg:col-span-9">
                    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md overflow-hidden">
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2.5 border-b border-purple-700">
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <div className="w-6 h-6 bg-white/20 backdrop-blur-sm rounded flex items-center justify-center">
                            <FiPackage className="text-white" size={12} />
                          </div>
                          Productos ({products.length})
                        </h4>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
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
                            {products.map((product, index) => (
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
                                    {product.quantity || 1}
                                  </span>
                                </td>
                                <td className="px-2 py-2 text-right text-gray-900 font-medium">S/. {product.price?.toFixed(2) || '0.00'}</td>
                                <td className="px-2 py-2 text-right">
                                  <span className="font-bold text-green-600 text-xs">
                                    S/. {((product.price || 0) * (product.quantity || 1)).toFixed(2)}
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
                  </div>
                </div>
              </div>

              {/* Footer con Botones Coloridos y Diseño Mejorado */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-300 px-4 py-3 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2 text-xs text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                  <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                    <FiClock className="text-blue-600" size={12} />
                  </div>
                  <span className="font-medium">
                    {selectedQuote.authorizedAt 
                      ? new Date(selectedQuote.authorizedAt).toLocaleDateString('es-PE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : new Date(selectedQuote.createdAt).toLocaleDateString('es-PE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowDetailModal(false)
                      handleViewPdf(selectedQuote)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <FiExternalLink size={14} />
                    Ver PDF
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(selectedQuote)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <FiDownload size={14} />
                    Descargar
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow"
                  >
                    <FiX size={14} />
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal de PDF */}
      {showPdfModal && pdfPreviewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold">Vista Previa del PDF</h3>
              <button
                onClick={() => {
                  setShowPdfModal(false)
                  URL.revokeObjectURL(pdfPreviewUrl)
                  setPdfPreviewUrl(null)
                }}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              <iframe
                src={pdfPreviewUrl}
                className="w-full"
                style={{ height: 'calc(90vh - 120px)', minHeight: '600px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Notificaciones */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 ${
              notification.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <FiCheckCircle size={20} />
            ) : (
              <FiX size={20} />
            )}
            <span>{notification.message}</span>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
