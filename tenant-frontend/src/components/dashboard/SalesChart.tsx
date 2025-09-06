/**
 * Sales Chart Component
 * Displays sales trend chart with interactive features
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { SalesChartData } from '@/services/dashboardService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SalesChartProps {
  data: SalesChartData;
  isLoading?: boolean;
  onPeriodChange?: (days: number) => void;
}

const SalesChart: React.FC<SalesChartProps> = ({
  data,
  isLoading = false,
  onPeriodChange
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const periodOptions = [
    { value: 7, label: '۷ روز' },
    { value: 30, label: '۳۰ روز' },
    { value: 90, label: '۹۰ روز' },
    { value: 365, label: '۱ سال' }
  ];

  const handlePeriodChange = (days: number) => {
    setSelectedPeriod(days);
    onPeriodChange?.(days);
  };

  if (isLoading) {
    return (
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            نمودار فروش
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartLabels = data.data.map(point => {
    const date = new Date(point.date);
    return date.toLocaleDateString('fa-IR', { 
      month: 'short', 
      day: 'numeric' 
    });
  });

  const salesData = data.data.map(point => point.sales);
  const invoicesData = data.data.map(point => point.invoices);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'فروش (تومان)',
        data: salesData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: chartType === 'line' 
          ? 'rgba(59, 130, 246, 0.1)' 
          : 'rgba(59, 130, 246, 0.8)',
        borderWidth: 2,
        fill: chartType === 'line',
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: 'تعداد فاکتور',
        data: invoicesData,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: chartType === 'line' 
          ? 'rgba(16, 185, 129, 0.1)' 
          : 'rgba(16, 185, 129, 0.8)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: 'Inter'
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (label.includes('فروش')) {
              return `${label}: ${new Intl.NumberFormat('fa-IR').format(value)} تومان`;
            } else {
              return `${label}: ${new Intl.NumberFormat('fa-IR').format(value)}`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'تاریخ'
        },
        grid: {
          display: false
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'فروش (تومان)'
        },
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat('fa-IR', {
              notation: 'compact',
              compactDisplay: 'short'
            }).format(value);
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'تعداد فاکتور'
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat('fa-IR').format(value);
          }
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  return (
    <Card variant="professional">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span>نمودار فروش</span>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-500">
                  {selectedPeriod} روز گذشته
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {periodOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedPeriod === option.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handlePeriodChange(option.value)}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
            
            {/* Chart type selector */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <Button
                variant={chartType === 'line' ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'bar' ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">کل فروش</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(data.total_sales)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">کل فاکتورها</p>
                <p className="text-lg font-bold text-slate-900">
                  {new Intl.NumberFormat('fa-IR').format(data.total_invoices)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">متوسط فاکتور</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(data.total_invoices > 0 ? data.total_sales / data.total_invoices : 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          {chartType === 'line' ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesChart;