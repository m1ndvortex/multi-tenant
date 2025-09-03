import React from 'react';
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
  };
  isLoading?: boolean;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, isLoading }) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'درآمد ماهانه (MRR)',
        data: data.mrr_data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        yAxisID: 'y',
      },
      {
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
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
              return `درآمد ماهانه: ${context.parsed.y.toLocaleString()} تومان`;
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
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

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
        <div className="h-80">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;