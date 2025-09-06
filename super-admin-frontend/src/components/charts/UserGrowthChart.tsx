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

interface UserGrowthChartProps {
  data: {
    labels: string[];
    data: number[];
    cumulative_data?: number[];
    new_signups?: number[];
    active_users?: number[];
  };
  isLoading?: boolean;
  onTimeRangeChange?: (range: string) => void;
  currentTimeRange?: string;
}

const UserGrowthChart: React.FC<UserGrowthChartProps> = ({ 
  data, 
  isLoading, 
  onTimeRangeChange,
  currentTimeRange = '30d'
}) => {
  const [viewType, setViewType] = useState<'new' | 'cumulative' | 'active'>('new');
  const [showDataPoints, setShowDataPoints] = useState(true);

  const timeRangeOptions = [
    { value: '7d', label: '7 روز' },
    { value: '30d', label: '30 روز' },
    { value: '90d', label: '90 روز' },
    { value: '1y', label: '1 سال' },
  ];

  const chartData = useMemo(() => {
    const getDataForViewType = () => {
      switch (viewType) {
        case 'cumulative':
          return data.cumulative_data || data.data;
        case 'active':
          return data.active_users || data.data;
        default:
          return data.new_signups || data.data;
      }
    };

    const getColorForViewType = () => {
      switch (viewType) {
        case 'cumulative':
          return {
            border: 'rgb(59, 130, 246)',
            background: 'rgba(59, 130, 246, 0.1)',
          };
        case 'active':
          return {
            border: 'rgb(168, 85, 247)',
            background: 'rgba(168, 85, 247, 0.1)',
          };
        default:
          return {
            border: 'rgb(34, 197, 94)',
            background: 'rgba(34, 197, 94, 0.1)',
          };
      }
    };

    const getLabelForViewType = () => {
      switch (viewType) {
        case 'cumulative':
          return 'مجموع کاربران';
        case 'active':
          return 'کاربران فعال';
        default:
          return 'کاربران جدید';
      }
    };

    const colors = getColorForViewType();

    return {
      labels: data.labels,
      datasets: [
        {
          label: getLabelForViewType(),
          data: getDataForViewType(),
          borderColor: colors.border,
          backgroundColor: colors.background,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: colors.border,
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointRadius: showDataPoints ? 6 : 0,
          pointHoverRadius: 8,
        },
      ],
    };
  }, [data, viewType, showDataPoints]);

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
        borderColor: chartData.datasets[0]?.borderColor || 'rgb(34, 197, 94)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            return `تاریخ: ${context[0].label}`;
          },
          label: (context: any) => {
            const suffix = viewType === 'cumulative' ? 'مجموع' : 'نفر';
            return `${chartData.datasets[0]?.label}: ${context.parsed.y.toLocaleString()} ${suffix}`;
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
            return value.toLocaleString() + ' نفر';
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }), [chartData, viewType]);

  if (isLoading) {
    return (
      <Card variant="professional" className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            رشد کاربران
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" role="status" aria-label="Loading"></div>
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
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            رشد کاربران
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
              variant={viewType === 'new' ? 'gradient-green' : 'outline'}
              size="sm"
              onClick={() => setViewType('new')}
            >
              جدید
            </Button>
            <Button
              variant={viewType === 'cumulative' ? 'gradient-blue' : 'outline'}
              size="sm"
              onClick={() => setViewType('cumulative')}
            >
              مجموع
            </Button>
            <Button
              variant={viewType === 'active' ? 'gradient-purple' : 'outline'}
              size="sm"
              onClick={() => setViewType('active')}
            >
              فعال
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDataPoints(!showDataPoints)}
            className="text-xs"
          >
            {showDataPoints ? 'مخفی کردن نقاط' : 'نمایش نقاط'}
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

export default UserGrowthChart;