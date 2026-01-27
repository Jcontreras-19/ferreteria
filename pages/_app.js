import '../styles/globals.css'
import { CartProvider } from '../contexts/CartContext'
import { AuthProvider } from '../contexts/AuthContext'

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </AuthProvider>
  )
}

export default MyApp

