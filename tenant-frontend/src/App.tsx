import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Layout from '@/components/Layout';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import Dashboard from '@/pages/Dashboard';
import Invoices from '@/pages/Invoices';
import Customers from '@/pages/Customers';
import Products from '@/pages/Products';
import Accounting from '@/pages/Accounting';
import Reports from '@/pages/Reports';
import Notifications from '@/pages/Notifications';
import Settings from '@/pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <Router>
              <ImpersonationBanner />
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/invoices/*" element={<Invoices />} />
                  <Route path="/customers/*" element={<Customers />} />
                  <Route path="/products/*" element={<Products />} />
                  <Route path="/accounting/*" element={<Accounting />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings/*" element={<Settings />} />
                </Routes>
              </Layout>
              <Toaster />
            </Router>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;