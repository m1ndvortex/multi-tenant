import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
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
import OnlineUsersMonitor from '@/pages/OnlineUsersMonitor';
import { useEffect } from 'react';

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

// App Content Component with Theme Context
const AppContent = () => {
  const { isRTL, actualTheme } = useTheme();

  useEffect(() => {
    // Apply theme-specific fonts
    if (actualTheme === 'cyber') {
      // Load cybersecurity fonts
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700;800;900&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, [actualTheme]);

  const getBackgroundClass = () => {
    switch (actualTheme) {
      case 'cyber':
        return 'min-h-screen bg-cyber-bg-primary bg-cyber-grid';
      case 'dark':
        return 'min-h-screen bg-gradient-to-br from-gray-900 to-gray-800';
      default:
        return 'min-h-screen bg-gradient-to-br from-slate-50 to-slate-100';
    }
  };

  return (
    <Router>
      <motion.div 
        className={getBackgroundClass()}
        dir={isRTL ? 'rtl' : 'ltr'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          <Routes>
            {/* Public route */}
            <Route 
              path="/login" 
              element={
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Login />
                </motion.div>
              } 
            />
            
            {/* Protected routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <NavigationProvider>
                  <Layout>
                    <AnimatePresence mode="wait">
                      <Routes>
                        <Route 
                          path="/" 
                          element={
                            <motion.div
                              key="dashboard"
                              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: isRTL ? -100 : 100 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Dashboard />
                            </motion.div>
                          } 
                        />
                        <Route 
                          path="/tenants" 
                          element={
                            <motion.div
                              key="tenants"
                              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: isRTL ? -100 : 100 }}
                              transition={{ duration: 0.3 }}
                            >
                              <TenantManagement />
                            </motion.div>
                          } 
                        />
                        <Route 
                          path="/subscriptions" 
                          element={
                            <motion.div
                              key="subscriptions"
                              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: isRTL ? -100 : 100 }}
                              transition={{ duration: 0.3 }}
                            >
                              <SubscriptionManagement />
                            </motion.div>
                          } 
                        />
                        <Route 
                          path="/analytics" 
                          element={
                            <motion.div
                              key="analytics"
                              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: isRTL ? -100 : 100 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Analytics />
                            </motion.div>
                          } 
                        />
                        <Route 
                          path="/system-health" 
                          element={
                            <motion.div
                              key="system-health"
                              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: isRTL ? -100 : 100 }}
                              transition={{ duration: 0.3 }}
                            >
                              <SystemHealth />
                            </motion.div>
                          } 
                        />
                        <Route 
                          path="/backup-recovery" 
                          element={
                            <motion.div
                              key="backup-recovery"
                              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: isRTL ? -100 : 100 }}
                              transition={{ duration: 0.3 }}
                            >
                              <BackupRecovery />
                            </motion.div>
                          } 
                        />
                        <Route 
                          path="/impersonation" 
                          element={
                            <motion.div
                              key="impersonation"
                              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: isRTL ? -100 : 100 }}
                              transition={{ duration: 0.3 }}
                            >
                              <UserImpersonation />
                            </motion.div>
                          } 
                        />
                        <Route 
                          path="/error-logging" 
                          element={
                            <motion.div
                              key="error-logging"
                              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: isRTL ? -100 : 100 }}
                              transition={{ duration: 0.3 }}
                            >
                              <ErrorLogging />
                            </motion.div>
                          } 
                        />
                        <Route 
                          path="/online-users" 
                          element={
                            <motion.div
                              key="online-users"
                              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: isRTL ? -100 : 100 }}
                              transition={{ duration: 0.3 }}
                            >
                              <OnlineUsersMonitor />
                            </motion.div>
                          } 
                        />
                      </Routes>
                    </AnimatePresence>
                  </Layout>
                </NavigationProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </AnimatePresence>
        <Toaster />
      </motion.div>
    </Router>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;