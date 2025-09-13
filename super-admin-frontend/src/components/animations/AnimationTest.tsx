/**
 * Animation Test Component
 * Simple test component to verify Framer Motion integration
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useAnimationConfig } from '@/lib/theme/hooks';

export const AnimationTest: React.FC = () => {
  const { shouldAnimate, performanceConfig, rtlConfig } = useAnimationConfig();

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-cyan-400">Animation System Test</h2>
      
      {/* Performance Status */}
      <div className="bg-gray-800 p-3 rounded">
        <h3 className="text-sm font-semibold text-white mb-2">Performance Status</h3>
        <div className="text-xs space-y-1">
          <div>Animations Enabled: {shouldAnimate ? 'Yes' : 'No'}</div>
          <div>Performance Level: {performanceConfig.performanceLevel}</div>
          <div>Reduced Motion: {performanceConfig.reducedMotion ? 'Yes' : 'No'}</div>
          <div>RTL Mode: {rtlConfig.isRTL ? 'Yes' : 'No'}</div>
          <div>Language: {rtlConfig.language}</div>
        </div>
      </div>

      {/* Simple Animation Test */}
      <motion.div
        className="bg-cyan-500/20 border border-cyan-500/30 p-4 rounded"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
      >
        <p className="text-cyan-400">
          ✅ Basic Framer Motion animation working!
        </p>
      </motion.div>

      {/* Cybersecurity Glow Effect */}
      <motion.div
        className="bg-gray-800 border border-gray-600 p-4 rounded"
        whileHover={{
          borderColor: 'rgba(0, 255, 255, 0.6)',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
        }}
        transition={{ duration: 0.2 }}
      >
        <p className="text-white">
          ✨ Hover for cybersecurity glow effect
        </p>
      </motion.div>

      {/* Loading Animation */}
      <motion.div
        className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
};

export default AnimationTest;