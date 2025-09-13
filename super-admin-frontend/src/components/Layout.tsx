import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import NavigationSidebar from '@/components/navigation/NavigationSidebar';
import SuperAdminHeader from '@/components/SuperAdminHeader';
import Breadcrumb from '@/components/navigation/Breadcrumb';
import { useNavigation } from '@/contexts/NavigationContext';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { useAnimations } from '@/hooks/useAnimations';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { navigationState } = useNavigation();
  const { pageProps, presets } = useAnimations();
  useKeyboardShortcuts(); // Enable keyboard shortcuts

  return (
    <div 
      className="min-h-screen bg-cyber-bg-primary flex relative overflow-hidden" 
      dir="rtl"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 80%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(0, 255, 136, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(255, 170, 0, 0.05) 0%, transparent 50%),
          linear-gradient(90deg, rgba(0, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(rgba(0, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%, 50px 50px, 50px 50px'
      }}
    >
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyber-neon-primary rounded-full opacity-30"
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              opacity: [0.1, 0.5, 0.1],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Sidebar */}
      <NavigationSidebar />

      {/* Main Content */}
      <motion.div 
        className="flex-1 flex flex-col"
        variants={presets.slideIn}
        initial="hidden"
        animate="visible"
      >
        {/* Enhanced Header */}
        <SuperAdminHeader />

        {/* Page Header with Breadcrumb */}
        <motion.div 
          className="glass-morphism border-b border-cyber-neon-primary/20 px-6 py-3 relative"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {/* Subtle neon accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-neon-primary/50 to-transparent" />
          
          <div className="flex items-center justify-between">
            <div>
              <motion.h2 
                className="text-xl font-semibold text-cyber-text-primary mb-1 cyber-text-glow"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                {navigationState.pageTitle}
              </motion.h2>
              <div className="flex items-center gap-4">
                <motion.p 
                  className="text-sm text-cyber-text-secondary"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  {navigationState.pageDescription}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  <Breadcrumb />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Page Content */}
        <motion.main 
          className={cn(
            "flex-1 overflow-auto transition-all duration-cyber-normal relative",
            navigationState.isSidebarCollapsed ? "ml-16" : "ml-64"
          )}
          {...pageProps}
        >
          {/* Content glass container */}
          <div className="p-6 relative">
            <motion.div 
              className="max-w-7xl mx-auto relative"
              variants={presets.staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {/* Subtle content background with glassmorphism */}
              <div className="absolute inset-0 glass-morphism rounded-2xl opacity-30 pointer-events-none" />
              
              {/* Content */}
              <div className="relative z-10">
                {children}
              </div>
            </motion.div>
          </div>
        </motion.main>
      </motion.div>
    </div>
  );
};

export default Layout;