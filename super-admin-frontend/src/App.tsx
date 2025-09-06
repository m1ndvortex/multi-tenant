import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import TenantManagement from '@/pages/TenantManagement';
import Analytics from '@/pages/Analytics';
import SystemHealth from '@/pages/SystemHealth';
import BackupRecovery from '@/pages/BackupRecovery';
import UserImpersonation from '@/pages/UserImpersonation';
import ErrorLogging from '@/pages/ErrorLogging';

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
          <NavigationProvider>
            <Router>
              <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/tenants" element={<TenantManagement />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/system-health" element={<SystemHealth />} />
                    <Route path="/backup-recovery" element={<BackupRecovery />} />
                    <Route path="/impersonation" element={<UserImpersonation />} />
                    <Route path="/error-logging" element={<ErrorLogging />} />
                  </Routes>
                </Layout>
                <Toaster />
              </div>
            </Router>
          </NavigationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;