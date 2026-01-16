import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Login } from '@/pages/Login';
import { ProductList } from '@/pages/inventory/ProductList';
import { CategoryPage } from '@/pages/inventory/CategoryPage';
import { POS } from '@/pages/sales/POS';

import { useAuthStore } from '@/store/authStore';

import { ContactsPage } from '@/pages/contacts/ContactsPage';
import { FinancePage } from '@/pages/finance/FinancePage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { StockMovementsPage } from '@/pages/inventory/StockMovementsPage';
import { InvoicesPage } from '@/pages/sales/InvoicesPage';
import { QuotesPage } from '@/pages/sales/QuotesPage';
import { PurchasesPage } from '@/pages/purchases/PurchasesPage';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<ProductList />} />
          <Route path="/categories" element={<CategoryPage />} />
          <Route path="/stock" element={<StockMovementsPage />} />
          <Route path="/sales" element={<POS />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/quotes" element={<QuotesPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
