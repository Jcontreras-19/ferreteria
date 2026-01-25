import { useState } from 'react'
import Image from 'next/image'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { FiEye } from 'react-icons/fi'
import ProductModal from './ProductModal'

export default function ProductCard({ product }) {
  const { addToCart } = useCart()
  const { isAuthenticated } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleAddToCart = () => {
    addToCart(product)
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-md hover:shadow-2xl overflow-hidden transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 group">
        {/* Imagen del producto */}
        <div className="relative w-full h-52 bg-gradient-to-br from-gray-50 to-white group overflow-hidden">
          {product.image && !imageError ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain transition-all duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
              onError={(e) => {
                console.error('Error cargando imagen:', product.image, e)
                setImageError(true)
              }}
              onLoad={() => {
                console.log('Imagen cargada exitosamente:', product.image)
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
              <div className="text-center">
                <div className="text-4xl mb-2">📦</div>
                <div className="text-xs">Sin imagen</div>
              </div>
            </div>
          )}
          {/* Overlay sutil en hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          {/* Botón de vista rápida */}
          <button
            onClick={() => setShowModal(true)}
            className="absolute top-3 right-3 bg-white hover:bg-green-600 text-gray-700 hover:text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl z-10 transform hover:scale-110"
            title="Vista rápida"
          >
            <FiEye size={18} />
          </button>
        </div>

        {/* Información del producto */}
        <div className="p-5 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-700 transition-colors">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
        {product.category && (
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
              {product.category}
            </span>
          </div>
        )}
        {isAuthenticated && (
          <div className="flex items-center justify-between mb-3 pt-3 border-t border-gray-100">
            <div>
              <p className="text-2xl font-bold text-green-600 mb-1">
                S/. {product.price.toFixed(2)}
              </p>
            </div>
            <button
              onClick={handleAddToCart}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-5 py-2.5 rounded-lg transition-all duration-300 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
            >
              Agregar
            </button>
          </div>
        )}
          {product.stock !== undefined && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Stock:</span>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                    product.stock > 20
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : product.stock > 10
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      : product.stock > 0
                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {product.stock > 0 ? (
                    <>
                      <span className="w-2 h-2 rounded-full mr-1.5 bg-current animate-pulse"></span>
                      {product.stock} unidades
                    </>
                  ) : (
                    'Agotado'
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalles del producto */}
      {showModal && (
        <ProductModal
          product={product}
          onClose={() => setShowModal(false)}
          onAddToCart={handleAddToCart}
        />
      )}
    </>
  )
}

