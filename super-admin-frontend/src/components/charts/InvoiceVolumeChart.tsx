import React, { useState, useMemo } from 'react';
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
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface InvoiceVolumeChartProps {
  data: {
    labels: string[];
    data: number[];
    general_invoices?: number[];
    gold_invoices?: number[];
    average_value?: number[];
  };
  isLoading?: boolean;
  onTimeRangeChange?: (range: string) => void;
  currentTimeRange?: string;
}

const InvoiceVolumeChart: React.FC<InvoiceVolumeChartProps> = ({ 
  data, 
  isLoading, 
  onTimeRangeChange,
  currentTimeRange = '30d'
}) => {
  const [viewType, setViewType] = useState<'total' | 'breakdown' | 'trend'>('total');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const timeRangeOptions = [
    { value: '7d', label: '7 روز' },
    { value: '30d', label: '30 روز' },
    { value: '90d', label: '90 روز' },
    { value: '1y', label: '1 سال' },
  ];

  const chartData = useMemo(() => {
    const getDatasets = () => {
      switch (viewType) {
        case 'breakdown':
          return [
            {
              label: 'فاکتور عمومی',
              data: data.general_invoices || data.data.map(d => Math.floor(d * 0.7)),
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
              borderColor: 'rgb(34, 197, 94)',
              borderWidth: 1,
              borderRadius: chartType === 'bar' ? 6 : 0,
              borderSkipped: false,
            },
            {
              label: 'فاکتور طلا',
              data: data.gold_invoices || data.data.map(d => Math.floor(d * 0.3)),
              backgroundColor: 'rgba(251, 191, 36, 0.8)',
              borderColor: 'rgb(251, 191, 36)',
              borderWidth: 1,
              borderRadius: chartType === 'bar' ? 6 : 0,
              borderSkipped: false,
            },
          ];
        case 'trend':
          return [
            {
              label: 'تعداد فاکتور',
              data: data.data,
              backgroundColor: chartType === 'bar' ? 'rgba(168, 85, 247, 0.8)' : 'rgba(168, 85, 247, 0.1)',
              borderColor: 'rgb(168, 85, 247)',
              borderWidth: chartType === 'line' ? 3 : 1,
              borderRadius: chartType === 'bar' ? 6 : 0,
              borderSkipped: false,
              fill: chartType === 'line',
              tension: chartType === 'line' ? 0.4 : 0,
              pointBackgroundColor: chartType === 'line' ? 'rgb(168, 85, 247)' : undefined,
              pointBorderColor: chartType === 'line' ? 'white' : undefined,
              pointBorderWidth: chartType === 'line' ? 2 : undefined,
              pointRadius: chartType === 'line' ? 6 : undefined,
              pointHoverRadius: chartType === 'line' ? 8 : undefined,
            },
            ...(data.average_value ? [{
              label: 'میانگین ارزش (تومان)',
              data: data.average_value,
              type: 'line' as const,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              pointBackgroundColor: 'rgb(59, 130, 246)',
              pointBorderColor: 'white',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y1',
            }] : []),
          ];
        default:
          return [
            {
              label: 'تعداد فاکتور',
              data: data.data,
              backgroundColor: 'rgba(168, 85, 247, 0.8)',
              borderColor: 'rgb(168, 85, 247)',
              borderWidth: 1,
              borderRadius: chartType === 'bar' ? 6 : 0,
              borderSkipped: false,
            },
          ];
      }
    };

    return {
      labels: data.labels,
      datasets: getDatasets(),
    };
  }, [data, viewType, chartType]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: 'Inter',
            size: 12,
          },
          color: 'rgb(71, 85, 105)',
          usePointStyle: true,
          pointStyle: chartType === 'line' ? 'circle' : 'rect',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(168, 85, 247)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: viewType === 'breakdown',
        callbacks: {
          title: (context: any) => {
            return `تاریخ: ${context[0].label}`;
          },
          label: (context: any) => {
            if (context.dataset.yAxisID === 'y1') {
              return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} تومان`;
            }
            return `${context.dataset.label}: ${context.parsed.y} عدد`;
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
            family: 'Inter',
            size: 11,
          },
          color: 'rgb(100, 116, 139)',
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          font: {
            family: 'Inter',
            size: 11,
          },
          color: 'rgb(100, 116, 139)',
          callback: function(value: any) {
            return value + ' عدد';
          },
        },
      },
      ...(viewType === 'trend' && data.average_value && {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            font: {
              family: 'Inter',
              size: 11,
            },
            color: 'rgb(100, 116, 139)',
            callback: function(value: any) {
              return value.toLocaleString() + ' تومان';
            },
          },
        },
      }),
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }), [viewType, chartType, data.average_value]);

  if (isLoading) {
    return (
      <Card variant="professional" className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            حجم فاکتورها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" role="status" aria-label="Loading"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ChartComponent = chartType === 'line' ? Line : Bar;

  return (
    <Card variant="professional" className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            حجم فاکتورها
          </div>
          <div className="flex items-center gap-2">
            {onTimeRangeChange && (
              <Select value={currentTimeRange} onValueChange={onTimeRangeChange}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardTitle>
        
        {/* Chart Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewType === 'total' ? 'gradient-purple' : 'outline'}
              size="sm"
              onClick={() => setViewType('total')}
            >
              کل
            </Button>
            <Button
              variant={viewType === 'breakdown' ? 'gradient-green' : 'outline'}
              size="sm"
              onClick={() => setViewType('breakdown')}
            >
              تفکیک
            </Button>
            <Button
              variant={viewType === 'trend' ? 'gradient-blue' : 'outline'}
              size="sm"
              onClick={() => setViewType('trend')}
            >
              روند
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={chartType === 'bar' ? 'gradient-purple' : 'ghost'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="text-xs"
            >
              ستونی
            </Button>
            <Button
              variant={chartType === 'line' ? 'gradient-purple' : 'ghost'}
              size="sm"
              onClick={() => setChartType('line')}
              className="text-xs"
            >
              خطی
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ChartComponent data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceVolumeChart;