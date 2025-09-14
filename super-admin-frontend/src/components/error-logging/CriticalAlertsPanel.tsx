/**
 * Critical Alerts Panel Component - Cybersecurity Theme
 * Displays critical error alerts with cybersecurity aesthetics and neon effects
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  Server,
  Zap,
  ExternalLink,
  Bell,
  CheckCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { CriticalErrorAlert } from '../../types/errorLogging';
import { glassmorphismClasses, neonClasses } from '../../lib/theme/cybersecurity';

interface CriticalAlertsPanelProps {
  alerts: CriticalErrorAlert[];
  isLoading: boolean;
  compact?: boolean;
  onResolveAlert?: (alertId: string) => void;
  onViewDetails?: (alert: CriticalErrorAlert) => void;
  className?: string;
}

const CriticalAlertsPanel: React.FC<CriticalAlertsPanelProps> = ({
  alerts,
  isLoading,
  compact = false,
  onResolveAlert,
  onViewDetails,
  className
}) => {
  /**
   * Format time since last occurrence
   */
  const formatTimeSince = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  /**
   * Get alert priority styling with cybersecurity theme
   */
  const getAlertPriorityColor = (alert: CriticalErrorAlert): string => {
    if (alert.requires_immediate_attention) {
      return `${glassmorphismClasses.card} border-l-4 border-l-[#FF4757] ${neonClasses.glow.danger}`;
    }
    if (alert.is_escalated) {
      return `${glassmorphismClasses.card} border-l-4 border-l-[#FFB800] ${neonClasses.glow.warning}`;
    }
    return `${glassmorphismClasses.card} border-l-4 border-l-[#00D4FF] ${neonClasses.glow.primary}`;
  };

  /**
   * Get severity badge styling with neon effects
   */
  const getSeverityBadgeColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return `bg-[#FF4757]/20 text-[#FF4757] border border-[#FF4757]/30 ${neonClasses.glow.danger}`;
      case 'high':
        return `bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30 ${neonClasses.glow.warning}`;
      default:
        return `bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 ${neonClasses.glow.primary}`;
    }
  };

  /**
   * Get category icon
   */
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'system':
        return <Server className="h-4 w-4" />;
      case 'database':
        return <Server className="h-4 w-4" />;
      case 'api':
        return <Zap className="h-4 w-4" />;
      case 'authentication':
        return <Users className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[...Array(3)].map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`${glassmorphismClasses.card} animate-pulse`}>
              <CardContent className="p-4">
                <div className="flex space-x-4">
                  <div className="h-4 bg-white/10 rounded w-1/4"></div>
                  <div className="h-4 bg-white/10 rounded w-1/2"></div>
                  <div className="h-4 bg-white/10 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <motion.div 
        className={cn('text-center py-8', className)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(0, 255, 136, 0.3)',
              '0 0 30px rgba(0, 255, 136, 0.5)',
              '0 0 20px rgba(0, 255, 136, 0.3)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <CheckCircle className={`h-12 w-12 mx-auto mb-4 ${neonClasses.text.secondary}`} />
        </motion.div>
        <h3 className="text-lg font-medium text-white mb-2">No Critical Alerts</h3>
        <p className="text-[#B8BCC8]">
          All systems are running smoothly. No critical errors detected.
        </p>
      </motion.div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Alert */}
      {alerts.length > 0 && !compact && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert className={`${glassmorphismClasses.base} border-[#FF4757]/30 bg-[#FF4757]/10 ${neonClasses.glow.danger}`}>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle className={`h-4 w-4 ${neonClasses.text.danger}`} />
            </motion.div>
            <AlertDescription className="text-white">
              <strong className={neonClasses.text.danger}>
                {alerts.length} critical alert{alerts.length > 1 ? 's' : ''}
              </strong> requiring attention.
              {alerts.filter(a => a.requires_immediate_attention).length > 0 && (
                <span className="ml-2">
                  <span className={neonClasses.text.warning}>
                    {alerts.filter(a => a.requires_immediate_attention).length} require immediate action.
                  </span>
                </span>
              )}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Alerts List */}
      <AnimatePresence>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <Card 
                className={cn(
                  'transition-all duration-300 hover:shadow-2xl cursor-pointer',
                  getAlertPriorityColor(alert)
                )}
              >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Alert Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      {getCategoryIcon(alert.category)}
                    </motion.div>
                    <Badge 
                      className={cn('capitalize', getSeverityBadgeColor(alert.severity))}
                    >
                      {alert.severity}
                    </Badge>
                    {alert.requires_immediate_attention && (
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          boxShadow: [
                            '0 0 10px rgba(255, 71, 87, 0.5)',
                            '0 0 20px rgba(255, 71, 87, 0.8)',
                            '0 0 10px rgba(255, 71, 87, 0.5)'
                          ]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Badge className={`bg-[#FF4757]/20 text-[#FF4757] border border-[#FF4757]/30 ${neonClasses.glow.danger}`}>
                          <Bell className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                      </motion.div>
                    )}
                    {alert.is_escalated && (
                      <Badge className={`bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30 ${neonClasses.glow.warning}`}>
                        Escalated
                      </Badge>
                    )}
                  </div>

                  {/* Error Type and Message */}
                  <div className="mb-2">
                    <h4 className="font-semibold text-white mb-1 font-mono">
                      {alert.error_type}
                    </h4>
                    <p className="text-sm text-[#B8BCC8] line-clamp-2">
                      {alert.error_message}
                    </p>
                  </div>

                  {/* Alert Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-[#B8BCC8]">
                    <div className="flex items-center gap-1">
                      <Server className={`h-3 w-3 ${neonClasses.text.info}`} />
                      <span className="font-mono text-xs text-[#00D4FF]">
                        {alert.endpoint}
                      </span>
                    </div>
                    
                    {alert.tenant_name && (
                      <div className="flex items-center gap-1">
                        <Users className={`h-3 w-3 ${neonClasses.text.purple}`} />
                        <span>{alert.tenant_name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Zap className={`h-3 w-3 ${neonClasses.text.warning}`} />
                      <span className={neonClasses.text.numbers}>
                        {alert.occurrence_count}
                      </span>
                      <span> occurrence{alert.occurrence_count > 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Clock className={`h-3 w-3 ${neonClasses.text.tertiary}`} />
                      <span>{formatTimeSince(alert.last_occurrence)}</span>
                    </div>
                  </div>

                  {/* Time Range */}
                  {!compact && (
                    <div className="mt-3 text-xs text-[#6B7280] font-mono">
                      <span className="text-[#00D4FF]">First seen:</span> {new Date(alert.first_occurrence).toLocaleString()} • 
                      <span className="text-[#00FF88]">Last seen:</span> {new Date(alert.last_occurrence).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {onViewDetails && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(alert)}
                        className={`${glassmorphismClasses.base} border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/10 ${neonClasses.glow.primary}`}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </motion.div>
                  )}
                  
                  {onResolveAlert && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="sm"
                        onClick={() => onResolveAlert(alert.id)}
                        className={`bg-[#00FF88]/20 border border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/30 ${neonClasses.glow.secondary}`}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolve
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Priority Indicator */}
              {alert.requires_immediate_attention && (
                <motion.div 
                  className={`mt-3 p-2 ${glassmorphismClasses.base} border-[#FF4757]/30 bg-[#FF4757]/10 rounded-md ${neonClasses.glow.danger}`}
                  animate={{ 
                    boxShadow: [
                      '0 0 10px rgba(255, 71, 87, 0.3)',
                      '0 0 20px rgba(255, 71, 87, 0.6)',
                      '0 0 10px rgba(255, 71, 87, 0.3)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="flex items-center gap-2 text-[#FF4757] text-sm">
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Bell className="h-4 w-4" />
                    </motion.div>
                    <span className="font-medium">Immediate attention required</span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  </AnimatePresence>

      {/* Compact View: Show More Button */}
      {compact && alerts.length > 3 && (
        <motion.div 
          className="text-center pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="outline" 
              size="sm"
              className={`${glassmorphismClasses.base} border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/10 ${neonClasses.glow.primary}`}
            >
              View All {alerts.length} Critical Alerts
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* Action Summary */}
      {!compact && alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className={`${glassmorphismClasses.card} border-[#5352ED]/30 ${neonClasses.glow.info}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-[#5352ED] mb-1">
                    Alert Summary
                  </h4>
                  <p className="text-sm text-[#B8BCC8]">
                    <span className={neonClasses.text.danger}>
                      {alerts.filter(a => a.requires_immediate_attention).length} urgent alerts
                    </span> • 
                    <span className={neonClasses.text.warning}>
                      {alerts.filter(a => a.is_escalated).length} escalated
                    </span> • 
                    <span className={neonClasses.text.secondary}>
                      {alerts.filter(a => a.occurrence_count > 10).length} high frequency
                    </span>
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={`${glassmorphismClasses.base} border-[#A55EEA]/30 text-[#A55EEA] hover:bg-[#A55EEA]/10`}
                    >
                      Export Report
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      size="sm"
                      className={`bg-[#FFB800]/20 border border-[#FFB800]/30 text-[#FFB800] hover:bg-[#FFB800]/30 ${neonClasses.glow.warning}`}
                    >
                      Escalate All
                    </Button>
                  </motion.div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default CriticalAlertsPanel;