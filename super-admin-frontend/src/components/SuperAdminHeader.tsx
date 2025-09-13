import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
// import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import SystemStatusIndicator from './SystemStatusIndicator';
import NotificationCenter from './NotificationCenter';
import QuickSearchModal from './QuickSearchModal';
import HeaderActions from './HeaderActions';
import { createHoverAnimation, createNeonText } from '@/lib/theme/animations';
import { glassmorphismClasses, neonClasses } from '@/lib/theme/cybersecurity';

interface SuperAdminHeaderProps {
  className?: string;
}

const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({ className }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { data: dashboardStats } = useDashboardStats();
  const { data: onlineData } = useOnlineUsers();

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
          "sticky top-0 z-40 border-b",
          glassmorphismClasses.base,
          "bg-gradient-to-r from-white/[0.05] to-white/[0.02] border-white/[0.08]",
          className
        )}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Neon accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section - Branding and Navigation */}
            <div className="flex items-center gap-6">
              {/* Platform Branding with Cybersecurity Theme */}
              <motion.div
                whileHover="hover"
                initial="rest"
                animate="rest"
              >
                <Link to="/" className="flex items-center gap-3 group">
                  <motion.div 
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden",
                      "bg-gradient-to-br from-cyan-500/20 to-emerald-500/20",
                      "border border-cyan-400/30 shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                    )}
                    variants={createHoverAnimation(1.1, "rgba(0, 255, 255, 0.5)", 'high')}
                  >
                    {/* Animated background */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-emerald-400/10"
                      animate={{
                        background: [
                          "linear-gradient(45deg, rgba(0,212,255,0.1) 0%, rgba(0,255,136,0.1) 100%)",
                          "linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(255,107,53,0.1) 100%)",
                          "linear-gradient(225deg, rgba(255,107,53,0.1) 0%, rgba(0,212,255,0.1) 100%)",
                          "linear-gradient(45deg, rgba(0,212,255,0.1) 0%, rgba(0,255,136,0.1) 100%)",
                        ],
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                    
                    <svg className="w-6 h-6 text-cyan-400 relative z-10 drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </motion.div>
                  
                  <div className="hidden md:block">
                    <motion.h1 
                      className={cn(
                        "text-xl font-bold text-white group-hover:text-cyan-400 transition-colors",
                        neonClasses.text.primary
                      )}
                      variants={createNeonText("#00D4FF")}
                    >
                      HesaabPlus
                    </motion.h1>
                    <p className="text-sm text-slate-300">
                      Super Admin Panel
                    </p>
                  </div>
                </Link>
              </motion.div>

              {/* System Status Indicator with Cybersecurity Styling */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <SystemStatusIndicator 
                  systemHealth={dashboardStats?.system_health}
                  className="hidden lg:flex"
                />
              </motion.div>
            </div>

            {/* Center Section - Quick Stats with Cybersecurity Theme */}
            <motion.div 
              className="hidden xl:flex items-center gap-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="flex items-center gap-6">
                {/* Active Tenants */}
                <motion.div 
                  className={cn(
                    "text-center p-3 rounded-lg",
                    glassmorphismClasses.base,
                    "border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5"
                  )}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0, 255, 136, 0.3)" }}
                >
                  <motion.p 
                    className={cn("text-2xl font-bold", neonClasses.text.secondary)}
                    animate={{ textShadow: ["0 0 5px #00FF88", "0 0 15px #00FF88", "0 0 5px #00FF88"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {dashboardStats?.active_tenants || 0}
                  </motion.p>
                  <p className="text-xs text-slate-300">تنانت فعال</p>
                </motion.div>
                
                {/* Online Users */}
                <motion.div 
                  className={cn(
                    "text-center p-3 rounded-lg",
                    glassmorphismClasses.base,
                    "border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5"
                  )}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0, 212, 255, 0.3)" }}
                >
                  <motion.p 
                    className={cn("text-2xl font-bold", neonClasses.text.primary)}
                    animate={{ textShadow: ["0 0 5px #00D4FF", "0 0 15px #00D4FF", "0 0 5px #00D4FF"] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  >
                    {onlineData?.total_count || 0}
                  </motion.p>
                  <p className="text-xs text-slate-300">کاربر آنلاین</p>
                </motion.div>
                
                {/* Monthly Revenue */}
                <motion.div 
                  className={cn(
                    "text-center p-3 rounded-lg",
                    glassmorphismClasses.base,
                    "border-orange-400/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5"
                  )}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(255, 107, 53, 0.3)" }}
                >
                  <motion.p 
                    className={cn("text-2xl font-bold", neonClasses.text.tertiary)}
                    animate={{ textShadow: ["0 0 5px #FF6B35", "0 0 15px #FF6B35", "0 0 5px #FF6B35"] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  >
                    ${dashboardStats?.mrr?.toLocaleString() || 0}
                  </motion.p>
                  <p className="text-xs text-slate-300">درآمد ماهانه</p>
                </motion.div>
              </div>
            </motion.div>

            {/* Right Section - Actions and User */}
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              {/* Quick Search with Cybersecurity Styling */}
              <motion.div
                whileHover="hover"
                whileTap="tap"
                variants={createHoverAnimation(1.1, "rgba(0, 255, 255, 0.4)", 'medium')}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchOpen(true)}
                  className={cn(
                    "relative group border border-white/10 bg-white/5",
                    "hover:bg-cyan-500/10 hover:border-cyan-400/30"
                  )}
                  title="جستجوی سراسری (Ctrl+/)"
                >
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  
                  {/* Enhanced tooltip */}
                  <div className={cn(
                    "absolute -bottom-10 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    glassmorphismClasses.elevated,
                    "text-cyan-400 border-cyan-400/20"
                  )}>
                    Ctrl+/
                  </div>
                </Button>
              </motion.div>

              {/* Notifications */}
              <NotificationCenter 
                isOpen={isNotificationsOpen}
                onToggle={() => setIsNotificationsOpen(!isNotificationsOpen)}
              />

              {/* Header Actions */}
              <HeaderActions />

              {/* User Profile with Cybersecurity Theme */}
              <div className="flex items-center gap-3 pl-3 border-r border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">Super Admin</p>
                  <p className="text-xs text-slate-300">{user?.email || 'admin@hesaabplus.com'}</p>
                </div>
                
                <div className="relative group">
                  <motion.div 
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center cursor-pointer relative overflow-hidden",
                      "bg-gradient-to-br from-cyan-500/20 to-emerald-500/20",
                      "border border-cyan-400/30 shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                    )}
                    whileHover={{ 
                      scale: 1.1, 
                      boxShadow: "0 0 25px rgba(0, 255, 255, 0.5)",
                      borderColor: "rgba(0, 255, 255, 0.6)"
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Animated background */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-emerald-400/10"
                      animate={{
                        background: [
                          "linear-gradient(45deg, rgba(0,212,255,0.1) 0%, rgba(0,255,136,0.1) 100%)",
                          "linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(255,107,53,0.1) 100%)",
                          "linear-gradient(225deg, rgba(255,107,53,0.1) 0%, rgba(0,212,255,0.1) 100%)",
                          "linear-gradient(45deg, rgba(0,212,255,0.1) 0%, rgba(0,255,136,0.1) 100%)",
                        ],
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                    
                    <svg className="w-5 h-5 text-cyan-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </motion.div>
                  
                  {/* Enhanced User Dropdown with Cybersecurity Theme */}
                  <div 
                    className={cn(
                      "absolute left-0 mt-2 w-48 py-2 z-50",
                      "opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200",
                      glassmorphismClasses.elevated,
                      "border-cyan-400/20 bg-gradient-to-br from-slate-900/90 to-slate-800/90"
                    )}
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="font-semibold text-white">Super Admin</p>
                      <p className="text-sm text-slate-300">{user?.email || 'admin@hesaabplus.com'}</p>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-2">
                      <motion.button 
                        className="w-full flex items-center gap-3 px-4 py-2 text-right hover:bg-white/5 transition-colors text-slate-300 hover:text-cyan-400"
                        whileHover={{ x: -5, backgroundColor: "rgba(0, 212, 255, 0.1)" }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm">تنظیمات پروفایل</span>
                      </motion.button>
                      
                      <motion.button 
                        className="w-full flex items-center gap-3 px-4 py-2 text-right hover:bg-white/5 transition-colors text-slate-300 hover:text-cyan-400"
                        whileHover={{ x: -5, backgroundColor: "rgba(0, 212, 255, 0.1)" }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm">تنظیمات سیستم</span>
                      </motion.button>
                    </div>
                    
                    {/* Logout */}
                    <div className="border-t border-white/10 pt-2">
                      <motion.button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-right hover:bg-red-500/10 transition-colors text-red-400 hover:text-red-300"
                        whileHover={{ x: -5, backgroundColor: "rgba(255, 71, 87, 0.1)" }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-sm font-medium">خروج از سیستم</span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
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