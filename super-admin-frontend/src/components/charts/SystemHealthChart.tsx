import React from 'react';
import { motion } from 'framer-motion';
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
        borderColor: 'rgb(0, 212, 255)',
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(0, 212, 255)',
        pointBorderColor: 'rgba(11, 14, 26, 0.8)',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgb(0, 212, 255)',
        pointHoverBorderColor: 'white',
        pointHoverBorderWidth: 2,
        shadowColor: 'rgba(0, 212, 255, 0.5)',
        shadowBlur: 10,
      },
      {
        label: 'Memory Usage (%)',
        data: data.map(item => item.memory_usage),
        borderColor: 'rgb(0, 255, 136)',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(0, 255, 136)',
        pointBorderColor: 'rgba(11, 14, 26, 0.8)',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgb(0, 255, 136)',
        pointHoverBorderColor: 'white',
        pointHoverBorderWidth: 2,
        shadowColor: 'rgba(0, 255, 136, 0.5)',
        shadowBlur: 10,
      },
      {
        label: 'Disk Usage (%)',
        data: data.map(item => item.disk_usage),
        borderColor: 'rgb(255, 107, 53)',
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(255, 107, 53)',
        pointBorderColor: 'rgba(11, 14, 26, 0.8)',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgb(255, 107, 53)',
        pointHoverBorderColor: 'white',
        pointHoverBorderWidth: 2,
        shadowColor: 'rgba(255, 107, 53, 0.5)',
        shadowBlur: 10,
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
          color: 'rgb(203, 213, 225)',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(11, 14, 26, 0.95)',
        titleColor: 'rgb(0, 212, 255)',
        bodyColor: 'white',
        borderColor: 'rgb(0, 212, 255)',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 12,
        },
        padding: 12,
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
          display: true,
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false,
        },
        ticks: {
          font: {
            family: 'Inter',
            size: 10,
          },
          color: 'rgb(148, 163, 184)',
          maxTicksLimit: 10,
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false,
        },
        ticks: {
          font: {
            family: 'Inter',
            size: 11,
          },
          color: 'rgb(148, 163, 184)',
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
    elements: {
      point: {
        hoverRadius: 8,
      },
      line: {
        borderJoinStyle: 'round' as const,
        borderCapStyle: 'round' as const,
      },
    },
  };

  if (isLoading) {
    return (
      <Card className="glass-card-crypto border-cyan-500/30 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div 
              className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center border border-cyan-400/30"
              animate={{ 
                boxShadow: [
                  '0 0 10px rgba(0, 212, 255, 0.3)',
                  '0 0 20px rgba(0, 212, 255, 0.5)',
                  '0 0 10px rgba(0, 212, 255, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </motion.div>
            <span className="text-white">نمودار سلامت سیستم</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <motion.div 
              className="rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              role="status" 
              aria-label="Loading"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card-crypto border-cyan-500/30 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div 
              className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center border border-cyan-400/30"
              animate={{ 
                boxShadow: [
                  '0 0 10px rgba(0, 212, 255, 0.3)',
                  '0 0 20px rgba(0, 212, 255, 0.5)',
                  '0 0 10px rgba(0, 212, 255, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </motion.div>
            <span className="text-white">نمودار سلامت سیستم</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div 
            className="h-80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Line data={chartData} options={options} />
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SystemHealthChart;