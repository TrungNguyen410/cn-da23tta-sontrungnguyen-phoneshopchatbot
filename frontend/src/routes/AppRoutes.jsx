import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AdminRoute from '../components/auth/AdminRoute';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Footer from '../components/common/Footer';
import Header from '../components/common/Header';
import Loading from '../components/common/Loading';
import RouteMeta from '../components/common/RouteMeta';
import SupportLauncher from '../components/common/SupportLauncher';
import AdminLayout from '../pages/admin/AdminLayout';

const Accessories = lazy(() => import('../pages/Accessories'));
const AccessoryDetail = lazy(() => import('../pages/AccessoryDetail'));
const Account = lazy(() => import('../pages/Account'));
const Cart = lazy(() => import('../pages/Cart'));
const Checkout = lazy(() => import('../pages/Checkout'));
const Contact = lazy(() => import('../pages/Contact'));
const Favorites = lazy(() => import('../pages/Favorites'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/Login'));
const NotFound = lazy(() => import('../pages/NotFound'));
const OrderSuccess = lazy(() => import('../pages/OrderSuccess'));
const OrderLookup = lazy(() => import('../pages/OrderLookup'));
const PaymentResult = lazy(() => import('../pages/PaymentResult'));
const PolicyPage = lazy(() => import('../pages/PolicyPage'));
const ProductDetail = lazy(() => import('../pages/ProductDetail'));
const ProductCompare = lazy(() => import('../pages/ProductCompare'));
const Products = lazy(() => import('../pages/Products'));
const Register = lazy(() => import('../pages/Register'));
const Reviews = lazy(() => import('../pages/Reviews'));
const AccessoryManagement = lazy(() => import('../pages/admin/AccessoryManagement'));
const BannerManagement = lazy(() => import('../pages/admin/BannerManagement'));
const BrandManagement = lazy(() => import('../pages/admin/BrandManagement'));
const CategoryManagement = lazy(() => import('../pages/admin/CategoryManagement'));
const ContactManagement = lazy(() => import('../pages/admin/ContactManagement'));
const CustomerManagement = lazy(() => import('../pages/admin/CustomerManagement'));
const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
const OrderManagement = lazy(() => import('../pages/admin/OrderManagement'));
const ProductManagement = lazy(() => import('../pages/admin/ProductManagement'));
const ReviewManagement = lazy(() => import('../pages/admin/ReviewManagement'));
const SettingManagement = lazy(() => import('../pages/admin/SettingManagement'));
const VoucherManagement = lazy(() => import('../pages/admin/VoucherManagement'));

function StoreLayout() {
  return (
    <div className="store-layout">
      <Header />
      <div className="store-content"><Outlet /></div>
      <Footer />
      <SupportLauncher />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading text="Đang tải trang..." />}>
      <RouteMeta />
      <Routes>
        <Route element={<StoreLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/compare" element={<ProductCompare />} />
          <Route path="/accessories" element={<Accessories />} />
          <Route path="/accessories/:id" element={<AccessoryDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/order-success/:orderId" element={<OrderSuccess />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/order-lookup" element={<OrderLookup />} />
          <Route path="/payment-result" element={<PaymentResult />} />
          <Route path="/policies/:type" element={<PolicyPage />} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/admin"
          element={<AdminRoute><AdminLayout /></AdminRoute>}
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="accessories" element={<AccessoryManagement />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="contacts" element={<ContactManagement />} />
          <Route path="reviews" element={<ReviewManagement />} />
          <Route path="banners" element={<BannerManagement />} />
          <Route path="vouchers" element={<VoucherManagement />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="brands" element={<BrandManagement />} />
          <Route path="settings" element={<SettingManagement />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
