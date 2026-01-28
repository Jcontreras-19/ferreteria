import { useState, useEffect } from 'react'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  FiCalendar, FiClock, FiMail, FiPlus, FiEdit, FiTrash2, 
  FiCheckCircle, FiXCircle, FiFileText, FiX, FiSend, FiUser, FiEye
} from 'react-icons/fi'

export default function ReportesProgramados() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  // Función para obtener fecha de hoy en formato YYYY-MM-DD (usando zona horaria local)
  const getTodayDate = () => {
    const today = new Date()
    // Usar componentes locales en lugar de UTC para evitar problemas de zona horaria
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState({
    email: '',
    sendDate: getTodayDate(), // Fecha de envío
    time: '18:00',
    dateFrom: getTodayDate(), // Rango de fechas del reporte
    dateTo: getTodayDate()
  })
  const [notifications, setNotifications] = useState([])
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchSchedules()
    }
  }, [user])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
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

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/reportes/programaciones', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setSchedules(data)
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
      showNotification('Error al cargar programaciones', 'error')
    }
  }

  const showNotification = (message, type = 'success') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const handlePreviewPDF = async () => {
    // Validar que las fechas estén completas
    if (!formData.dateFrom || !formData.dateTo) {
      showNotification('Por favor completa las fechas antes de previsualizar', 'error')
      return
    }

    // Validar que fecha hasta no sea menor que fecha desde
    if (new Date(formData.dateTo) < new Date(formData.dateFrom)) {
      showNotification('La fecha "Hasta" no puede ser anterior a "Desde"', 'error')
      return
    }

    setLoadingPreview(true)
    try {
      const res = await fetch('/api/reportes/generar-resumen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          periodType: 'daily', // Valor por defecto para el PDF
          startDate: formData.dateFrom,
          endDate: formData.dateTo
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Error al generar el PDF' }))
        showNotification(errorData.error || 'Error al generar la previsualización', 'error')
        return
      }

      // Convertir la respuesta del PDF a blob y crear URL
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setPdfPreviewUrl(url)
      setShowPdfPreview(true)
    } catch (error) {
      console.error('Error generando preview:', error)
      showNotification('Error al generar la previsualización del PDF', 'error')
    } finally {
      setLoadingPreview(false)
    }
  }

  const closePdfPreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl)
      setPdfPreviewUrl(null)
    }
    setShowPdfPreview(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingSchedule
        ? `/api/reportes/programaciones/${editingSchedule.id}`
        : '/api/reportes/programaciones'
      const method = editingSchedule ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        showNotification(
          editingSchedule 
            ? 'Programación actualizada exitosamente' 
            : 'Programación creada exitosamente',
          'success'
        )
        setShowModal(false)
        setEditingSchedule(null)
        setFormData({ email: '', sendDate: getTodayDate(), time: '18:00', dateFrom: getTodayDate(), dateTo: getTodayDate() })
        fetchSchedules()
      } else {
        const data = await res.json()
        showNotification(data.error || 'Error al guardar programación', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      showNotification('Error al guardar programación', 'error')
    }
  }

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule)
    const dateFrom = schedule.dateFrom 
      ? new Date(schedule.dateFrom).toISOString().split('T')[0]
      : getTodayDate()
    const dateTo = schedule.dateTo
      ? new Date(schedule.dateTo).toISOString().split('T')[0]
      : getTodayDate()
    const sendDate = schedule.sendDate || schedule.createdAt
      ? new Date(schedule.sendDate || schedule.createdAt).toISOString().split('T')[0]
      : getTodayDate()
    
    setFormData({
      email: schedule.email,
      sendDate: sendDate,
      time: schedule.time,
      dateFrom: dateFrom,
      dateTo: dateTo
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta programación?')) return

    try {
      const res = await fetch(`/api/reportes/programaciones/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (res.ok) {
        showNotification('Programación eliminada exitosamente', 'success')
        fetchSchedules()
      } else {
        const data = await res.json()
        showNotification(data.error || 'Error al eliminar programación', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      showNotification('Error al eliminar programación', 'error')
    }
  }

  const handleToggleActive = async (schedule) => {
    try {
      const res = await fetch(`/api/reportes/programaciones/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !schedule.isActive })
      })

      if (res.ok) {
        showNotification(
          schedule.isActive 
            ? 'Programación desactivada' 
            : 'Programación activada',
          'success'
        )
        fetchSchedules()
      } else {
        const data = await res.json()
        showNotification(data.error || 'Error al actualizar programación', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      showNotification('Error al actualizar programación', 'error')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    
    // Si es un string ISO (YYYY-MM-DD), formatearlo directamente sin conversión de zona horaria
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [year, month, day] = dateString.split('T')[0].split('-')
      return `${day}/${month}/${year}`
    }
    
    // Si es una fecha completa (Date object o ISO string con hora)
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'N/A'
    
    // Obtener los componentes de la fecha en UTC para evitar problemas de zona horaria
    // Esto asegura que la fecha mostrada sea la misma que se ingresó
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    
    return `${day}/${month}/${year}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Reportes Programados - Admin</title>
      </Head>
      <AdminLayout user={user}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reportes Programados</h1>
              <p className="text-gray-600 mt-1">Gestiona los envíos automáticos de reportes de cotizaciones</p>
            </div>
            <button
              onClick={() => {
                setEditingSchedule(null)
                setFormData({ 
                  email: '', 
                  sendDate: getTodayDate(), 
                  time: '18:00',
                  dateFrom: getTodayDate(),
                  dateTo: getTodayDate()
                })
                setShowModal(true)
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <FiPlus size={18} />
              </div>
              Nueva Programación
            </button>
          </div>

          {/* Lista de programaciones */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {schedules.length === 0 ? (
              <div className="p-12 text-center">
                <FiFileText size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg">No hay programaciones configuradas</p>
                <p className="text-gray-500 text-sm mt-2">Crea una nueva programación para comenzar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-green-600 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha Envío</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Hora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Último Envío</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {schedules.map((schedule) => (
                      <tr key={schedule.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FiMail className="text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{schedule.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FiCalendar className="text-gray-400" />
                            <span className="text-sm text-gray-900">{formatDate(schedule.sendDate || schedule.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FiClock className="text-gray-400" />
                            <span className="text-sm text-gray-900">{schedule.time}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(schedule)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              schedule.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {schedule.isActive ? (
                              <>
                                <FiCheckCircle size={14} />
                                Activo
                              </>
                            ) : (
                              <>
                                <FiXCircle size={14} />
                                Inactivo
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {schedule.lastSent
                            ? new Date(schedule.lastSent).toLocaleString('es-PE')
                            : 'Nunca'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(schedule)}
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <FiEdit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(schedule.id)}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                              title="Eliminar"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal para crear/editar programación - Diseño Mejorado y Responsive */}
          {showModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn overflow-y-auto">
              <div className="bg-white rounded-xl sm:rounded-2xl max-w-5xl w-full shadow-2xl border-2 border-gray-200 overflow-hidden animate-slideUp my-4 sm:my-8 max-h-[95vh] flex flex-col">
                {/* Header con Gradiente Responsive */}
                <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center ring-2 ring-white/30 flex-shrink-0">
                      <FiCalendar className="text-white" size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
                        {editingSchedule ? 'Editar Programación' : 'Nueva Programación'}
                      </h2>
                      <p className="text-green-100 text-xs sm:text-sm hidden sm:block">Configura el envío automático de reportes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      closePdfPreview()
                      setShowModal(false)
                      setEditingSchedule(null)
                      setFormData({ email: '', sendDate: getTodayDate(), time: '18:00', dateFrom: getTodayDate(), dateTo: getTodayDate() })
                    }}
                    className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110 ring-2 ring-white/30 flex-shrink-0 ml-2"
                  >
                    <FiX className="text-white" size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-white overflow-y-auto flex-1">
                  {/* Grid de 2 columnas en pantallas grandes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Columna Izquierda */}
                    <div className="space-y-4">
                      {/* Campo Email con Icono */}
                      <div className="bg-white rounded-lg sm:rounded-xl border-2 border-blue-200 shadow-sm p-3 sm:p-4">
                        <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 mb-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiMail className="text-blue-600" size={16} />
                          </div>
                          <span>Correo Electrónico</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 text-sm sm:text-base"
                            placeholder="ejemplo@correo.com"
                          />
                        </div>
                      </div>

                      {/* Campo Fecha de Envío con Icono */}
                      <div className="bg-white rounded-lg sm:rounded-xl border-2 border-purple-200 shadow-sm p-3 sm:p-4">
                        <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 mb-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiCalendar className="text-purple-600" size={16} />
                          </div>
                          <span>Fecha de Envío</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                          <input
                            type="date"
                            required
                            value={formData.sendDate}
                            onChange={(e) => setFormData({ ...formData, sendDate: e.target.value })}
                            min={getTodayDate()}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-gray-900 text-sm sm:text-base"
                          />
                        </div>
                        <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                          <FiSend size={12} />
                          Fecha en que se enviará el reporte
                        </p>
                      </div>

                      {/* Campo Hora con Icono */}
                      <div className="bg-white rounded-lg sm:rounded-xl border-2 border-orange-200 shadow-sm p-3 sm:p-4">
                        <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 mb-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiClock className="text-orange-600" size={16} />
                          </div>
                          <span>Hora de Envío</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="time"
                            required
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900 text-sm sm:text-base"
                          />
                        </div>
                        <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                          <FiSend size={12} />
                          El reporte se enviará automáticamente a esta hora
                        </p>
                      </div>
                    </div>

                    {/* Columna Derecha */}
                    <div className="space-y-4">
                      {/* Campos de Rango de Fechas del Reporte */}
                      <div className="bg-white rounded-lg sm:rounded-xl border-2 border-indigo-200 shadow-sm p-3 sm:p-4">
                        <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 mb-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiCalendar className="text-indigo-600" size={16} />
                          </div>
                          <span>Rango de Fechas del Reporte PDF</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Desde</label>
                            <div className="relative">
                              <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                              <input
                                type="date"
                                required
                                value={formData.dateFrom}
                                onChange={(e) => setFormData({ ...formData, dateFrom: e.target.value })}
                                className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Hasta</label>
                            <div className="relative">
                              <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                              <input
                                type="date"
                                required
                                value={formData.dateTo}
                                onChange={(e) => setFormData({ ...formData, dateTo: e.target.value })}
                                min={formData.dateFrom}
                                className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                          <FiClock size={12} />
                          Las fechas por defecto son el día de hoy
                        </p>
                      </div>

                      {/* Botón de Previsualización Responsive */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border-2 border-blue-200 p-3 sm:p-4">
                        <button
                          type="button"
                          onClick={handlePreviewPDF}
                          disabled={loadingPreview || !formData.dateFrom || !formData.dateTo}
                          className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                          {loadingPreview ? (
                            <>
                              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Generando PDF...</span>
                            </>
                          ) : (
                            <>
                              <FiEye size={18} />
                              <span>Previsualizar Reporte PDF</span>
                            </>
                          )}
                        </button>
                        <p className="text-xs text-blue-600 mt-2 text-center flex items-center justify-center gap-1">
                          <FiFileText size={12} />
                          Ver cómo se verá el reporte antes de programarlo
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botones con Diseño Mejorado Responsive */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t-2 border-gray-200 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        closePdfPreview()
                        setShowModal(false)
                        setEditingSchedule(null)
                        setFormData({ email: '', sendDate: getTodayDate(), time: '18:00', dateFrom: getTodayDate(), dateTo: getTodayDate() })
                      }}
                      className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all shadow-sm hover:shadow text-sm sm:text-base"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <FiCheckCircle size={18} />
                      {editingSchedule ? 'Actualizar' : 'Crear Programación'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal de Previsualización PDF */}
          {showPdfPreview && pdfPreviewUrl && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
              <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-white font-bold text-xl flex items-center gap-2">
                    <FiEye size={24} />
                    Previsualización del Reporte PDF
                  </h3>
                  <button
                    onClick={closePdfPreview}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110"
                  >
                    <FiX className="text-white" size={20} />
                  </button>
                </div>
                <div className="h-[calc(90vh-80px)] overflow-auto bg-gray-100 p-4">
                  <iframe
                    src={pdfPreviewUrl}
                    className="w-full h-full border-0 rounded-lg shadow-lg"
                    title="Vista previa del PDF"
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
                className={`px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 min-w-[300px] ${
                  notification.type === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                {notification.type === 'success' ? (
                  <FiCheckCircle size={20} />
                ) : (
                  <FiXCircle size={20} />
                )}
                <span className="flex-1 text-sm font-medium">{notification.message}</span>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="text-white hover:text-gray-200"
                >
                  <FiXCircle size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    </>
  )
}
