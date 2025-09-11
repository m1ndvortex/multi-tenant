import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { ErrorTrends, ErrorSeverity } from '@/services/errorLoggingService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ErrorTrendsChartProps {
  trends?: ErrorTrends;
  isLoading: boolean;
  height?: number;
  detailed?: boolean;
}

export const ErrorTrendsChart: React.FC<ErrorTrendsChartProps> = ({
  trends,
  isLoading,
  height = 300,
  detailed = false,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className={`bg-slate-200 rounded`} style={{ height: `${height}px` }}></div>
        </div>
      </div>
    );
  }

  if (!trends || !trends.daily_counts.length) {
    return (
      <div className="flex items-center justify-center text-slate-500" style={{ height: `${height}px` }}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>داده‌ای برای نمایش وجود ندارد</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['ژان', 'فور', 'مار', 'آپر', 'می', 'ژون', 'ژول', 'آگو', 'سپت', 'اکت', 'نوا', 'دسا'];
    const month = monthNames[date.getMonth()];
    return `${day} ${month}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'rgb(239, 68, 68)';
      case ErrorSeverity.HIGH:
        return 'rgb(245, 101, 101)';
      case ErrorSeverity.MEDIUM:
        return 'rgb(251, 191, 36)';
      case ErrorSeverity.LOW:
        return 'rgb(34, 197, 94)';
      default:
        return 'rgb(107, 114, 128)';
    }
  };

  const formatSeverityName = (severity: string) => {
    const severityNames = {
      [ErrorSeverity.CRITICAL]: 'بحرانی',
      [ErrorSeverity.HIGH]: 'بالا',
      [ErrorSeverity.MEDIUM]: 'متوسط',
      [ErrorSeverity.LOW]: 'پایین',
    };
    return severityNames[severity as ErrorSeverity] || severity;
  };

  // Prepare chart data
  const totalErrorsData = {
    labels: trends.daily_counts.map((item: any) => formatDate(item.date)),
    datasets: [
      {
        label: 'تعداد کل خطاها',
        data: trends.daily_counts.map((item: any) => item.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const severityData = {
    labels: trends.daily_counts.map((item: any) => formatDate(item.date)),
    datasets: Object.entries(trends.severity_trends).map(([severity, data]) => ({
      label: formatSeverityName(severity),
      data: (data as any).map((item: any) => item.count),
      borderColor: getSeverityColor(severity),
    })),
  };

  const stackedBarData = {
    labels: trends.daily_counts.map((item: any) => formatDate(item.date)),
    datasets: Object.entries(trends.severity_trends).map(([severity, data]) => ({
      label: formatSeverityName(severity),
      data: (data as any).map((item: any) => item.count),
      backgroundColor: getSeverityColor(severity),
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context: any) => {
            const date = new Date(trends.daily_counts[context[0].dataIndex].date);
            return date.toLocaleDateString('fa-IR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
          },
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y} خطا`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: 'Inter, sans-serif',
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            family: 'Inter, sans-serif',
            size: 11,
          },
          callback: function (value: any) {
            return value + ' خطا';
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const stackedBarOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        stacked: true,
      },
      x: {
        ...chartOptions.scales.x,
        stacked: true,
      },
    },
  };

  if (detailed) {
    return (
      <div className="space-y-6">
        {/* Total Errors Trend */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">روند کلی خطاها</h3>
          <div style={{ height: `${height}px` }}>
            <Line data={totalErrorsData} options={chartOptions} />
          </div>
        </div>

        {/* Severity Breakdown Line Chart */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">تفکیک بر اساس شدت خطا</h3>
          <div style={{ height: `${height}px` }}>
            <Line data={severityData} options={chartOptions} />
          </div>
        </div>

        {/* Stacked Bar Chart */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">نمای ترکیبی خطاها</h3>
          <div style={{ height: `${height}px` }}>
            <Bar data={stackedBarData} options={stackedBarOptions} />
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-800">
              {trends.daily_counts.reduce((sum: number, item: any) => sum + item.count, 0)}
            </div>
            <div className="text-sm text-blue-600">کل خطاها در این دوره</div>
          </div>

          <div className="p-4 bg-gradient-to-br from-red-50 to-red-100/50 rounded-lg">
            <div className="text-2xl font-bold text-red-800">
              {Object.entries(trends.severity_trends)
                .filter(([severity]) => severity === ErrorSeverity.CRITICAL)
                .reduce((sum: number, [, data]) => sum + (data as any).reduce((s: number, item: any) => s + item.count, 0), 0)}
            </div>
            <div className="text-sm text-red-600">خطاهای بحرانی</div>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg">
            <div className="text-2xl font-bold text-green-800">
              {Math.round(trends.daily_counts.reduce((sum: number, item: any) => sum + item.count, 0) / trends.daily_counts.length)}
            </div>
            <div className="text-sm text-green-600">میانگین خطا در روز</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={totalErrorsData} options={chartOptions} />
    </div>
  );
};