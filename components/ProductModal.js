import { useEffect, useState } from 'react'
import Image from 'next/image'
import { FiX } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'

export default function ProductModal({ product, onClose, onAddToCart }) {
  const { isAuthenticated } = useAuth()
  const [imageError, setImageError] = useState(false)

  // Cerrar modal con ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    // Prevenir scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn"
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div
        className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden relative shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          zIndex: 10000,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Botón cerrar mejorado */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-white hover:bg-red-50 rounded-full p-2.5 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-110 border-2 border-gray-200 hover:border-red-300"
          aria-label="Cerrar"
        >
          <FiX size={22} className="text-gray-700 hover:text-red-600 transition-colors" />
        </button>

        <div className="grid md:grid-cols-2 gap-0 h-full">
          {/* Imagen del producto - Lado izquierdo */}
          <div className="relative w-full h-64 md:h-[90vh] bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
            {product.image && !imageError ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain p-6"
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                <div className="text-center">
                  <div className="text-7xl mb-3 opacity-50">📦</div>
                  <div className="text-base font-medium text-gray-500">Sin imagen</div>
                </div>
              </div>
            )}
          </div>

          {/* Información del producto - Lado derecho */}
          <div className="flex flex-col justify-between p-8 md:p-10 overflow-y-auto">
            <div>
              {/* Título */}
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {product.name}
              </h2>

              {/* Descripción */}
              {product.description && (
                <p className="text-gray-600 mb-6 leading-relaxed text-base">
                  {product.description}
                </p>
              )}

              {/* Categoría y Stock en línea */}
              <div className="flex flex-wrap gap-3 mb-6">
                {product.category && (
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold border border-green-200">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {product.category}
                  </span>
                )}

                {product.stock !== undefined && (
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 ${
                    product.stock > 10
                      ? 'bg-green-50 text-green-800 border-green-300'
                      : product.stock > 0
                      ? 'bg-orange-50 text-orange-800 border-orange-300'
                      : 'bg-red-50 text-red-800 border-red-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      product.stock > 10 ? 'bg-green-500' : product.stock > 0 ? 'bg-orange-500' : 'bg-red-500'
                    }`}></span>
                    {product.stock > 0 ? `${product.stock} unidades disponibles` : 'Agotado'}
                  </span>
                )}
              </div>
            </div>

            {/* Precio y botón - Parte inferior */}
            {isAuthenticated && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="mb-6">
                  <span className="text-sm text-gray-500 uppercase tracking-wider font-medium block mb-2">Precio</span>
                  <span className="text-5xl font-bold text-green-600">
                    S/. {product.price.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    onAddToCart()
                    onClose()
                  }}
                  className="w-full bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-500 hover:via-emerald-500 hover:to-green-500 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Agregar al Carrito
                </button>
              </div>
            )}

            {!isAuthenticated && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-gray-700 font-medium">
                    Inicia sesión para ver precios y agregar al carrito
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
