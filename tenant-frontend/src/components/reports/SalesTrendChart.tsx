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
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { SalesTrendData } from '@/services/reportService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SalesTrendChartProps {
  data: SalesTrendData[];
  period: 'daily' | 'weekly' | 'monthly';
  chartType?: 'line' | 'bar';
}

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ 
  data, 
  period, 
  chartType = 'line' 
}) => {
  const formatPeriodLabel = (period: string, periodType: string) => {
    if (periodType === 'daily') {
      return new Date(period).toLocaleDateString('fa-IR');
    } else if (periodType === 'weekly') {
      return `هفته ${period}`;
    } else {
      return new Date(period).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' });
    }
  };

  const chartData = {
    labels: data.map(item => formatPeriodLabel(item.period, period)),
    datasets: [
      {
        label: 'کل فروش',
        data: data.map(item => item.total_sales),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'مبلغ دریافتی',
        data: data.map(item => item.total_paid),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'فروش عمومی',
        data: data.map(item => item.general_sales),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
      },
      {
        label: 'فروش طلا',
        data: data.map(item => item.gold_sales),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
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
            family: 'IRANSans, Tahoma, Arial, sans-serif',
            size: 12,
          },
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: true,
        text: `روند فروش ${period === 'daily' ? 'روزانه' : period === 'weekly' ? 'هفتگی' : 'ماهانه'}`,
        font: {
          family: 'IRANSans, Tahoma, Arial, sans-serif',
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 30,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(34, 197, 94, 0.5)',
        borderWidth: 1,
        titleFont: {
          family: 'IRANSans, Tahoma, Arial, sans-serif',
          size: 14,
        },
        bodyFont: {
          family: 'IRANSans, Tahoma, Arial, sans-serif',
          size: 12,
        },
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = new Intl.NumberFormat('fa-IR').format(context.parsed.y);
            return `${label}: ${value} تومان`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            family: 'IRANSans, Tahoma, Arial, sans-serif',
            size: 11,
          },
          maxRotation: 45,
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            family: 'IRANSans, Tahoma, Arial, sans-serif',
            size: 11,
          },
          callback: function(value: any) {
            return new Intl.NumberFormat('fa-IR', {
              notation: 'compact',
              compactDisplay: 'short'
            }).format(value);
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className="h-96 w-full">
      {chartType === 'line' ? (
        <Line data={chartData} options={options} />
      ) : (
        <Bar data={chartData} options={options} />
      )}
    </div>
  );
};

export default SalesTrendChart;