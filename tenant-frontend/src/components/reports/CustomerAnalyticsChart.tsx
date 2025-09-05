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
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { CustomerAnalyticsData } from '@/services/reportService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface CustomerAnalyticsChartProps {
  data: CustomerAnalyticsData;
  chartType?: 'top-customers' | 'segmentation' | 'purchase-patterns';
}

const CustomerAnalyticsChart: React.FC<CustomerAnalyticsChartProps> = ({ 
  data, 
  chartType = 'top-customers' 
}) => {
  const topCustomersData = {
    labels: data.top_customers.slice(0, 10).map((customer) => customer.customer_name),
    datasets: [
      {
        label: 'ارزش مشتری (تومان)',
        data: data.top_customers.slice(0, 10).map((customer) => customer.total_spent),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
      },
      {
        label: 'مبلغ پرداختی (تومان)',
        data: data.top_customers.slice(0, 10).map((customer) => customer.total_paid),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      },
    ],
  };

  const segmentationData = {
    labels: Object.keys(data.customer_segmentation),
    datasets: [
      {
        data: Object.values(data.customer_segmentation),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(168, 85, 247)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const purchasePatternsData = {
    labels: Object.keys(data.monthly_purchase_patterns),
    datasets: [
      {
        label: 'تعداد خرید',
        data: Object.values(data.monthly_purchase_patterns),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
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
        text: 'برترین مشتریان بر اساس ارزش',
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
            return `${label}: ${value}`;
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
            size: 10,
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
        text: 'تقسیم‌بندی مشتریان',
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
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} نفر (${percentage}%)`;
          },
        },
      },
    },
  };

  const lineOptions = {
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
        text: 'الگوی خرید ماهانه مشتریان',
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
            const value = context.parsed.y;
            return `${label}: ${value} خرید`;
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
        },
      },
    },
  };

  if (chartType === 'segmentation') {
    return (
      <div className="h-80 w-full">
        <Doughnut data={segmentationData} options={doughnutOptions} />
      </div>
    );
  }

  if (chartType === 'purchase-patterns') {
    return (
      <div className="h-80 w-full">
        <Line data={purchasePatternsData} options={lineOptions} />
      </div>
    );
  }

  return (
    <div className="h-96 w-full">
      <Bar data={topCustomersData} options={barOptions} />
    </div>
  );
};

export default CustomerAnalyticsChart;