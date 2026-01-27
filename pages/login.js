import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'

export default function Login() {
  const router = useRouter()
  const { login } = useAuth()
  const [isLogin, setIsLogin] = useState(true) // true = login, false = registro
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isLogin) {
      // Iniciar sesión
      if (!formData.email || !formData.password) {
        setError('Por favor completa todos los campos')
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          // Actualizar el contexto de autenticación primero
          login(data.user)
          
          // Redirigir según el rol del usuario
          const userRole = data.user?.role
          const adminRoles = ['admin', 'superadmin', 'editor', 'viewer']
          const cotizadorRoles = ['cotizador', 'vendedor']
          
          // Redirigir inmediatamente según el rol
          if (adminRoles.includes(userRole)) {
            // Administradores van al panel de administración
            window.location.href = '/admin'
          } else if (cotizadorRoles.includes(userRole)) {
            // Cotizadores/Vendedores van al panel de cotizador
            window.location.href = '/cotizador'
          } else {
            // Clientes van a la página principal
            window.location.href = '/'
          }
        } else {
          setError(data.error || 'Credenciales inválidas')
        }
      } catch (error) {
        console.error('Error:', error)
        setError('Error al iniciar sesión. Por favor intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    } else {
      // Registro
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Por favor completa todos los campos')
        setLoading(false)
        return
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden')
        setLoading(false)
        return
      }

      if (formData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres')
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          // Redirigir a la página principal - el AuthContext detectará automáticamente la sesión
          window.location.href = '/'
        } else {
          setError(data.error || 'Error al crear la cuenta')
        }
      } catch (error) {
        console.error('Error:', error)
        setError('Error al crear la cuenta. Por favor intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <>
      <Head>
        <title>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'} - Ferretería</title>
      </Head>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20 pb-8">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-xl p-8">
              {/* Tabs */}
              <div className="flex mb-6 border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true)
                    setError('')
                    setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
                  }}
                  className={`flex-1 py-3 text-center font-semibold transition-colors ${
                    isLogin
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false)
                    setError('')
                    setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
                  }}
                  className={`flex-1 py-3 text-center font-semibold transition-colors ${
                    !isLogin
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>

              <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
                {isLogin ? 'Inicia Sesión' : 'Crea tu Cuenta'}
              </h1>

              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {!isLogin && (
                    <div>
                      <label htmlFor="name" className="block text-gray-700 font-semibold mb-2">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required={!isLogin}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                        placeholder="Juan Pérez"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                      placeholder="tu@email.com"
                    />
                  </div>

                  {!isLogin && (
                    <div>
                      <label htmlFor="phone" className="block text-gray-700 font-semibold mb-2">
                        Teléfono / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required={!isLogin}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                        placeholder="Ej. +51 987 654 321"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Usaremos este número para enviarte la cotización por WhatsApp
                      </p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">
                      Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <MdVisibilityOff size={24} /> : <MdVisibility size={24} />}
                      </button>
                    </div>
                  </div>

                  {!isLogin && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-gray-700 font-semibold mb-2">
                        Confirmar Contraseña *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required={!isLogin}
                          className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                          aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showConfirmPassword ? <MdVisibilityOff size={24} /> : <MdVisibility size={24} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    {loading
                      ? isLogin
                        ? 'Iniciando sesión...'
                        : 'Creando cuenta...'
                      : isLogin
                      ? 'Iniciar Sesión'
                      : 'Crear Cuenta'}
                  </button>
                </div>
              </form>

              {isLogin && (
                <p className="mt-4 text-center text-sm text-gray-600">
                  ¿No tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false)
                      setError('')
                      setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
                    }}
                    className="text-green-600 hover:text-green-700 font-semibold"
                  >
                    Regístrate aquí
                  </button>
                </p>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}

