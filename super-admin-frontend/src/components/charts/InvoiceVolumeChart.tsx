import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface InvoiceVolumeChartProps {
  data: {
    labels: string[];
    data: number[];
  };
  isLoading?: boolean;
}

const InvoiceVolumeChart: React.FC<InvoiceVolumeChartProps> = ({ data, isLoading }) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'تعداد فاکتور',
        data: data.data,
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgb(168, 85, 247)',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
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
          pointStyle: 'rect',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(168, 85, 247)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            return `تاریخ: ${context[0].label}`;
          },
          label: (context: any) => {
            return `تعداد فاکتور: ${context.parsed.y} عدد`;
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
        <div className="h-80">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceVolumeChart;