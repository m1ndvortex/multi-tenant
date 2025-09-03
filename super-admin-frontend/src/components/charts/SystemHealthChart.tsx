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
import { SystemHealthMetrics } from '@/services/analyticsService';

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

interface SystemHealthChartProps {
  data: SystemHealthMetrics[];
  isLoading?: boolean;
}

const SystemHealthChart: React.FC<SystemHealthChartProps> = ({ data, isLoading }) => {
  const labels = data.map(item => {
    const date = new Date(item.timestamp);
    return date.toLocaleTimeString('fa-IR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'CPU Usage (%)',
        data: data.map(item => item.cpu_usage),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: 'white',
        pointBorderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Memory Usage (%)',
        data: data.map(item => item.memory_usage),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: 'white',
        pointBorderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Disk Usage (%)',
        data: data.map(item => item.disk_usage),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
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
        borderColor: 'rgb(148, 163, 184)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context: any) => {
            return `زمان: ${context[0].label}`;
          },
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y}%`;
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
            size: 10,
          },
          color: 'rgb(100, 116, 139)',
          maxTicksLimit: 10,
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
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
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            نمودار سلامت سیستم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" role="status" aria-label="Loading"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional" className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          نمودار سلامت سیستم
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

export default SystemHealthChart;