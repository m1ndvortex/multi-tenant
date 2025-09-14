// @ts-nocheck
/**
 * Error Logging Page - Cybersecurity Theme
 * Main page component for real-time error logging dashboard with cybersecurity aesthetics
 */

import React from 'react';
import { motion } from 'framer-motion';
import ErrorLoggingDashboard from '../components/error-logging/ErrorLoggingDashboard';
import { animationPresets } from '../lib/theme/animations';

const ErrorLogging: React.FC = () => {
  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-[#0B0E1A] via-[#1A1D29] to-[#252A3A] p-8"
      {...animationPresets.pageTransition}
    >
      <div className="max-w-7xl mx-auto">
        <ErrorLoggingDashboard />
      </div>
    </motion.div>
  );
};

export default ErrorLogging;