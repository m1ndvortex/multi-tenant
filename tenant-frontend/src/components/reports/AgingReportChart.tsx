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
import { AgingReportResponse } from '@/services/reportService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AgingReportChartProps {
  data: AgingReportResponse;
  chartType?: 'bar' | 'doughnut';
}

const AgingReportChart: React.FC<AgingReportChartProps> = ({ 
  data, 
  chartType = 'bar' 
}) => {
  // Prepare data for aging buckets
  const bucketData = {
    labels: data.buckets.map((bucket) => bucket.name),
    datasets: [
      {
        label: 'مبلغ (تومان)',
        data: data.buckets.map((bucket) => bucket.amount),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // Current - Green
          'rgba(245, 158, 11, 0.8)',  // 1-30 days - Amber
          'rgba(249, 115, 22, 0.8)',  // 31-60 days - Orange
          'rgba(239, 68, 68, 0.8)',   // 61-90 days - Red
          'rgba(127, 29, 29, 0.8)',   // Over 90 days - Dark Red
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(245, 158, 11)',
          'rgb(249, 115, 22)',
          'rgb(239, 68, 68)',
          'rgb(127, 29, 29)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Top overdue customers data
  const topOverdueCustomers = data.customers
    .filter((customer) => customer.total_balance > customer.current)
    .sort((a, b) => (b.total_balance - b.current) - (a.total_balance - a.current))
    .slice(0, 10);

  const topOverdueData = {
    labels: topOverdueCustomers.map((customer) => customer.customer_name),
    datasets: [
      {
        label: 'جاری',
        data: topOverdueCustomers.map((customer) => customer.current),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
      },
      {
        label: '۱-۳۰ روز',
        data: topOverdueCustomers.map((customer) => customer.days_1_30),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgb(245, 158, 11)',
        borderWidth: 2,
      },
      {
        label: '۳۱-۶۰ روز',
        data: topOverdueCustomers.map((customer) => customer.days_31_60),
        backgroundColor: 'rgba(249, 115, 22, 0.8)',
        borderColor: 'rgb(249, 115, 22)',
        borderWidth: 2,
      },
      {
        label: '۶۱-۹۰ روز',
        data: topOverdueCustomers.map((customer) => customer.days_61_90),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
      },
      {
        label: 'بیش از ۹۰ روز',
        data: topOverdueCustomers.map((customer) => customer.over_90_days),
        backgroundColor: 'rgba(127, 29, 29, 0.8)',
        borderColor: 'rgb(127, 29, 29)',
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
        text: chartType === 'bar' && topOverdueCustomers.length > 0 
          ? 'مشتریان با بیشترین بدهی معوق' 
          : 'گزارش سنی حساب‌های دریافتنی',
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
        stacked: true,
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
        stacked: true,
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
        text: 'توزیع سنی حساب‌های دریافتنی',
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
      <div className="h-80 w-full">
        <Doughnut data={bucketData} options={doughnutOptions} />
      </div>
    );
  }

  // Show bucket data if no overdue customers, otherwise show top overdue customers
  const chartData = topOverdueCustomers.length > 0 ? topOverdueData : bucketData;
  const options = topOverdueCustomers.length > 0 ? barOptions : {
    ...barOptions,
    scales: {
      ...barOptions.scales,
      x: { ...barOptions.scales.x, stacked: false },
      y: { ...barOptions.scales.y, stacked: false },
    },
  };

  return (
    <div className="h-96 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default AgingReportChart;