import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  FiCalendar, FiClock, FiMail, FiPlus, FiEdit, FiTrash2, 
  FiCheckCircle, FiXCircle, FiRefreshCw, FiFileText
} from 'react-icons/fi'

export default function ReportesProgramados() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    scheduleType: 'daily',
    time: '18:00'
  })
  const [notifications, setNotifications] = useState([])

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
        setFormData({ email: '', scheduleType: 'daily', time: '18:00' })
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
    setFormData({
      email: schedule.email,
      scheduleType: schedule.scheduleType,
      time: schedule.time
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

  const getScheduleTypeLabel = (type) => {
    const labels = {
      daily: 'Diario',
      weekly: 'Semanal',
      monthly: 'Mensual'
    }
    return labels[type] || type
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
      <AdminLayout>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reportes Programados</h1>
              <p className="text-gray-600 mt-1">Gestiona los envíos automáticos de reportes de cotizaciones</p>
            </div>
            <button
              onClick={() => {
                setEditingSchedule(null)
                setFormData({ email: '', scheduleType: 'daily', time: '18:00' })
                setShowModal(true)
              }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              <FiPlus size={20} />
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
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Tipo</th>
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
                            <span className="text-sm text-gray-900">{getScheduleTypeLabel(schedule.scheduleType)}</span>
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

          {/* Modal para crear/editar programación */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingSchedule ? 'Editar Programación' : 'Nueva Programación'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setEditingSchedule(null)
                      setFormData({ email: '', scheduleType: 'daily', time: '18:00' })
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Reporte *
                    </label>
                    <select
                      required
                      value={formData.scheduleType}
                      onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de Envío *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">La fecha se establece automáticamente según el tipo de reporte</p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingSchedule(null)
                        setFormData({ email: '', scheduleType: 'daily', time: '18:00' })
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                    >
                      {editingSchedule ? 'Actualizar' : 'Crear'}
                    </button>
                  </div>
                </form>
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
