/**
 * Error Logging Page
 * Main page component for real-time error logging dashboard
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import ErrorLoggingDashboard from '../components/error-logging/ErrorLoggingDashboard';

const ErrorLogging: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Real-Time Error Logging - Super Admin Dashboard</title>
        <meta 
          name="description" 
          content="Monitor and resolve system errors in real-time with comprehensive error logging dashboard" 
        />
      </Helmet>
      
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6">
          <ErrorLoggingDashboard />
        </div>
      </div>
    </>
  );
};

export default ErrorLogging;