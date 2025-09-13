import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { animationPresets, cyberAnimations } from '@/lib/theme/animations';
import { glassmorphismClasses, neonClasses } from '@/lib/theme/cybersecurity';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface InvoiceVolumeChartProps {
  data: {
    labels: string[];
    data: number[];
    general_invoices?: number[];
    gold_invoices?: number[];
    average_value?: number[];
  };
  isLoading?: boolean;
  onTimeRangeChange?: (range: string) => void;
  currentTimeRange?: string;
}

const InvoiceVolumeChart: React.FC<InvoiceVolumeChartProps> = ({ 
  data, 
  isLoading, 
  onTimeRangeChange,
  currentTimeRange = '30d'
}) => {
  const [viewType, setViewType] = useState<'total' | 'breakdown' | 'trend'>('total');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const timeRangeOptions = [
    { value: '7d', label: '7 روز' },
    { value: '30d', label: '30 روز' },
    { value: '90d', label: '90 روز' },
    { value: '1y', label: '1 سال' },
  ];

  const chartData = useMemo(() => {
    const getDatasets = () => {
      switch (viewType) {
        case 'breakdown':
          return [
            {
              label: 'فاکتور عمومی',
              data: data.general_invoices || data.data.map(d => Math.floor(d * 0.7)),
              backgroundColor: 'rgba(0, 255, 136, 0.8)',
              borderColor: '#00FF88',
              borderWidth: 2,
              borderRadius: chartType === 'bar' ? 8 : 0,
              borderSkipped: false,
              shadowColor: 'rgba(0, 255, 136, 0.4)',
              shadowBlur: 10,
            },
            {
              label: 'فاکتور طلا',
              data: data.gold_invoices || data.data.map(d => Math.floor(d * 0.3)),
              backgroundColor: 'rgba(255, 184, 0, 0.8)',
              borderColor: '#FFB800',
              borderWidth: 2,
              borderRadius: chartType === 'bar' ? 8 : 0,
              borderSkipped: false,
              shadowColor: 'rgba(255, 184, 0, 0.4)',
              shadowBlur: 10,
            },
          ];
        case 'trend':
          return [
            {
              label: 'تعداد فاکتور',
              data: data.data,
              backgroundColor: chartType === 'bar' ? 'rgba(165, 94, 234, 0.8)' : 'rgba(165, 94, 234, 0.1)',
              borderColor: '#A55EEA',
              borderWidth: chartType === 'line' ? 3 : 2,
              borderRadius: chartType === 'bar' ? 8 : 0,
              borderSkipped: false,
              fill: chartType === 'line',
              tension: chartType === 'line' ? 0.4 : 0,
              pointBackgroundColor: chartType === 'line' ? '#A55EEA' : undefined,
              pointBorderColor: chartType === 'line' ? '#FFFFFF' : undefined,
              pointBorderWidth: chartType === 'line' ? 2 : undefined,
              pointRadius: chartType === 'line' ? 6 : undefined,
              pointHoverRadius: chartType === 'line' ? 10 : undefined,
              shadowColor: 'rgba(165, 94, 234, 0.4)',
              shadowBlur: 10,
            },
            ...(data.average_value ? [{
              label: 'میانگین ارزش (تومان)',
              data: data.average_value,
              type: 'line' as const,
              backgroundColor: 'rgba(0, 212, 255, 0.1)',
              borderColor: '#00D4FF',
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              pointBackgroundColor: '#00D4FF',
              pointBorderColor: '#FFFFFF',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 8,
              yAxisID: 'y1',
              shadowColor: 'rgba(0, 212, 255, 0.4)',
              shadowBlur: 8,
            }] : []),
          ];
        default:
          return [
            {
              label: 'تعداد فاکتور',
              data: data.data,
              backgroundColor: 'rgba(165, 94, 234, 0.8)',
              borderColor: '#A55EEA',
              borderWidth: 2,
              borderRadius: chartType === 'bar' ? 8 : 0,
              borderSkipped: false,
              shadowColor: 'rgba(165, 94, 234, 0.4)',
              shadowBlur: 10,
            },
          ];
      }
    };

    return {
      labels: data.labels,
      datasets: getDatasets(),
    };
  }, [data, viewType, chartType]);

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
          pointStyle: chartType === 'line' ? 'circle' : 'rect',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(11, 14, 26, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: '#B8BCC8',
        borderColor: '#A55EEA',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: viewType === 'breakdown',
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
            if (context.dataset.yAxisID === 'y1') {
              return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} تومان`;
            }
            return `${context.dataset.label}: ${context.parsed.y} عدد`;
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
            return value + ' عدد';
          },
        },
        border: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      ...(viewType === 'trend' && data.average_value && {
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
              return value.toLocaleString() + ' تومان';
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
  }), [viewType, chartType, data.average_value]);

  if (isLoading) {
    return (
      <motion.div
        variants={animationPresets.cardEntrance}
        initial="hidden"
        animate="visible"
      >
        <Card className={`${glassmorphismClasses.cardCrypto} border-[#A55EEA]/20 h-full`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <motion.div 
                className="w-8 h-8 bg-gradient-to-br from-[#A55EEA] to-[#8B46C7] rounded-lg flex items-center justify-center"
                variants={cyberAnimations.cyberPulse}
                animate="animate"
              >
                <svg className="w-4 h-4 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </motion.div>
              <span className={neonClasses.text.purple}>حجم فاکتورها</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <motion.div 
                className="w-8 h-8 border-2 border-[#A55EEA] border-t-transparent rounded-full"
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
      <Card className={`${glassmorphismClasses.cardCrypto} border-[#A55EEA]/20 hover:border-[#A55EEA]/40 
                       hover:shadow-[0_0_30px_rgba(165,94,234,0.2)] transition-all duration-300 h-full`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div 
                className="w-8 h-8 bg-gradient-to-br from-[#A55EEA] to-[#8B46C7] rounded-lg flex items-center justify-center"
                whileHover={{ 
                  scale: 1.1,
                  boxShadow: "0 0 20px rgba(165,94,234,0.6)",
                  transition: { duration: 0.2 }
                }}
              >
                <svg className="w-4 h-4 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </motion.div>
              <span className={neonClasses.text.purple}>حجم فاکتورها</span>
            </div>
            <div className="flex items-center gap-2">
              {onTimeRangeChange && (
                <Select value={currentTimeRange} onValueChange={onTimeRangeChange}>
                  <SelectTrigger className={`w-24 h-8 text-xs ${glassmorphismClasses.base} 
                                             border-[#A55EEA]/30 hover:border-[#A55EEA]/60 
                                             text-[#B8BCC8] hover:text-[#A55EEA] transition-all duration-300`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={`${glassmorphismClasses.elevated} border-[#A55EEA]/30`}>
                    {timeRangeOptions.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        className="text-[#B8BCC8] hover:text-[#A55EEA] hover:bg-[#A55EEA]/10"
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
                variant={viewType === 'total' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('total')}
                className={viewType === 'total' 
                  ? `bg-gradient-to-r from-[#A55EEA] to-[#8B46C7] text-white font-medium
                     hover:shadow-[0_0_20px_rgba(165,94,234,0.4)] transition-all duration-300`
                  : `${glassmorphismClasses.base} border-[#A55EEA]/30 hover:border-[#A55EEA]/60 
                     hover:bg-[#A55EEA]/10 text-[#B8BCC8] hover:text-[#A55EEA] transition-all duration-300`
                }
              >
                کل
              </Button>
              <Button
                variant={viewType === 'breakdown' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('breakdown')}
                className={viewType === 'breakdown' 
                  ? `bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-medium
                     hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all duration-300`
                  : `${glassmorphismClasses.base} border-[#00FF88]/30 hover:border-[#00FF88]/60 
                     hover:bg-[#00FF88]/10 text-[#B8BCC8] hover:text-[#00FF88] transition-all duration-300`
                }
              >
                تفکیک
              </Button>
              <Button
                variant={viewType === 'trend' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('trend')}
                className={viewType === 'trend' 
                  ? `bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-black font-medium
                     hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all duration-300`
                  : `${glassmorphismClasses.base} border-[#00D4FF]/30 hover:border-[#00D4FF]/60 
                     hover:bg-[#00D4FF]/10 text-[#B8BCC8] hover:text-[#00D4FF] transition-all duration-300`
                }
              >
                روند
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
                className={chartType === 'bar' 
                  ? `bg-gradient-to-r from-[#A55EEA] to-[#8B46C7] text-white font-medium text-xs
                     hover:shadow-[0_0_15px_rgba(165,94,234,0.4)] transition-all duration-300`
                  : `${glassmorphismClasses.base} border-[#6B7280]/30 hover:border-[#B8BCC8]/60 
                     hover:bg-[#B8BCC8]/10 text-[#6B7280] hover:text-[#B8BCC8] text-xs transition-all duration-300`
                }
              >
                ستونی
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className={chartType === 'line' 
                  ? `bg-gradient-to-r from-[#A55EEA] to-[#8B46C7] text-white font-medium text-xs
                     hover:shadow-[0_0_15px_rgba(165,94,234,0.4)] transition-all duration-300`
                  : `${glassmorphismClasses.base} border-[#6B7280]/30 hover:border-[#B8BCC8]/60 
                     hover:bg-[#B8BCC8]/10 text-[#6B7280] hover:text-[#B8BCC8] text-xs transition-all duration-300`
                }
              >
                خطی
              </Button>
            </div>
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
                background: `radial-gradient(ellipse at center, rgba(165,94,234,0.4) 0%, transparent 70%)`
              }}
            />
            {chartType === 'line' ? (
              <Line data={chartData as any} options={options} />
            ) : (
              <Bar data={chartData as any} options={options} />
            )}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default InvoiceVolumeChart;