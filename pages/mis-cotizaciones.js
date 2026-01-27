import { useEffect, useState } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { 
  FiSearch, FiFilter, FiDownload, FiFileText, FiCalendar, FiDollarSign, 
  FiTrendingUp, FiChevronDown, FiChevronUp, FiX, FiCheckCircle, FiClock,
  FiXCircle, FiAlertCircle, FiGrid, FiList
} from 'react-icons/fi'
import * as XLSX from 'xlsx'

export default function MisCotizaciones() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [sortBy, setSortBy] = useState('dateDesc') // 'dateDesc', 'dateAsc', 'priceDesc', 'priceAsc'
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'table' or 'cards'

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await fetch('/api/mis-cotizaciones')
        if (res.ok) {
          const data = await res.json()
          setQuotes(data)
        } else if (res.status === 401) {
          setError('Debes iniciar sesión para ver tu historial de cotizaciones.')
        } else {
          setError('No se pudieron cargar tus cotizaciones.')
        }
      } catch (err) {
        console.error('Error fetching user quotes:', err)
        setError('No se pudieron cargar tus cotizaciones.')
      } finally {
        setLoading(false)
      }
    }

    fetchQuotes()
  }, [])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount || 0)

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', label: 'Aprobada' }
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: 'Rechazada' }
      case 'sent':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', label: 'Enviada' }
      case 'pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', label: 'Pendiente' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', label: status || 'Sin estado' }
    }
  }

  const filteredAndSortedQuotes = quotes
    .filter((quote) => {
      // Filtro de búsqueda
      const matchesSearch = !searchQuery || 
        quote.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (quote.name && quote.name.toLowerCase().includes(searchQuery.toLowerCase()))
      
      // Filtro de estado
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter
      
      // Filtro de fecha
      const quoteDate = new Date(quote.createdAt)
      const matchesDateFrom = !dateFrom || quoteDate >= new Date(dateFrom)
      const matchesDateTo = !dateTo || quoteDate <= new Date(dateTo + 'T23:59:59')
      
      // Filtro de precio
      const matchesPriceMin = !priceMin || quote.total >= parseFloat(priceMin)
      const matchesPriceMax = !priceMax || quote.total <= parseFloat(priceMax)
      
      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesPriceMin && matchesPriceMax
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'dateAsc':
          return new Date(a.createdAt) - new Date(b.createdAt)
        case 'dateDesc':
          return new Date(b.createdAt) - new Date(a.createdAt)
        case 'priceAsc':
          return (a.total || 0) - (b.total || 0)
        case 'priceDesc':
          return (b.total || 0) - (a.total || 0)
        default:
          return new Date(b.createdAt) - new Date(a.createdAt)
      }
    })

  const stats = {
    total: quotes.length,
    totalAmount: quotes.reduce((sum, q) => sum + (q.total || 0), 0),
    approved: quotes.filter(q => q.status === 'approved' || q.status === 'completed').length,
    pending: quotes.filter(q => q.status === 'pending' || q.status === 'sent').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
  }

  const exportToExcel = () => {
    const data = filteredAndSortedQuotes.map((quote, index) => ({
      'N°': index + 1,
      'N° Cotización': `#${quote.id.slice(0, 8).toUpperCase()}`,
      'Fecha': formatDate(quote.createdAt),
      'Cliente': quote.name || 'N/A',
      'Email': quote.email || 'N/A',
      'Teléfono': quote.phone || 'N/A',
      'Total': quote.total || 0,
      'Estado': getStatusColor(quote.status).label,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Mis Cotizaciones')
    XLSX.writeFile(wb, `mis-cotizaciones-${new Date().toISOString().split('T')[0]}.xlsx`)
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
      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, pageWidth, 30, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('CORPORACIÓN GRC', pageWidth - margin, 12, { align: 'right' })
      doc.setFontSize(14)
      doc.text('Mis Cotizaciones', pageWidth - margin, 20, { align: 'right' })
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
      doc.text(`Total de cotizaciones: ${filteredAndSortedQuotes.length}`, margin, yPos)
      yPos += 6
      doc.text(`Total: ${formatCurrency(stats.totalAmount)}`, margin, yPos)
      yPos += 10

      // Tabla
      const colWidths = [15, 50, 30, 30, 30]
      const colHeaders = ['N°', 'N° Cotización', 'Fecha', 'Total', 'Estado']
      const colX = [
        margin,
        margin + colWidths[0],
        margin + colWidths[0] + colWidths[1],
        margin + colWidths[0] + colWidths[1] + colWidths[2],
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
      ]

      // Encabezado de tabla
      doc.setFillColor(59, 130, 246)
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
      filteredAndSortedQuotes.forEach((quote, index) => {
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
        doc.text(`#${quote.id.slice(0, 8).toUpperCase()}`, colX[1] + 2, yPos)
        doc.text(formatDate(quote.createdAt), colX[2] + 2, yPos)
        doc.text(`S/. ${(quote.total || 0).toFixed(2)}`, colX[3] + 2, yPos)
        doc.text(getStatusColor(quote.status).label, colX[4] + 2, yPos)
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
      a.download = `mis-cotizaciones-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al generar reporte PDF')
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
    setPriceMin('')
    setPriceMax('')
  }

  return (
    <>
      <Head>
        <title>Mis Cotizaciones - Ferretería</title>
      </Head>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20 pb-8 bg-gray-100">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-4 text-gray-900 text-center">Mis Cotizaciones</h1>
            <p className="text-gray-600 mb-6 text-center">
              Aquí puedes ver el historial de cotizaciones que has enviado desde tu cuenta.
            </p>

            {/* Estadísticas con colores como admin */}
            {!loading && !error && quotes.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-300 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-blue-800 text-xs font-semibold">Total</span>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                      <FiFileText className="text-white" size={16} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-green-800 text-xs font-semibold">Total Monto</span>
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                      <FiDollarSign className="text-white" size={16} />
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-900">{formatCurrency(stats.totalAmount)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 border-2 border-emerald-300 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-emerald-800 text-xs font-semibold">Aprobadas</span>
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                      <FiCheckCircle className="text-white" size={16} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">{stats.approved}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 border-2 border-yellow-300 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-yellow-800 text-xs font-semibold">Pendientes</span>
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
                      <FiClock className="text-white" size={16} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
                </div>
              </div>
            )}

            {/* Filtros y Controles */}
            {!loading && !error && quotes.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-6 overflow-hidden">
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <FiFilter size={16} className="text-gray-600" />
                      <h2 className="text-sm font-bold text-gray-800">Filtros</h2>
                    </div>
                    
                    {/* Búsqueda */}
                    <div className="relative flex-1 min-w-[200px]">
                      <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Buscar por número de cotización..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    {/* Ordenar */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="dateDesc">Fecha: Más recientes</option>
                      <option value="dateAsc">Fecha: Más antiguas</option>
                      <option value="priceDesc">Precio: Mayor a menor</option>
                      <option value="priceAsc">Precio: Menor a mayor</option>
                    </select>

                    {/* Botones de vista */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title="Vista de tabla"
                      >
                        <FiList size={16} />
                      </button>
                      <button
                        onClick={() => setViewMode('cards')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title="Vista de cards"
                      >
                        <FiGrid size={16} />
                      </button>
                    </div>

                    {/* Botones */}
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      {showFilters ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      Más filtros
                    </button>

                    {(searchQuery || statusFilter !== 'all' || dateFrom || dateTo || priceMin || priceMax) && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <FiX size={16} />
                        Limpiar
                      </button>
                    )}

                    {/* Exportar */}
                    <div className="flex gap-2">
                      <button
                        onClick={exportToExcel}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <FiDownload size={16} />
                        Excel
                      </button>
                      <button
                        onClick={exportToPDF}
                        className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <FiFileText size={16} />
                        PDF
                      </button>
                    </div>
                  </div>

                  {/* Filtros expandibles */}
                  {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="all">Todos</option>
                          <option value="pending">Pendiente</option>
                          <option value="sent">Enviada</option>
                          <option value="approved">Aprobada</option>
                          <option value="completed">Completada</option>
                          <option value="rejected">Rechazada</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Precio Mínimo (S/.)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={priceMin}
                          onChange={(e) => setPriceMin(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Precio Máximo (S/.)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Contador */}
                  <div className="flex items-center justify-between text-xs text-gray-600 pt-3 mt-3 border-t border-gray-200">
                    <span>
                      Mostrando {filteredAndSortedQuotes.length} de {quotes.length} cotizaciones
                    </span>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando tus cotizaciones...</p>
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            ) : quotes.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600 mb-2">Aún no tienes cotizaciones registradas.</p>
                <a
                  href="/productos"
                  className="inline-block mt-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Ver Productos
                </a>
              </div>
            ) : viewMode === 'table' ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <FiFileText size={14} />
                            N° Cotización
                          </div>
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <FiCalendar size={14} />
                            Fecha
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                          <div className="flex items-center justify-center gap-2">
                            <FiDollarSign size={14} />
                            Total
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedQuotes.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center">
                            <FiFileText className="mx-auto text-gray-400 mb-3" size={48} />
                            <p className="text-gray-600 text-lg">No se encontraron cotizaciones</p>
                            <p className="text-gray-500 text-sm mt-2">Intenta ajustar los filtros</p>
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedQuotes.map((quote, index) => {
                          const statusStyle = getStatusColor(quote.status)
                          const quoteNumber = quote.quoteNumber 
                            ? String(quote.quoteNumber).padStart(7, '0')
                            : quote.id.slice(0, 8).toUpperCase()
                          return (
                            <tr 
                              key={quote.id} 
                              className={`transition-colors ${
                                index % 2 === 0 
                                  ? 'bg-white hover:bg-blue-50' 
                                  : 'bg-gray-50 hover:bg-blue-50'
                              }`}
                            >
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FiFileText size={14} className="text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-gray-900">#{quoteNumber}</div>
                                    {quote.quoteNumber && (
                                      <div className="text-xs text-gray-500 font-mono">ID: {quote.id.slice(0, 8)}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-700 flex items-center gap-2">
                                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <FiCalendar size={14} className="text-purple-600" />
                                  </div>
                                  <span className="font-medium">{formatDate(quote.createdAt)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                    <FiDollarSign size={14} className="text-green-600" />
                                  </div>
                                  <span className="text-base font-bold text-green-600">
                                    {formatCurrency(quote.total)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border-2 shadow-sm ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                                  {statusStyle.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <a
                                  href={`/api/cotizaciones/${quote.id}/pdf`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg"
                                >
                                  <FiFileText size={14} />
                                  Ver PDF
                                </a>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedQuotes.length === 0 ? (
                  <div className="col-span-full bg-white rounded-lg shadow-lg p-12 text-center border border-gray-200">
                    <FiFileText className="mx-auto text-gray-400 mb-3" size={48} />
                    <p className="text-gray-600 text-lg">No se encontraron cotizaciones</p>
                    <p className="text-gray-500 text-sm mt-2">Intenta ajustar los filtros</p>
                  </div>
                ) : (
                  filteredAndSortedQuotes.map((quote) => {
                    const statusStyle = getStatusColor(quote.status)
                    const quoteNumber = quote.quoteNumber 
                      ? String(quote.quoteNumber).padStart(7, '0')
                      : quote.id.slice(0, 8).toUpperCase()
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
                                  <FiFileText size={18} />
                                </div>
                                <div>
                                  <h3 className="font-bold text-sm">Cotización</h3>
                                  <p className="text-xs text-blue-100 font-mono">#{quoteNumber}</p>
                                </div>
                              </div>
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-md ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} flex items-center gap-1`}>
                                {statusStyle.label}
                              </span>
                            </div>
                            <div className="text-2xl font-bold mt-2">
                              {formatCurrency(quote.total)}
                            </div>
                          </div>
                        </div>

                        {/* Contenido de la Card */}
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FiCalendar size={16} className="text-gray-400" />
                            <span>{formatDate(quote.createdAt)}</span>
                          </div>
                          
                          <div className="pt-3 border-t">
                            <a
                              href={`/api/cotizaciones/${quote.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                            >
                              <FiFileText size={16} />
                              Ver PDF
                            </a>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}






