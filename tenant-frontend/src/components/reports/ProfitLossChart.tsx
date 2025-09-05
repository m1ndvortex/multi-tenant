import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ProfitLossData } from '@/services/reportService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ProfitLossChartProps {
  data: ProfitLossData;
  chartType?: 'bar' | 'doughnut';
}

const ProfitLossChart: React.FC<ProfitLossChartProps> = ({ 
  data, 
  chartType = 'bar' 
}) => {
  const categoryChartData = {
    labels: data.categories.map((cat) => cat.name),
    datasets: [
      {
        label: 'درآمد',
        data: data.categories.map((cat) => cat.revenue),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
      },
      {
        label: 'هزینه کالا',
        data: data.categories.map((cat) => cat.cost_of_goods),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
      },
      {
        label: 'سود ناخالص',
        data: data.categories.map((cat) => cat.gross_profit),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      },
    ],
  };

  const overallChartData = {
    labels: ['درآمد کل', 'هزینه کالا', 'سود ناخالص'],
    datasets: [
      {
        data: [data.total_revenue, data.cost_of_goods_sold, data.gross_profit],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(59, 130, 246)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const revenueBreakdownData = {
    labels: ['فروش عمومی', 'فروش طلا'],
    datasets: [
      {
        data: [data.general_revenue, data.gold_revenue],
        backgroundColor: [
          'rgba(168, 85, 247, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
        borderColor: [
          'rgb(168, 85, 247)',
          'rgb(245, 158, 11)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const barOptions = {
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
        text: 'تحلیل سود و زیان بر اساس دسته‌بندی',
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
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
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
        text: 'تقسیم‌بندی درآمد',
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
            const label = context.label || '';
            const value = new Intl.NumberFormat('fa-IR').format(context.parsed);
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${label}: ${value} تومان (${percentage}%)`;
          },
        },
      },
    },
  };

  if (chartType === 'doughnut') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80">
          <Doughnut data={overallChartData} options={{
            ...doughnutOptions,
            plugins: {
              ...doughnutOptions.plugins,
              title: {
                ...doughnutOptions.plugins.title,
                text: 'تحلیل کلی سود و زیان',
              },
            },
          }} />
        </div>
        <div className="h-80">
          <Doughnut data={revenueBreakdownData} options={doughnutOptions} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 w-full">
      <Bar data={categoryChartData} options={barOptions} />
    </div>
  );
};

export default ProfitLossChart;