import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { useAnimations } from '@/hooks/useAnimations';
import SystemStatusIndicator from './SystemStatusIndicator';
import NotificationCenter from './NotificationCenter';
import QuickSearchModal from './QuickSearchModal';
import HeaderActions from './HeaderActions';

interface SuperAdminHeaderProps {
  className?: string;
}

const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({ className }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { data: dashboardStats } = useDashboardStats();
  const { stats: onlineData } = useOnlineUsers();
  const { cyber } = useAnimations();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+/ or Cmd+/ for search
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      // Escape to close modals
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <motion.header 
        className={cn(
          "glass-morphism border-b border-cyber-neon-primary/30 shadow-cyber-glass sticky top-0 z-40 relative overflow-hidden",
          className
        )}
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Animated background accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyber-neon-primary/5 via-transparent to-cyber-neon-secondary/5 pointer-events-none" />
        
        {/* Top neon accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-neon-primary/50 to-transparent" />

        <div className="px-6 py-4 relative">
          <div className="flex items-center justify-between">
            {/* Left Section - Branding and Navigation */}
            <div className="flex items-center gap-6">
              {/* Platform Branding */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to="/" className="flex items-center gap-3 group">
                  <motion.div 
                    className="w-10 h-10 bg-gradient-to-br from-cyber-neon-primary to-cyber-neon-secondary rounded-xl flex items-center justify-center shadow-neon-cyan group-hover:shadow-neon-green transition-all duration-cyber-normal relative overflow-hidden"
                    whileHover={{ 
                      boxShadow: "0 0 30px rgba(0, 255, 255, 0.6)",
                      rotate: [0, -5, 5, 0],
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Animated background pulse */}
                    <motion.div
                      className="absolute inset-0 bg-cyber-neon-primary/20 rounded-xl"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    
                    <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </motion.div>
                  
                  <div className="hidden md:block">
                    <motion.h1 
                      className="text-xl font-bold text-cyber-text-primary group-hover:text-cyber-neon-primary transition-colors cyber-text-glow font-accent"
                      variants={cyber.neonPulse}
                      whileHover="animate"
                    >
                      HesaabPlus
                    </motion.h1>
                    <p className="text-sm text-cyber-text-secondary">
                      Super Admin Panel
                    </p>
                  </div>
                </Link>
              </motion.div>

              {/* System Status Indicator */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <SystemStatusIndicator 
                  systemHealth={dashboardStats?.system_health}
                  className="hidden lg:flex"
                />
              </motion.div>
            </div>

            {/* Center Section - Quick Stats */}
            <motion.div 
              className="hidden xl:flex items-center gap-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <div className="flex items-center gap-6">
                {/* Active Tenants */}
                <motion.div 
                  className="text-center glass-morphism px-4 py-2 rounded-lg border border-cyber-neon-secondary/30"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(0, 255, 136, 0.3)",
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.p 
                    className="text-2xl font-bold text-cyber-neon-secondary cyber-text-glow font-mono"
                    animate={{ 
                      textShadow: [
                        "0 0 5px rgba(0, 255, 136, 0.5)",
                        "0 0 15px rgba(0, 255, 136, 0.8)",
                        "0 0 5px rgba(0, 255, 136, 0.5)",
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {dashboardStats?.active_tenants || 0}
                  </motion.p>
                  <p className="text-xs text-cyber-text-muted">تنانت فعال</p>
                </motion.div>
                
                {/* Online Users */}
                <motion.div 
                  className="text-center glass-morphism px-4 py-2 rounded-lg border border-cyber-neon-info/30"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(0, 136, 255, 0.3)",
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.p 
                    className="text-2xl font-bold text-cyber-neon-info cyber-text-glow font-mono"
                    animate={{ 
                      textShadow: [
                        "0 0 5px rgba(0, 136, 255, 0.5)",
                        "0 0 15px rgba(0, 136, 255, 0.8)",
                        "0 0 5px rgba(0, 136, 255, 0.5)",
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  >
                    {onlineData?.total_count || 0}
                  </motion.p>
                  <p className="text-xs text-cyber-text-muted">کاربر آنلاین</p>
                </motion.div>
                
                {/* Monthly Revenue */}
                <motion.div 
                  className="text-center glass-morphism px-4 py-2 rounded-lg border border-cyber-neon-primary/30"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(0, 255, 255, 0.3)",
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.p 
                    className="text-2xl font-bold text-cyber-neon-primary cyber-text-glow font-mono"
                    animate={{ 
                      textShadow: [
                        "0 0 5px rgba(0, 255, 255, 0.5)",
                        "0 0 15px rgba(0, 255, 255, 0.8)",
                        "0 0 5px rgba(0, 255, 255, 0.5)",
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  >
                    ${dashboardStats?.mrr?.toLocaleString() || 0}
                  </motion.p>
                  <p className="text-xs text-cyber-text-muted">درآمد ماهانه</p>
                </motion.div>
              </div>
            </motion.div>

            {/* Right Section - Actions and User */}
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              {/* Quick Search */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchOpen(true)}
                  className="hover:bg-cyber-neon-primary/10 hover:border-cyber-neon-primary/30 border border-transparent text-cyber-text-secondary hover:text-cyber-neon-primary relative group transition-all duration-cyber-fast"
                  title="جستجوی سراسری (Ctrl+/)"
                >
                  <motion.svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    whileHover={{ rotate: 15 }}
                    transition={{ duration: 0.2 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </motion.svg>
                  
                  {/* Animated tooltip */}
                  <motion.div 
                    className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-cyber-bg-surface text-cyber-text-primary text-xs px-2 py-1 rounded border border-cyber-neon-primary/30 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-neon-cyan"
                    initial={{ y: 5, opacity: 0 }}
                    whileHover={{ y: 0, opacity: 1 }}
                  >
                    Ctrl+/
                  </motion.div>
                </Button>
              </motion.div>

              {/* Notifications */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              >
                <NotificationCenter 
                  isOpen={isNotificationsOpen}
                  onToggle={() => setIsNotificationsOpen(!isNotificationsOpen)}
                />
              </motion.div>

              {/* Header Actions */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.3 }}
              >
                <HeaderActions />
              </motion.div>

              {/* User Profile */}
              <motion.div 
                className="flex items-center gap-3 pl-3 border-r border-cyber-neon-primary/30"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.3 }}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-cyber-text-primary cyber-text-glow">Super Admin</p>
                  <p className="text-xs text-cyber-text-secondary">{user?.email || 'admin@hesaabplus.com'}</p>
                </div>
                
                <div className="relative group">
                  <motion.div 
                    className="w-10 h-10 bg-gradient-to-br from-cyber-neon-primary to-cyber-neon-secondary rounded-full flex items-center justify-center shadow-neon-cyan cursor-pointer relative overflow-hidden"
                    whileHover={{ 
                      scale: 1.1,
                      boxShadow: "0 0 30px rgba(0, 255, 255, 0.6)",
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Animated background pulse */}
                    <motion.div
                      className="absolute inset-0 bg-cyber-neon-primary/20 rounded-full"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    
                    <svg className="w-5 h-5 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </motion.div>
                  
                  {/* User Dropdown */}
                  <AnimatePresence>
                    <motion.div 
                      className="absolute left-0 mt-2 w-48 glass-morphism rounded-xl shadow-cyber-glass border border-cyber-neon-primary/30 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-cyber-normal z-50"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Header glow effect */}
                      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyber-neon-primary/50 to-transparent" />
                      
                      <div className="px-4 py-3 border-b border-cyber-neon-primary/20">
                        <p className="font-semibold text-cyber-text-primary cyber-text-glow">Super Admin</p>
                        <p className="text-sm text-cyber-text-secondary">{user?.email || 'admin@hesaabplus.com'}</p>
                      </div>
                      
                      <div className="py-2">
                        <motion.button 
                          className="w-full flex items-center gap-3 px-4 py-2 text-right hover:bg-cyber-neon-primary/10 transition-colors text-cyber-text-secondary hover:text-cyber-neon-primary"
                          whileHover={{ x: 5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-sm">تنظیمات پروفایل</span>
                        </motion.button>
                        
                        <motion.button 
                          className="w-full flex items-center gap-3 px-4 py-2 text-right hover:bg-cyber-neon-primary/10 transition-colors text-cyber-text-secondary hover:text-cyber-neon-primary"
                          whileHover={{ x: 5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm">تنظیمات سیستم</span>
                        </motion.button>
                      </div>
                      
                      <div className="border-t border-cyber-neon-primary/20 pt-2">
                        {/* Separator glow effect */}
                        <div className="absolute left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyber-neon-danger/50 to-transparent" />
                        
                        <motion.button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 text-right hover:bg-cyber-neon-danger/10 transition-colors text-cyber-neon-danger mt-2"
                          whileHover={{ x: 5, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="text-sm font-medium">خروج از سیستم</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Quick Search Modal */}
      <QuickSearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};

export default SuperAdminHeader;