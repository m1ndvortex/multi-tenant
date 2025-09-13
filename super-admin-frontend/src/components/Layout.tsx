import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavigationSidebar from '@/components/navigation/NavigationSidebar';
import SuperAdminHeader from '@/components/SuperAdminHeader';
import Breadcrumb from '@/components/navigation/Breadcrumb';
import { useNavigation } from '@/contexts/NavigationContext';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';
import { animationPresets, cyberAnimations } from '@/lib/theme/animations';
import { glassmorphismClasses } from '@/lib/theme/cybersecurity';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { navigationState } = useNavigation();
  useKeyboardShortcuts(); // Enable keyboard shortcuts

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex"
      dir="rtl"
      style={{
        background: `
          radial-gradient(circle at 20% 80%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(0, 255, 136, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(255, 107, 53, 0.05) 0%, transparent 50%),
          linear-gradient(135deg, #0B0E1A 0%, #1A1D29 50%, #252A3A 100%)
        `
      }}
    >
      {/* Animated Background Effects */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            "radial-gradient(circle at 20% 80%, rgba(0, 212, 255, 0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 20%, rgba(0, 255, 136, 0.08) 0%, transparent 50%)",
            "radial-gradient(circle at 40% 40%, rgba(255, 107, 53, 0.05) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 80%, rgba(0, 212, 255, 0.1) 0%, transparent 50%)",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Atmospheric Lighting Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top atmospheric glow */}
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        
        {/* Bottom right glow */}
        <div 
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(0, 255, 136, 0.4) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        {/* Center accent glow */}
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(255, 107, 53, 0.5) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      {/* Sidebar */}
      <NavigationSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Enhanced Header */}
        <SuperAdminHeader />

        {/* Page Header with Breadcrumb - Cybersecurity Styled */}
        <motion.div 
          className={cn(
            "border-b px-6 py-4 relative",
            glassmorphismClasses.base,
            "border-white/[0.08] bg-gradient-to-r from-white/[0.03] to-white/[0.01]"
          )}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {/* Neon accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
          
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <motion.h2 
                className="text-xl font-semibold text-white mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                {navigationState.pageTitle}
              </motion.h2>
              
              <div className="flex items-center gap-4">
                <motion.p 
                  className="text-sm text-slate-300"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  {navigationState.pageDescription}
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <Breadcrumb />
                </motion.div>
              </div>
            </div>

            {/* Status indicator with glow effect */}
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-xs text-emerald-400 font-medium">سیستم فعال</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Page Content with Enhanced Styling */}
        <motion.main 
          className={cn(
            "flex-1 overflow-auto transition-all duration-300 relative",
            navigationState.isSidebarCollapsed ? "ml-16" : "ml-64"
          )}
          variants={animationPresets.pageTransition}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Content background with subtle pattern */}
          <div className="absolute inset-0 opacity-5">
            <div 
              className="w-full h-full"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 1px 1px, rgba(0, 255, 255, 0.3) 1px, transparent 0)
                `,
                backgroundSize: '20px 20px',
              }}
            />
          </div>

          <div className="p-6 relative z-10">
            <div className="max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={navigationState.pageTitle}
                  variants={animationPresets.fadeIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Scanning line effect */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
            variants={cyberAnimations.scanLine}
            animate="animate"
            style={{ zIndex: 1 }}
          />
        </motion.main>
      </div>
    </div>
  );
};

export default Layout;