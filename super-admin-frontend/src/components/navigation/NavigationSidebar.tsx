import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createRTLNavigationAnimations } from '@/lib/theme/rtl-animations';
import { animationPresets } from '@/lib/theme/animations';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  section: string;
  shortcut?: string;
}

interface NavigationSidebarProps {
  className?: string;
}

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ className }) => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // RTL-aware animations
  const rtlAnimations = createRTLNavigationAnimations();

  const navItems: NavItem[] = [
    {
      path: '/',
      label: 'داشبورد',
      gradient: 'cyber-neon-secondary',
      section: 'main',
      shortcut: 'Ctrl+1',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      ),
    },
    {
      path: '/tenants',
      label: 'مدیریت تنانت‌ها',
      gradient: 'cyber-neon-primary',
      section: 'management',
      shortcut: 'Ctrl+2',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      path: '/subscriptions',
      label: 'مدیریت اشتراک‌ها',
      gradient: 'cyber-neon-tertiary',
      section: 'management',
      shortcut: 'Ctrl+3',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: '/analytics',
      label: 'آنالیتیکس',
      gradient: 'cyber-neon-purple',
      section: 'analytics',
      shortcut: 'Ctrl+4',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      path: '/system-health',
      label: 'سلامت سیستم',
      gradient: 'cyber-neon-success',
      section: 'monitoring',
      shortcut: 'Ctrl+5',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: '/backup-recovery',
      label: 'پشتیبان‌گیری',
      gradient: 'cyber-neon-warning',
      section: 'operations',
      shortcut: 'Ctrl+6',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      ),
    },
    {
      path: '/impersonation',
      label: 'جایگزینی کاربر',
      gradient: 'cyber-neon-pink',
      section: 'operations',
      shortcut: 'Ctrl+7',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      path: '/error-logging',
      label: 'مدیریت خطاها',
      gradient: 'cyber-neon-danger',
      section: 'monitoring',
      shortcut: 'Ctrl+8',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: '/online-users',
      label: 'کاربران آنلاین',
      gradient: 'cyber-neon-info',
      section: 'monitoring',
      shortcut: 'Ctrl+9',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      ),
    },
  ];

  const sections = {
    main: 'اصلی',
    management: 'مدیریت',
    analytics: 'تحلیل و گزارش',
    monitoring: 'نظارت',
    operations: 'عملیات'
  };

  const groupedNavItems = navItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <motion.div 
      className={cn(
        // Cybersecurity background with glassmorphism
        "bg-cyber-bg-primary glass-navigation border-r border-cyber-border-default shadow-cyber-elevated transition-all duration-300 flex flex-col relative overflow-hidden",
        isSidebarCollapsed ? "w-16" : "w-64",
        className
      )}
      initial="hidden"
      animate="visible"
      variants={animationPresets.slideIn}
    >
      {/* Cybersecurity Background Effects */}
      <div className="absolute inset-0 bg-cyber-gradient-primary opacity-50" />
      <div className="absolute inset-0 bg-cyber-mesh-gradient opacity-30" />
      
      {/* Animated Scanning Line */}
      <motion.div 
        className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-neon-primary to-transparent opacity-60"
        animate={{
          x: ['-100%', '100%'],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Header */}
      <motion.div 
        className="relative z-10 p-6 border-b border-cyber-border-default/50 glass-base"
        variants={animationPresets.fadeIn}
      >
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {!isSidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <motion.h1 
                  className="text-xl font-bold text-cyber-text-primary font-cyber drop-shadow-neon-cyan"
                  whileHover={{ 
                    textShadow: "0 0 20px rgba(0, 212, 255, 0.8)",
                    scale: 1.02 
                  }}
                >
                  HesaabPlus
                </motion.h1>
                <motion.p 
                  className="text-sm text-cyber-text-secondary font-persian"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  Super Admin
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="glass-base hover:glass-neon text-cyber-text-primary hover:text-cyber-neon-primary border-cyber-border-default hover:border-cyber-neon-primary transition-all duration-300"
              title={isSidebarCollapsed ? "گسترش منو" : "جمع کردن منو"}
            >
              <motion.svg 
                className="w-5 h-5"
                animate={{ 
                  rotate: isSidebarCollapsed ? 180 : 0,
                  filter: isSidebarCollapsed 
                    ? "drop-shadow(0 0 8px rgba(0, 212, 255, 0.6))" 
                    : "drop-shadow(0 0 4px rgba(0, 212, 255, 0.3))"
                }}
                transition={{ duration: 0.3 }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </motion.svg>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 p-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-track-cyber-bg-secondary scrollbar-thumb-cyber-neon-primary/30">
        {Object.entries(groupedNavItems).map(([sectionKey, items], sectionIndex) => (
          <motion.div 
            key={sectionKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
          >
            <AnimatePresence mode="wait">
              {!isSidebarCollapsed && (
                <motion.h3 
                  className="text-xs font-semibold text-cyber-text-muted uppercase tracking-wider mb-3 px-3 font-cyber"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {sections[sectionKey as keyof typeof sections]}
                </motion.h3>
              )}
            </AnimatePresence>
            
            <motion.div 
              className="space-y-1"
              variants={animationPresets.staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {items.map((item, itemIndex) => {
                const isActive = location.pathname === item.path;
                const isHovered = hoveredItem === item.path;
                
                return (
                  <motion.div
                    key={item.path}
                    variants={animationPresets.fadeIn}
                    custom={itemIndex}
                  >
                    <Link
                      to={item.path}
                      className="block"
                      onMouseEnter={() => setHoveredItem(item.path)}
                      onMouseLeave={() => setHoveredItem(null)}
                      title={isSidebarCollapsed ? `${item.label} (${item.shortcut})` : undefined}
                    >
                      <motion.div
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-cyber-lg transition-all duration-300 group relative overflow-hidden",
                          "glass-base border border-transparent",
                          isActive && "glass-neon border-cyber-neon-primary shadow-neon-cyan"
                        )}
                        variants={rtlAnimations.navItemHover}
                        initial="rest"
                        whileHover="hover"
                        whileTap="tap"
                        animate={isActive ? "hover" : "rest"}
                      >
                        {/* Background glow effect */}
                        <motion.div
                          className="absolute inset-0 opacity-0 bg-gradient-to-r from-cyber-neon-primary/10 via-cyber-neon-secondary/10 to-cyber-neon-tertiary/10"
                          animate={{
                            opacity: isActive ? [0.3, 0.6, 0.3] : isHovered ? 0.2 : 0,
                          }}
                          transition={{
                            duration: isActive ? 2 : 0.3,
                            repeat: isActive ? Infinity : 0,
                          }}
                        />

                        {/* Icon with gradient background */}
                        <motion.div 
                          className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-cyber-md transition-all duration-300 relative z-10",
                            isActive 
                              ? `bg-${item.gradient} shadow-neon-multi text-white`
                              : `bg-gradient-to-br from-${item.gradient}/20 to-${item.gradient}/10 text-${item.gradient} border border-${item.gradient}/30`
                          )}
                          whileHover={{ 
                            scale: 1.1,
                            boxShadow: `0 0 20px var(--${item.gradient})`,
                          }}
                          animate={isActive ? {
                            boxShadow: [
                              `0 0 10px var(--${item.gradient})`,
                              `0 0 25px var(--${item.gradient})`,
                              `0 0 10px var(--${item.gradient})`,
                            ],
                          } : {}}
                          transition={{
                            duration: isActive ? 2 : 0.3,
                            repeat: isActive ? Infinity : 0,
                          }}
                        >
                          {item.icon}
                        </motion.div>

                        <AnimatePresence mode="wait">
                          {!isSidebarCollapsed && (
                            <motion.div 
                              className="flex-1 flex items-center justify-between relative z-10"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.2 }}
                            >
                              <motion.span 
                                className={cn(
                                  "font-medium font-persian transition-colors duration-300",
                                  isActive 
                                    ? "text-cyber-text-primary drop-shadow-neon-cyan" 
                                    : "text-cyber-text-secondary group-hover:text-cyber-text-primary"
                                )}
                                whileHover={{
                                  textShadow: isActive 
                                    ? "0 0 15px rgba(0, 212, 255, 0.8)"
                                    : "0 0 8px rgba(0, 212, 255, 0.4)",
                                }}
                              >
                                {item.label}
                              </motion.span>
                              
                              {item.shortcut && (
                                <motion.span 
                                  className={cn(
                                    "text-xs px-2 py-1 rounded-cyber-sm transition-all duration-300 font-mono",
                                    isActive 
                                      ? "glass-neon text-cyber-text-primary border border-cyber-neon-primary/30" 
                                      : "glass-base text-cyber-text-muted border border-cyber-border-default group-hover:border-cyber-neon-primary/50"
                                  )}
                                  whileHover={{ scale: 1.05 }}
                                >
                                  {item.shortcut}
                                </motion.span>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        {/* Active indicator with neon glow */}
                        <AnimatePresence>
                          {isActive && (
                            <motion.div 
                              className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyber-neon-primary via-cyber-neon-secondary to-cyber-neon-tertiary rounded-l-full shadow-neon-cyan"
                              initial={{ scaleY: 0, opacity: 0 }}
                              animate={{ 
                                scaleY: 1, 
                                opacity: 1,
                                boxShadow: [
                                  "0 0 10px rgba(0, 212, 255, 0.6)",
                                  "0 0 20px rgba(0, 212, 255, 0.8)",
                                  "0 0 10px rgba(0, 212, 255, 0.6)",
                                ],
                              }}
                              exit={{ scaleY: 0, opacity: 0 }}
                              transition={{
                                scaleY: { duration: 0.3 },
                                opacity: { duration: 0.3 },
                                boxShadow: { duration: 2, repeat: Infinity },
                              }}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        ))}
      </nav>

      {/* Footer */}
      <AnimatePresence mode="wait">
        {!isSidebarCollapsed && (
          <motion.div 
            className="relative z-10 p-4 border-t border-cyber-border-default/50 glass-base"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className="text-xs text-cyber-text-muted text-center font-persian"
              whileHover={{
                color: "var(--cyber-text-secondary)",
                textShadow: "0 0 8px rgba(0, 212, 255, 0.3)",
              }}
            >
              <motion.p
                animate={{
                  color: [
                    "var(--cyber-text-muted)",
                    "var(--cyber-neon-primary)",
                    "var(--cyber-text-muted)",
                  ],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                نسخه 2.0.0
              </motion.p>
              <p className="mt-1">© 2024 HesaabPlus</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cybersecurity Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }} />
      </div>
    </motion.div>
  );
};

export default NavigationSidebar;