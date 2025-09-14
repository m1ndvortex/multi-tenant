// @ts-nocheck
/**
 * Error Logging Page - Cybersecurity Theme
 * Main page component for real-time error logging dashboard with cybersecurity aesthetics
 */

import React from 'react';
import ErrorLoggingDashboard from '../components/error-logging/ErrorLoggingDashboard';

const ErrorLogging: React.FC = () => {
  return (
    <div className="space-y-6">
      <ErrorLoggingDashboard />
    </div>
  );
};

export default ErrorLogging;