import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Invoices from '@/pages/Invoices';
import Customers from '@/pages/Customers';
import Products from '@/pages/Products';
import Accounting from '@/pages/Accounting';
import Reports from '@/pages/Reports';
import Notifications from '@/pages/Notifications';
import Settings from '@/pages/Settings';
import Backup from '@/pages/Backup';

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
              <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white" dir="rtl">
                <Routes>
                  {/* Public route */}
                  <Route path="/login" element={<Login />} />
                  
                  {/* Protected routes */}
                  <Route path="/*" element={
                    <ProtectedRoute>
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
                          <Route path="/backup" element={<Backup />} />
                          <Route path="/settings/*" element={<Settings />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  } />
                </Routes>
                <Toaster />
              </div>
            </Router>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;