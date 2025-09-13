import React, { useState, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
            border: '#00D4FF',
            background: 'rgba(0, 212, 255, 0.1)',
            glow: 'rgba(0, 212, 255, 0.4)',
          };
        case 'active':
          return {
            border: '#A55EEA',
            background: 'rgba(165, 94, 234, 0.1)',
            glow: 'rgba(165, 94, 234, 0.4)',
          };
        default:
          return {
            border: '#00FF88',
            background: 'rgba(0, 255, 136, 0.1)',
            glow: 'rgba(0, 255, 136, 0.4)',
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
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: showDataPoints ? 6 : 0,
          pointHoverRadius: 10,
          pointHoverBorderWidth: 3,
          shadowColor: colors.glow,
          shadowBlur: 10,
        },
      ],
    };
  }, [data, viewType, showDataPoints]);

  const options = useMemo(() => ({
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
            weight: '500',
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
        borderColor: chartData.datasets[0]?.borderColor || '#00FF88',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: false,
        padding: 12,
        titleFont: {
          family: "'Inter', system-ui, sans-serif",
          size: 13,
          weight: '600',
        },
        bodyFont: {
          family: "'JetBrains Mono', monospace",
          size: 12,
        },
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
            family: "'Inter', system-ui, sans-serif",
            size: 11,
          },
          color: '#6B7280',
          maxTicksLimit: 8,
        },
        border: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        beginAtZero: true,
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
            return value.toLocaleString() + ' نفر';
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
  }), [chartData, viewType]);

  if (isLoading) {
    return (
      <motion.div
        variants={animationPresets.cardEntrance}
        initial="hidden"
        animate="visible"
      >
        <Card className={`${glassmorphismClasses.cardCrypto} border-[#00FF88]/20 h-full`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <motion.div 
                className="w-8 h-8 bg-gradient-to-br from-[#00FF88] to-[#00CC6A] rounded-lg flex items-center justify-center"
                variants={cyberAnimations.cyberPulse}
                animate="animate"
              >
                <svg className="w-4 h-4 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </motion.div>
              <span className={neonClasses.text.secondary}>رشد کاربران</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <motion.div 
                className="w-8 h-8 border-2 border-[#00FF88] border-t-transparent rounded-full"
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
      <Card className={`${glassmorphismClasses.cardCrypto} border-[#00FF88]/20 hover:border-[#00FF88]/40 
                       hover:shadow-[0_0_30px_rgba(0,255,136,0.2)] transition-all duration-300 h-full`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div 
                className="w-8 h-8 bg-gradient-to-br from-[#00FF88] to-[#00CC6A] rounded-lg flex items-center justify-center"
                whileHover={{ 
                  scale: 1.1,
                  boxShadow: "0 0 20px rgba(0,255,136,0.6)",
                  transition: { duration: 0.2 }
                }}
              >
                <svg className="w-4 h-4 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </motion.div>
              <span className={neonClasses.text.secondary}>رشد کاربران</span>
            </div>
            <div className="flex items-center gap-2">
              {onTimeRangeChange && (
                <Select value={currentTimeRange} onValueChange={onTimeRangeChange}>
                  <SelectTrigger className={`w-24 h-8 text-xs ${glassmorphismClasses.base} 
                                             border-[#00FF88]/30 hover:border-[#00FF88]/60 
                                             text-[#B8BCC8] hover:text-[#00FF88] transition-all duration-300`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={`${glassmorphismClasses.elevated} border-[#00FF88]/30`}>
                    {timeRangeOptions.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        className="text-[#B8BCC8] hover:text-[#00FF88] hover:bg-[#00FF88]/10"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardTitle>
          
          {/* Cybersecurity Chart Controls */}
          <motion.div 
            className="flex items-center justify-between mb-4"
            variants={animationPresets.fadeIn}
          >
            <div className="flex items-center gap-2">
              <Button
                variant={viewType === 'new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('new')}
                className={viewType === 'new' 
                  ? `bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-medium
                     hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all duration-300`
                  : `${glassmorphismClasses.base} border-[#00FF88]/30 hover:border-[#00FF88]/60 
                     hover:bg-[#00FF88]/10 text-[#B8BCC8] hover:text-[#00FF88] transition-all duration-300`
                }
              >
                جدید
              </Button>
              <Button
                variant={viewType === 'cumulative' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('cumulative')}
                className={viewType === 'cumulative' 
                  ? `bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-black font-medium
                     hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all duration-300`
                  : `${glassmorphismClasses.base} border-[#00D4FF]/30 hover:border-[#00D4FF]/60 
                     hover:bg-[#00D4FF]/10 text-[#B8BCC8] hover:text-[#00D4FF] transition-all duration-300`
                }
              >
                مجموع
              </Button>
              <Button
                variant={viewType === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('active')}
                className={viewType === 'active' 
                  ? `bg-gradient-to-r from-[#A55EEA] to-[#8B46C7] text-white font-medium
                     hover:shadow-[0_0_20px_rgba(165,94,234,0.4)] transition-all duration-300`
                  : `${glassmorphismClasses.base} border-[#A55EEA]/30 hover:border-[#A55EEA]/60 
                     hover:bg-[#A55EEA]/10 text-[#B8BCC8] hover:text-[#A55EEA] transition-all duration-300`
                }
              >
                فعال
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDataPoints(!showDataPoints)}
              className={`text-xs ${glassmorphismClasses.base} border-[#6B7280]/30 hover:border-[#B8BCC8]/60 
                         hover:bg-[#B8BCC8]/10 text-[#6B7280] hover:text-[#B8BCC8] transition-all duration-300`}
            >
              {showDataPoints ? 'مخفی کردن نقاط' : 'نمایش نقاط'}
            </Button>
          </motion.div>
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
                background: `radial-gradient(ellipse at center, ${getColorForViewType().glow} 0%, transparent 70%)`
              }}
            />
            <Line data={chartData} options={options} />
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UserGrowthChart;