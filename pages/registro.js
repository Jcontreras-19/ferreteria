import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'

export default function Registro() {
  const router = useRouter()
  const { cart, getTotal, clearCart } = useCart()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    ruc: '',
    businessName: '',
    address: '',
  })
  const [documentType, setDocumentType] = useState('boleta')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [quoteId, setQuoteId] = useState(null)

  // Obtener el tipo de documento del localStorage
  useEffect(() => {
    const savedDocumentType = localStorage.getItem('documentType')
    if (savedDocumentType) {
      setDocumentType(savedDocumentType)
    }
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validación
    if (!formData.name || !formData.email || !formData.whatsapp) {
      setError('Por favor completa todos los campos')
      setLoading(false)
      return
    }

    // Validación adicional para factura
    if (documentType === 'factura') {
      if (!formData.ruc || !formData.businessName || !formData.address) {
        setError('Para factura es necesario completar RUC, Razón Social y Dirección')
        setLoading(false)
        return
      }
      // Validar formato de RUC (11 dígitos en Perú)
      if (!/^\d{11}$/.test(formData.ruc.replace(/\D/g, ''))) {
        setError('El RUC debe tener 11 dígitos')
        setLoading(false)
        return
      }
    }

    if (cart.length === 0) {
      setError('Tu carrito está vacío')
      setLoading(false)
      return
    }

    try {
      // Determinar si el usuario es admin o cotizador
      const adminRoles = ['admin', 'superadmin', 'editor', 'viewer']
      const cotizadorRoles = ['cotizador', 'vendedor']
      const isAdminOrCotizador = user && (adminRoles.includes(user.role) || cotizadorRoles.includes(user.role))
      
      // Si es cliente, enviar al N8N. Si es admin/cotizador, NO enviar (solo cuando el admin autorice)
      const skipWebhook = isAdminOrCotizador

      const response = await fetch('/api/cotizacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          products: cart,
          total: getTotal(),
          documentType: documentType,
          skipWebhook: skipWebhook, // No enviar al webhook si es admin/cotizador
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setQuoteId(data.quoteId)
        clearCart()
      } else {
        setError(data.error || 'Error al enviar la cotización')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error al enviar la cotización. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (cart.length === 0) {
    return (
      <>
        <Head>
          <title>Registro - Ferretería</title>
        </Head>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 pt-20 pb-8">
            <div className="container mx-auto px-4 py-12">
              <div className="bg-white rounded-lg shadow-lg p-12 text-center max-w-md mx-auto">
                <p className="text-gray-600 text-xl mb-4">Tu carrito está vacío</p>
                <a
                  href="/productos"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
                >
                  Ver Productos
                </a>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Registro - Ferretería</title>
      </Head>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20 pb-8">
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6">Solicitar Cotización</h1>

            {success ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
                  <p className="font-semibold">¡Cotización enviada exitosamente!</p>
                  <p className="text-sm mt-1">
                    Te contactaremos pronto. Puedes descargar tu cotización en PDF.
                  </p>
                </div>
                <div className="flex gap-3">
                  <a
                    href={quoteId ? `/api/cotizaciones/${quoteId}/pdf` : '#'}
                    download
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors text-center"
                  >
                    📄 Descargar PDF
                  </a>
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Volver al Inicio
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Resumen del carrito */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                  <h2 className="text-xl font-bold mb-4 text-gray-800">Resumen de tu pedido</h2>
                  <div className="space-y-2 mb-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between text-gray-700">
                        <span>
                          {item.name} x{item.quantity}
                        </span>
                        <span>S/. {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-xl font-bold text-gray-800">
                      <span>Total:</span>
                      <span>S/. {getTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
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
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                        placeholder="Juan Pérez"
                      />
                    </div>

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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                        placeholder="juan@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="whatsapp" className="block text-gray-700 font-semibold mb-2">
                        WhatsApp *
                      </label>
                      <input
                        type="tel"
                        id="whatsapp"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                        placeholder="+1 234 567 890"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">
                        Tipo de Documento *
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDocumentType('boleta')
                            // Limpiar campos de factura al cambiar a boleta
                            setFormData({ ...formData, ruc: '', businessName: '', address: '' })
                          }}
                          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                            documentType === 'boleta'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Boleta
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocumentType('factura')}
                          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                            documentType === 'factura'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Factura
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {documentType === 'boleta' 
                          ? 'Boleta: Para consumo personal' 
                          : 'Factura: Requiere RUC para deducciones fiscales'}
                      </p>
                    </div>

                    {/* Campos adicionales para factura */}
                    {documentType === 'factura' && (
                      <>
                        <div>
                          <label htmlFor="ruc" className="block text-gray-700 font-semibold mb-2">
                            RUC (Registro Único de Contribuyente) *
                          </label>
                          <input
                            type="text"
                            id="ruc"
                            name="ruc"
                            value={formData.ruc}
                            onChange={(e) => {
                              // Solo permitir números y limitar a 11 dígitos
                              const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                              setFormData({ ...formData, ruc: value })
                            }}
                            required={documentType === 'factura'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            placeholder="20123456789"
                            maxLength={11}
                          />
                          <p className="text-xs text-gray-500 mt-1">11 dígitos sin guiones ni espacios</p>
                        </div>

                        <div>
                          <label htmlFor="businessName" className="block text-gray-700 font-semibold mb-2">
                            Razón Social *
                          </label>
                          <input
                            type="text"
                            id="businessName"
                            name="businessName"
                            value={formData.businessName}
                            onChange={handleChange}
                            required={documentType === 'factura'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            placeholder="Nombre de la empresa o razón social"
                          />
                        </div>

                        <div>
                          <label htmlFor="address" className="block text-gray-700 font-semibold mb-2">
                            Dirección Fiscal *
                          </label>
                          <input
                            type="text"
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            required={documentType === 'factura'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            placeholder="Calle, número, distrito, ciudad"
                          />
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition-colors"
                    >
                      {loading ? 'Enviando...' : 'Enviar Cotización'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}

