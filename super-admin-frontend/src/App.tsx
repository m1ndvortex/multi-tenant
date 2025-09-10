import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import TenantManagement from '@/pages/TenantManagement';
import Analytics from '@/pages/Analytics';
import SystemHealth from '@/pages/SystemHealth';
import BackupRecovery from '@/pages/BackupRecovery';
import UserImpersonation from '@/pages/UserImpersonation';
import ErrorLogging from '@/pages/ErrorLogging';
import SubscriptionManagement from '@/pages/SubscriptionManagement';

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
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
              <Routes>
                {/* Public route */}
                <Route path="/login" element={<Login />} />
                
                {/* Protected routes */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <NavigationProvider>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/tenants" element={<TenantManagement />} />
                          <Route path="/subscriptions" element={<SubscriptionManagement />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/system-health" element={<SystemHealth />} />
                          <Route path="/backup-recovery" element={<BackupRecovery />} />
                          <Route path="/impersonation" element={<UserImpersonation />} />
                          <Route path="/error-logging" element={<ErrorLogging />} />
                        </Routes>
                      </Layout>
                    </NavigationProvider>
                  </ProtectedRoute>
                } />
              </Routes>
              <Toaster />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;