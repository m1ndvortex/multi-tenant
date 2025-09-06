import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RevenueChartProps {
  data: {
    labels: string[];
    mrr_data: number[];
    growth_rate: number[];
    arr_data?: number[];
    revenue_forecast?: number[];
  };
  isLoading?: boolean;
  onTimeRangeChange?: (range: string) => void;
  currentTimeRange?: string;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ 
  data, 
  isLoading, 
  onTimeRangeChange,
  currentTimeRange = '30d'
}) => {
  const [viewType, setViewType] = useState<'mrr' | 'arr' | 'forecast'>('mrr');
  const [showGrowthRate, setShowGrowthRate] = useState(true);

  const timeRangeOptions = [
    { value: '7d', label: '7 روز' },
    { value: '30d', label: '30 روز' },
    { value: '90d', label: '90 روز' },
    { value: '1y', label: '1 سال' },
  ];

  const chartData = useMemo(() => {
    const getRevenueData = () => {
      switch (viewType) {
        case 'arr':
          return data.arr_data || data.mrr_data.map(mrr => mrr * 12);
        case 'forecast':
          return data.revenue_forecast || data.mrr_data;
        default:
          return data.mrr_data;
      }
    };

    const getRevenueLabel = () => {
      switch (viewType) {
        case 'arr':
          return 'درآمد سالانه (ARR)';
        case 'forecast':
          return 'پیش‌بینی درآمد';
        default:
          return 'درآمد ماهانه (MRR)';
      }
    };

    const getRevenueColor = () => {
      switch (viewType) {
        case 'arr':
          return {
            border: 'rgb(34, 197, 94)',
            background: 'rgba(34, 197, 94, 0.1)',
          };
        case 'forecast':
          return {
            border: 'rgb(251, 146, 60)',
            background: 'rgba(251, 146, 60, 0.1)',
          };
        default:
          return {
            border: 'rgb(59, 130, 246)',
            background: 'rgba(59, 130, 246, 0.1)',
          };
      }
    };

    const revenueColor = getRevenueColor();
    const datasets = [
      {
        label: getRevenueLabel(),
        data: getRevenueData(),
        borderColor: revenueColor.border,
        backgroundColor: revenueColor.background,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: revenueColor.border,
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        yAxisID: 'y',
      },
    ];

    if (showGrowthRate) {
      datasets.push({
        label: 'نرخ رشد (%)',
        data: data.growth_rate,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: 'rgb(168, 85, 247)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1',
      });
    }

    return {
      labels: data.labels,
      datasets,
    };
  }, [data, viewType, showGrowthRate]);

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
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context: any) => {
            return `ماه: ${context[0].label}`;
          },
          label: (context: any) => {
            if (context.datasetIndex === 0) {
              const suffix = viewType === 'arr' ? 'سالانه' : 'ماهانه';
              return `درآمد ${suffix}: ${context.parsed.y.toLocaleString()} تومان`;
            } else {
              return `نرخ رشد: ${context.parsed.y}%`;
            }
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
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
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
            return value.toLocaleString() + ' تومان';
          },
        },
      },
      ...(showGrowthRate && {
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
              return value + '%';
            },
          },
        },
      }),
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }), [viewType, showGrowthRate]);

  if (isLoading) {
    return (
      <Card variant="professional" className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            روند درآمد و رشد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" role="status" aria-label="Loading"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional" className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            روند درآمد و رشد
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
              variant={viewType === 'mrr' ? 'gradient-blue' : 'outline'}
              size="sm"
              onClick={() => setViewType('mrr')}
            >
              MRR
            </Button>
            <Button
              variant={viewType === 'arr' ? 'gradient-green' : 'outline'}
              size="sm"
              onClick={() => setViewType('arr')}
            >
              ARR
            </Button>
            <Button
              variant={viewType === 'forecast' ? 'gradient-purple' : 'outline'}
              size="sm"
              onClick={() => setViewType('forecast')}
            >
              پیش‌بینی
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGrowthRate(!showGrowthRate)}
            className="text-xs"
          >
            {showGrowthRate ? 'مخفی کردن رشد' : 'نمایش رشد'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;