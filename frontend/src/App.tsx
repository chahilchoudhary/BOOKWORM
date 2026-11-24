import { Link, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Protected } from './components/Protected';
import { Empty } from './components/ui';
import { AuthorPage, WishlistPage, WritersPage } from './pages/AuthorsWishlist';
import { BookPage } from './pages/BookPage';
import { CartPage } from './pages/CartPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { HomePage } from './pages/HomePage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { OrdersPage } from './pages/OrdersPage';
import { PaymentPage } from './pages/PaymentPage';

export function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/books/:id" element={<BookPage />} />
          <Route path="/authors/:id" element={<AuthorPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cart" element={<Protected><CartPage /></Protected>} />
          <Route path="/payment" element={<Protected><PaymentPage /></Protected>} />
          <Route path="/confirmation/:id" element={<Protected><ConfirmationPage /></Protected>} />
          <Route path="/orders" element={<Protected><OrdersPage /></Protected>} />
          <Route path="/wishlist" element={<Protected><WishlistPage /></Protected>} />
          <Route path="/writers" element={<Protected><WritersPage /></Protected>} />
          <Route
            path="*"
            element={
              <Empty title="Page not found" hint="The page you are looking for does not exist.">
                <Link to="/" className="btn-primary">Back to home</Link>
              </Empty>
            }
          />
        </Routes>
      </main>
    </>
  );
}
