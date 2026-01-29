import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from 'sonner';
import { Dashboard } from '@/pages/Dashboard';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { ProductList } from '@/pages/inventory/ProductList';
import { ListglobalProduits } from '@/pages/inventory/ListglobalProduits';
import { CategoryPage } from '@/pages/inventory/CategoryPage';
import { POS } from '@/pages/sales/POS';
import { useAuthStore } from '@/store/authStore';
import { ContactsPage } from '@/pages/contacts/ContactsPage';
import { FinancePage } from '@/pages/finance/FinancePage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { StockMovementsPage } from '@/pages/inventory/StockMovementsPage';
import { InventoryByPOS } from '@/pages/inventory/InventoryByPOS';
import { GlobalStockDashboard } from '@/pages/inventory/GlobalStockDashboard';
import { InvoicesPage } from '@/pages/sales/InvoicesPage';
import { QuotesPage } from '@/pages/sales/QuotesPage';
import { QuoteForm } from '@/pages/sales/QuoteForm';
import { PurchasesPage } from '@/pages/purchases/PurchasesPage';
import { PointsOfSalePage } from '@/pages/sales/PointsOfSalePage';
import { InvoiceForm } from '@/pages/sales/InvoiceForm';
import { InvoiceDetailsPage } from '@/pages/sales/InvoiceDetailsPage';
import { QuoteDetailsPage } from '@/pages/sales/QuoteDetailsPage';
import { OrderDetailsPage } from '@/pages/sales/OrderDetailsPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { FinanceReports } from '@/pages/reports/FinanceReports';
import { AdvancedAnalytics } from '@/pages/reports/AdvancedAnalytics';
import { NotificationPage } from '@/pages/notifications/NotificationPage';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Router>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/" />} />
        
        <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/list-global-produits" element={<ListglobalProduits />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/categories" element={<CategoryPage />} />
          <Route path="/stock-movements" element={<StockMovementsPage />} />
          <Route path="/inventory/by-pos" element={<InventoryByPOS />} />
          <Route path="/inventory/global-dashboard" element={<GlobalStockDashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<InvoiceForm />} />
          <Route path="/invoices/:id" element={<InvoiceDetailsPage />} />
          <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
          <Route path="/quotes" element={<QuotesPage />} />
          <Route path="/quotes/new" element={<QuoteForm />} />
          <Route path="/quotes/:id" element={<QuoteDetailsPage />} />
          <Route path="/quotes/:id/edit" element={<QuoteForm />} />
          <Route path="/orders/:id" element={<OrderDetailsPage />} />
          <Route path="/points-of-sale" element={<PointsOfSalePage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/finance" element={<FinanceReports />} />
          <Route path="/reports/analytics" element={<AdvancedAnalytics />} />
          <Route path="/notifications" element={<NotificationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
           {/* Redirections pour les anciens chemins et liens profonds non gérés */}
          <Route path="/inventory" element={<Navigate to="/products" replace />} />
          <Route path="/stock" element={<Navigate to="/stock-movements" replace />} />
          <Route path="/sales" element={<Navigate to="/pos" replace />} />
           <Route path="/sales/locations" element={<Navigate to="/points-of-sale" replace />} />
           <Route path="/products/:id" element={<Navigate to="/products" replace />} />

          {/* Redirection par défaut pour tout chemin non trouvé (évite les pages blanches) */}
          <Route path="*" element={<Navigate to="/reports/analytics" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
