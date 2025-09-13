// @ts-nocheck
/**
 * Error Logging Page
 * Main page component for real-time error logging dashboard
 */

import React from 'react';
import ErrorLoggingDashboard from '../components/error-logging/ErrorLoggingDashboard';

const ErrorLogging: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <ErrorLoggingDashboard />
      </div>
    </div>
  );
};

export default ErrorLogging;