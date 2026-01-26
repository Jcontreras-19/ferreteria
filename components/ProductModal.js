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
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors shadow-lg"
          aria-label="Cerrar"
        >
          <FiX size={24} className="text-gray-600" />
        </button>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Imagen del producto */}
          <div className="relative w-full h-64 md:h-96 bg-gray-100 rounded-xl overflow-hidden">
            {product.image && !imageError ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-2">📦</div>
                  <div className="text-sm">Sin imagen</div>
                </div>
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div className="flex flex-col justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {product.name}
              </h2>

              {product.description && (
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {product.description}
                </p>
              )}

              {product.category && (
                <div className="mb-4">
                  <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {product.category}
                  </span>
                </div>
              )}

              {product.stock !== undefined && (
                <div className="mb-6">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    product.stock > 10
                      ? 'bg-green-100 text-green-800'
                      : product.stock > 0
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.stock > 0 ? `${product.stock} unidades disponibles` : 'Agotado'}
                  </span>
                </div>
              )}
            </div>

            {/* Precio y botón */}
            {isAuthenticated && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Precio</span>
                    <span className="text-4xl font-bold text-green-600">
                      S/. {product.price.toFixed(2)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onAddToCart()
                    onClose()
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-green-500/50 transform hover:scale-105 active:scale-95"
                >
                  Agregar al Carrito
                </button>
              </div>
            )}

            {!isAuthenticated && (
              <div className="border-t pt-6">
                <p className="text-gray-600 text-center">
                  Inicia sesión para ver precios y agregar al carrito
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
