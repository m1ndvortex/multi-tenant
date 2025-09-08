import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { cn } from '@/lib/utils';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge';
}

interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  propsHash: string;
  timestamp: number;
}

const PerformanceDashboard: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<{
    metrics: PerformanceMetric[];
    renderMetrics: ComponentRenderMetric[];
    slowestComponents: Array<{ name: string; avgRenderTime: number; renderCount: number }>;
    memoryUsage: { used: number; total: number; percentage: number } | null;
  }>({
    metrics: [],
    renderMetrics: [],
    slowestComponents: [],
    memoryUsage: null,
  });

  const [bundleSize, setBundleSize] = useState<{
    totalSize: number;
    chunks: Array<{ name: string; size: number }>;
  }>({
    totalSize: 0,
    chunks: [],
  });

  const [isVisible, setIsVisible] = useState(false);

  // Update performance data periodically
  useEffect(() => {
    if (!isVisible) return;

    const updateData = () => {
      const summary = performanceMonitor.getPerformanceSummary();
      setPerformanceData(summary);
    };

    updateData();
    const interval = setInterval(updateData, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Analyze bundle size on mount
  useEffect(() => {
    if (isVisible) {
      performanceMonitor.analyzeBundleSize().then(setBundleSize);
    }
  }, [isVisible]);

  // Memoized performance insights
  const performanceInsights = useMemo(() => {
    const insights = [];

    // Memory usage insights
    if (performanceData.memoryUsage) {
      if (performanceData.memoryUsage.percentage > 80) {
        insights.push({
          type: 'warning',
          message: `High memory usage: ${performanceData.memoryUsage.percentage.toFixed(1)}%`,
          suggestion: 'Consider optimizing component re-renders or clearing unused data',
        });
      }
    }

    // Slow component insights
    const slowComponents = performanceData.slowestComponents.filter(c => c.avgRenderTime > 16);
    if (slowComponents.length > 0) {
      insights.push({
        type: 'warning',
        message: `${slowComponents.length} components rendering slowly (>16ms)`,
        suggestion: 'Consider memoization or code splitting for these components',
      });
    }

    // Bundle size insights
    if (bundleSize.totalSize > 1024 * 1024) { // 1MB
      insights.push({
        type: 'info',
        message: `Large bundle size: ${(bundleSize.totalSize / 1024 / 1024).toFixed(2)}MB`,
        suggestion: 'Consider code splitting or removing unused dependencies',
      });
    }

    // Performance metrics insights
    const slowMetrics = performanceData.metrics.filter(m => 
      m.type === 'timing' && m.value > 100
    );
    if (slowMetrics.length > 0) {
      insights.push({
        type: 'warning',
        message: `${slowMetrics.length} slow operations detected (>100ms)`,
        suggestion: 'Review API calls and expensive computations',
      });
    }

    return insights;
  }, [performanceData, bundleSize]);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format time
  const formatTime = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Performance
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Performance Dashboard</h2>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => performanceMonitor.clearMetrics()}
                variant="outline"
                size="sm"
              >
                Clear Data
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                variant="ghost"
                size="sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Performance Insights */}
          {performanceInsights.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Performance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceInsights.map((insight, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border-l-4",
                        insight.type === 'warning' ? "bg-yellow-50 border-yellow-400" :
                        insight.type === 'error' ? "bg-red-50 border-red-400" :
                        "bg-blue-50 border-blue-400"
                      )}
                    >
                      <p className="font-medium text-slate-900">{insight.message}</p>
                      <p className="text-sm text-slate-600 mt-1">{insight.suggestion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Memory Usage */}
            {performanceData.memoryUsage && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Used Memory</span>
                      <span className="text-sm text-slate-600">
                        {formatSize(performanceData.memoryUsage.used)} / {formatSize(performanceData.memoryUsage.total)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          performanceData.memoryUsage.percentage > 80 ? "bg-red-500" :
                          performanceData.memoryUsage.percentage > 60 ? "bg-yellow-500" :
                          "bg-green-500"
                        )}
                        style={{ width: `${Math.min(performanceData.memoryUsage.percentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-600">
                      {performanceData.memoryUsage.percentage.toFixed(1)}% used
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bundle Size */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bundle Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Size</span>
                    <span className="text-sm text-slate-600">
                      {formatSize(bundleSize.totalSize)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {bundleSize.chunks.slice(0, 5).map((chunk, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="truncate">{chunk.name}</span>
                        <span className="text-slate-600">{formatSize(chunk.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Slowest Components */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Slowest Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceData.slowestComponents.slice(0, 8).map((component, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{component.name}</p>
                        <p className="text-xs text-slate-500">{component.renderCount} renders</p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-medium",
                          component.avgRenderTime > 16 ? "text-red-600" :
                          component.avgRenderTime > 8 ? "text-yellow-600" :
                          "text-green-600"
                        )}>
                          {formatTime(component.avgRenderTime)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {performanceData.metrics.slice(-10).reverse().map((metric, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="truncate">{metric.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium",
                          metric.type === 'timing' && metric.value > 100 ? "text-red-600" :
                          metric.type === 'timing' && metric.value > 50 ? "text-yellow-600" :
                          "text-slate-600"
                        )}>
                          {metric.type === 'timing' ? formatTime(metric.value) : metric.value}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">{metric.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Tips */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Performance Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Component Optimization</h4>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Use React.memo for expensive components</li>
                    <li>• Implement useMemo for heavy calculations</li>
                    <li>• Use useCallback for event handlers</li>
                    <li>• Avoid inline objects and functions in JSX</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Bundle Optimization</h4>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Use dynamic imports for code splitting</li>
                    <li>• Remove unused dependencies</li>
                    <li>• Use tree shaking effectively</li>
                    <li>• Optimize images and assets</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Data Fetching</h4>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Implement proper caching strategies</li>
                    <li>• Use pagination for large datasets</li>
                    <li>• Debounce search and filter operations</li>
                    <li>• Prefetch critical data</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Rendering Performance</h4>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Use virtual scrolling for long lists</li>
                    <li>• Implement lazy loading for images</li>
                    <li>• Minimize DOM manipulations</li>
                    <li>• Use CSS transforms for animations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;