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

interface RevenueChartProps {
  data: {
    labels: string[];
    mrr_data: number[];
    growth_rate: number[];
    arr_data?: number[];
    revenue_forecast?: number[];
  };
  isLoading?: boolean;
  onTimeRangeChange?: (range: string) => void;
  currentTimeRange?: string;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ 
  data, 
  isLoading, 
  onTimeRangeChange,
  currentTimeRange = '30d'
}) => {
  const [viewType, setViewType] = useState<'mrr' | 'arr' | 'forecast'>('mrr');
  const [showGrowthRate, setShowGrowthRate] = useState(true);

  const timeRangeOptions = [
    { value: '7d', label: '7 روز' },
    { value: '30d', label: '30 روز' },
    { value: '90d', label: '90 روز' },
    { value: '1y', label: '1 سال' },
  ];

  const chartData = useMemo(() => {
    const getRevenueData = () => {
      switch (viewType) {
        case 'arr':
          return data.arr_data || data.mrr_data.map(mrr => mrr * 12);
        case 'forecast':
          return data.revenue_forecast || data.mrr_data;
        default:
          return data.mrr_data;
      }
    };

    const getRevenueLabel = () => {
      switch (viewType) {
        case 'arr':
          return 'درآمد سالانه (ARR)';
        case 'forecast':
          return 'پیش‌بینی درآمد';
        default:
          return 'درآمد ماهانه (MRR)';
      }
    };

    const getRevenueColor = () => {
      switch (viewType) {
        case 'arr':
          return {
            border: '#00FF88',
            background: 'rgba(0, 255, 136, 0.1)',
            glow: 'rgba(0, 255, 136, 0.4)',
          };
        case 'forecast':
          return {
            border: '#FF6B35',
            background: 'rgba(255, 107, 53, 0.1)',
            glow: 'rgba(255, 107, 53, 0.4)',
          };
        default:
          return {
            border: '#00D4FF',
            background: 'rgba(0, 212, 255, 0.1)',
            glow: 'rgba(0, 212, 255, 0.4)',
          };
      }
    };

    const revenueColor = getRevenueColor();
    const datasets = [
      {
        label: getRevenueLabel(),
        data: getRevenueData(),
        borderColor: revenueColor.border,
        backgroundColor: revenueColor.background,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: revenueColor.border,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 10,
        pointHoverBorderWidth: 3,
        yAxisID: 'y',
        shadowColor: revenueColor.glow,
        shadowBlur: 10,
      },
    ];

    if (showGrowthRate) {
      datasets.push({
        label: 'نرخ رشد (%)',
        data: data.growth_rate,
        borderColor: '#A55EEA',
        backgroundColor: 'rgba(165, 94, 234, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#A55EEA',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        yAxisID: 'y1',
        shadowColor: 'rgba(165, 94, 234, 0.4)',
        shadowBlur: 8,
      });
    }

    return {
      labels: data.labels,
      datasets,
    };
  }, [data, viewType, showGrowthRate]);

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
        borderColor: '#00D4FF',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
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
            return `ماه: ${context[0].label}`;
          },
          label: (context: any) => {
            if (context.datasetIndex === 0) {
              const suffix = viewType === 'arr' ? 'سالانه' : 'ماهانه';
              return `درآمد ${suffix}: ${context.parsed.y.toLocaleString()} تومان`;
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
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
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
            return value.toLocaleString() + ' تومان';
          },
        },
        border: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      ...(showGrowthRate && {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          grid: {
            drawOnChartArea: false,
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
      }),
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }), [viewType, showGrowthRate]);

  if (isLoading) {
    return (
      <motion.div
        variants={animationPresets.cardEntrance}
        initial="hidden"
        animate="visible"
      >
        <Card className={`${glassmorphismClasses.cardCrypto} border-[#00D4FF]/20 h-full`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <motion.div 
                className="w-8 h-8 bg-gradient-to-br from-[#00D4FF] to-[#0099CC] rounded-lg flex items-center justify-center"
                variants={cyberAnimations.cyberPulse}
                animate="animate"
              >
                <svg className="w-4 h-4 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>
              <span className={neonClasses.text.primary}>روند درآمد و رشد</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <motion.div 
                className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full"
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
      <Card className={`${glassmorphismClasses.cardCrypto} border-[#00D4FF]/20 hover:border-[#00D4FF]/40 
                       hover:shadow-[0_0_30px_rgba(0,212,255,0.2)] transition-all duration-300 h-full`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div 
                className="w-8 h-8 bg-gradient-to-br from-[#00D4FF] to-[#0099CC] rounded-lg flex items-center justify-center"
                whileHover={{ 
                  scale: 1.1,
                  boxShadow: "0 0 20px rgba(0,212,255,0.6)",
                  transition: { duration: 0.2 }
                }}
              >
                <svg className="w-4 h-4 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>
              <span className={neonClasses.text.primary}>روند درآمد و رشد</span>
            </div>
            <div className="flex items-center gap-2">
              {onTimeRangeChange && (
                <Select value={currentTimeRange} onValueChange={onTimeRangeChange}>
                  <SelectTrigger className={`w-24 h-8 text-xs ${glassmorphismClasses.base} 
                                             border-[#00D4FF]/30 hover:border-[#00D4FF]/60 
                                             text-[#B8BCC8] hover:text-[#00D4FF] transition-all duration-300`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={`${glassmorphismClasses.elevated} border-[#00D4FF]/30`}>
                    {timeRangeOptions.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        className="text-[#B8BCC8] hover:text-[#00D4FF] hover:bg-[#00D4FF]/10"
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
                variant={viewType === 'mrr' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('mrr')}
                className={viewType === 'mrr' 
                  ? `bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-black font-medium
                     hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all duration-300`
                  : `${glassmorphismClasses.base} border-[#00D4FF]/30 hover:border-[#00D4FF]/60 
                     hover:bg-[#00D4FF]/10 text-[#B8BCC8] hover:text-[#00D4FF] transition-all duration-300`
                }
              >
                MRR
              </Button>
              <Button
                variant={viewType === 'arr' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('arr')}
                className={viewType === 'arr' 
                  ? `bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-medium
                     hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all duration-300`
                  : `${glassmorphismClasses.base} border-[#00FF88]/30 hover:border-[#00FF88]/60 
                     hover:bg-[#00FF88]/10 text-[#B8BCC8] hover:text-[#00FF88] transition-all duration-300`
                }
              >
                ARR
              </Button>
              <Button
                variant={viewType === 'forecast' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('forecast')}
                className={viewType === 'forecast' 
                  ? `bg-gradient-to-r from-[#FF6B35] to-[#E55A2B] text-white font-medium
                     hover:shadow-[0_0_20px_rgba(255,107,53,0.4)] transition-all duration-300`
                  : `${glassmorphismClasses.base} border-[#FF6B35]/30 hover:border-[#FF6B35]/60 
                     hover:bg-[#FF6B35]/10 text-[#B8BCC8] hover:text-[#FF6B35] transition-all duration-300`
                }
              >
                پیش‌بینی
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGrowthRate(!showGrowthRate)}
              className={`text-xs ${glassmorphismClasses.base} border-[#A55EEA]/30 hover:border-[#A55EEA]/60 
                         hover:bg-[#A55EEA]/10 text-[#B8BCC8] hover:text-[#A55EEA] transition-all duration-300`}
            >
              {showGrowthRate ? 'مخفی کردن رشد' : 'نمایش رشد'}
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
                background: `radial-gradient(ellipse at center, ${getRevenueColor().glow} 0%, transparent 70%)`
              }}
            />
            <Line data={chartData} options={options} />
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RevenueChart;