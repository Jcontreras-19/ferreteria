import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { FiUser, FiMail, FiPhone, FiLock, FiSave, FiArrowLeft } from 'react-icons/fi'

export default function Perfil() {
  const router = useRouter()
  const { user, checkAuth } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setLoading(false)
  }, [user, router])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      // Validar contraseña si se está cambiando
      if (formData.newPassword) {
        if (!formData.currentPassword) {
          setError('Debes ingresar tu contraseña actual para cambiarla')
          setSaving(false)
          return
        }
        if (formData.newPassword.length < 6) {
          setError('La nueva contraseña debe tener al menos 6 caracteres')
          setSaving(false)
          return
        }
        if (formData.newPassword !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden')
          setSaving(false)
          return
        }
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          currentPassword: formData.currentPassword || undefined,
          newPassword: formData.newPassword || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Datos actualizados exitosamente')
        setFormData({
          ...formData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
        // Actualizar el contexto de autenticación
        await checkAuth()
      } else {
        setError(data.error || 'Error al actualizar los datos')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error al actualizar los datos. Por favor intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Mi Perfil - Corporación GRC</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Mi Perfil - Corporación GRC</title>
      </Head>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20 pb-8">
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="flex items-center space-x-4 mb-6">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FiArrowLeft size={24} />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información Personal */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FiUser size={20} className="text-green-600" />
                    Información Personal
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                        style={{ color: '#111827' }}
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FiMail size={16} />
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">El email no se puede cambiar</p>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FiPhone size={16} />
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                        style={{ color: '#111827' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Cambiar Contraseña */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FiLock size={20} className="text-green-600" />
                    Cambiar Contraseña
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Contraseña Actual
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        placeholder="Solo si deseas cambiar la contraseña"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                        style={{ color: '#111827' }}
                      />
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Nueva Contraseña
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                        style={{ color: '#111827' }}
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar Nueva Contraseña
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Repite la nueva contraseña"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                        style={{ color: '#111827' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
                  >
                    <FiSave size={18} />
                    <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
