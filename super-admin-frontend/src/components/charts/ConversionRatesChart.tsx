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
import { animationPresets, cyberAnimations } from '@/lib/theme/animations';
import { glassmorphismClasses, neonClasses } from '@/lib/theme/cybersecurity';

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

interface ConversionRatesChartProps {
  data: {
    labels: string[];
    free_to_pro: number[];
    churn_rate: number[];
  };
  isLoading?: boolean;
}

const ConversionRatesChart: React.FC<ConversionRatesChartProps> = ({ data, isLoading }) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'تبدیل رایگان به پرو (%)',
        data: data.free_to_pro,
        borderColor: '#00FF88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#00FF88',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 10,
        pointHoverBorderWidth: 3,
        shadowColor: 'rgba(0, 255, 136, 0.4)',
        shadowBlur: 10,
      },
      {
        label: 'نرخ ترک (%)',
        data: data.churn_rate,
        borderColor: '#FF4757',
        backgroundColor: 'rgba(255, 71, 87, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#FF4757',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 10,
        pointHoverBorderWidth: 3,
        shadowColor: 'rgba(255, 71, 87, 0.4)',
        shadowBlur: 10,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: "'Inter', system-ui, sans-serif",
            size: 12,
            weight: 500,
          },
          color: '#B8BCC8',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(11, 14, 26, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: '#B8BCC8',
        borderColor: '#00FF88',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        padding: 12,
        titleFont: {
          family: "'Inter', system-ui, sans-serif",
          size: 13,
          weight: 600,
        },
        bodyFont: {
          family: "'JetBrains Mono', monospace",
          size: 12,
        },
        callbacks: {
          title: (context: any) => {
            return `ماه: ${context[0].label}`;
          },
          label: (context: any) => {
            if (context.datasetIndex === 0) {
              return `تبدیل به پرو: ${context.parsed.y}%`;
            } else {
              return `نرخ ترک: ${context.parsed.y}%`;
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
            family: "'Inter', system-ui, sans-serif",
            size: 11,
          },
          color: '#6B7280',
        },
        border: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          lineWidth: 1,
        },
        ticks: {
          font: {
            family: "'JetBrains Mono', monospace",
            size: 11,
          },
          color: '#6B7280',
          callback: function(value: any) {
            return value + '%';
          },
        },
        border: {
          color: 'rgba(255, 255, 255, 0.1)',
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
      <motion.div
        variants={animationPresets.cardEntrance}
        initial="hidden"
        animate="visible"
      >
        <Card className={`${glassmorphismClasses.cardCrypto} border-[#FF6B35]/20 h-full`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <motion.div 
                className="w-8 h-8 bg-gradient-to-br from-[#FF6B35] to-[#E55A2B] rounded-lg flex items-center justify-center"
                variants={cyberAnimations.cyberPulse}
                animate="animate"
              >
                <svg className="w-4 h-4 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </motion.div>
              <span className={neonClasses.text.tertiary}>تبدیل اشتراک‌ها</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <motion.div 
                className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                role="status" 
                aria-label="Loading"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={animationPresets.cardEntrance}
      initial="hidden"
      animate="visible"
      whileHover="hover"
    >
      <Card className={`${glassmorphismClasses.cardCrypto} border-[#FF6B35]/20 hover:border-[#FF6B35]/40 
                       hover:shadow-[0_0_30px_rgba(255,107,53,0.2)] transition-all duration-300 h-full`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div 
              className="w-8 h-8 bg-gradient-to-br from-[#FF6B35] to-[#E55A2B] rounded-lg flex items-center justify-center"
              whileHover={{ 
                scale: 1.1,
                boxShadow: "0 0 20px rgba(255,107,53,0.6)",
                transition: { duration: 0.2 }
              }}
            >
              <svg className="w-4 h-4 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </motion.div>
            <span className={neonClasses.text.tertiary}>تبدیل اشتراک‌ها</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div 
            className="h-80 relative"
            variants={animationPresets.fadeIn}
          >
            {/* Glowing background effect */}
            <div 
              className="absolute inset-0 opacity-5 rounded-lg"
              style={{
                background: `radial-gradient(ellipse at center, rgba(255,107,53,0.4) 0%, transparent 70%)`
              }}
            />
            <Line data={chartData} options={options} />
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConversionRatesChart;