// @ts-nocheck
/**
 * Error Statistics Cards Component - Simplified Version
 * Displays real-time error statistics with visual indicators
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ErrorStatisticsCardsProps {
  statistics: any;
  isLoading: boolean;
  className?: string;
}

const ErrorStatisticsCardsSimple: React.FC<ErrorStatisticsCardsProps> = ({
  statistics,
  isLoading,
  className
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-gray-500">No statistics available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Active Errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {statistics.active_errors_count || 0}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Unresolved issues
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Resolved Errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {statistics.resolved_errors_count || 0}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Successfully resolved
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Critical (Last Hour)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {statistics.critical_errors_last_hour || 0}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Needs attention
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {statistics.total_errors || 0}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            All time
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorStatisticsCardsSimple;