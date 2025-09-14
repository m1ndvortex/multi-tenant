/**
 * Error Resolution Dialog Component - Cybersecurity Theme
 * Provides interface for resolving errors with elevated glassmorphism and neon borders
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  FileText,
  Settings,
  ExternalLink,
  Copy
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ErrorLog, ErrorResolutionRequest } from '../../types/errorLogging';
import { glassmorphismClasses, neonClasses } from '../../lib/theme/cybersecurity';

interface ErrorResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resolutionData: ErrorResolutionRequest) => Promise<void>;
  errorId: string | null;
  error?: ErrorLog;
}

const ErrorResolutionDialog: React.FC<ErrorResolutionDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  error
}) => {
  const [resolutionData, setResolutionData] = useState<ErrorResolutionRequest>({
    notes: '',
    resolution_category: '',
    estimated_fix_time: undefined,
    requires_deployment: false,
    follow_up_required: false,
    related_ticket_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Reset form when dialog opens/closes
   */
  useEffect(() => {
    if (isOpen) {
      setResolutionData({
        notes: '',
        resolution_category: '',
        estimated_fix_time: undefined,
        requires_deployment: false,
        follow_up_required: false,
        related_ticket_id: ''
      });
      setSubmitError(null);
    }
  }, [isOpen]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resolutionData.notes?.trim()) {
      setSubmitError('Resolution notes are required');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(resolutionData);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to resolve error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (field: keyof ErrorResolutionRequest, value: any) => {
    setResolutionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Copy error details to clipboard
   */
  const copyErrorDetails = () => {
    if (!error) return;
    
    const details = `Error ID: ${error.id}
Type: ${error.error_type}
Message: ${error.error_message}
Endpoint: ${error.endpoint}
Severity: ${error.severity}
Occurrences: ${error.occurrence_count}
Last Occurrence: ${error.last_occurrence}
Stack Trace: ${error.stack_trace || 'N/A'}`;

    navigator.clipboard.writeText(details);
  };

  /**
   * Get severity styling with cybersecurity theme
   */
  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return `bg-[#FF4757]/20 text-[#FF4757] border border-[#FF4757]/30 ${neonClasses.glow.danger}`;
      case 'high':
        return `bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30 ${neonClasses.glow.warning}`;
      case 'medium':
        return `bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 ${neonClasses.glow.primary}`;
      case 'low':
        return `bg-[#5352ED]/20 text-[#5352ED] border border-[#5352ED]/30 ${neonClasses.glow.info}`;
      default:
        return 'bg-white/10 text-[#B8BCC8] border border-white/20';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${glassmorphismClasses.modal} border-[#00FF88]/30 ${neonClasses.glow.secondary}`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <CheckCircle className={`h-5 w-5 ${neonClasses.text.secondary}`} />
                  </motion.div>
                  <span className="text-white">Resolve Error</span>
                </DialogTitle>
                <DialogDescription className="text-[#B8BCC8]">
                  Provide resolution details and mark this error as resolved.
                </DialogDescription>
              </DialogHeader>

        {/* Error Details Summary */}
        {error && (
          <motion.div 
            className={`${glassmorphismClasses.base} rounded-lg p-4 space-y-3 border-white/10`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-white">Error Details</h4>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyErrorDetails}
                  className={`${glassmorphismClasses.base} border-[#A55EEA]/30 text-[#A55EEA] hover:bg-[#A55EEA]/10`}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </motion.div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Label className="text-xs text-[#6B7280]">Error Type</Label>
                <p className="font-medium text-white font-mono">{error.error_type}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label className="text-xs text-[#6B7280]">Severity</Label>
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Badge className={cn('capitalize', getSeverityColor(error.severity))}>
                    {error.severity}
                  </Badge>
                </motion.div>
              </motion.div>
              
              <motion.div 
                className="md:col-span-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label className="text-xs text-[#6B7280]">Error Message</Label>
                <p className="font-medium text-[#B8BCC8]">{error.error_message}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Label className="text-xs text-[#6B7280]">Endpoint</Label>
                <code className={`text-xs px-2 py-1 rounded font-mono ${glassmorphismClasses.base} border-[#00D4FF]/30 text-[#00D4FF]`}>
                  {error.method} {error.endpoint}
                </code>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Label className="text-xs text-[#6B7280]">Occurrences</Label>
                <p className={`font-medium ${neonClasses.text.numbers}`}>{error.occurrence_count}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Label className="text-xs text-[#6B7280]">Last Occurrence</Label>
                <p className="font-medium text-white font-mono">
                  {new Date(error.last_occurrence).toLocaleString()}
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Label className="text-xs text-[#6B7280]">First Occurrence</Label>
                <p className="font-medium text-white font-mono">
                  {new Date(error.first_occurrence).toLocaleString()}
                </p>
              </motion.div>
            </div>

            <AnimatePresence>
              {error.stack_trace && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <Label className="text-xs text-[#6B7280]">Stack Trace (Preview)</Label>
                  <pre className={`text-xs p-2 rounded max-h-20 overflow-y-auto font-mono ${glassmorphismClasses.base} border-[#FF6B35]/30 text-[#FF6B35] bg-[#FF6B35]/5`}>
                    {error.stack_trace.split('\n').slice(0, 3).join('\n')}
                    {error.stack_trace.split('\n').length > 3 && '\n...'}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Resolution Form */}
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Resolution Notes */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Label htmlFor="notes" className="flex items-center gap-2 text-[#B8BCC8]">
              <FileText className={`h-4 w-4 ${neonClasses.text.primary}`} />
              Resolution Notes *
            </Label>
            <Textarea
              id="notes"
              placeholder="Describe how this error was resolved, what caused it, and any preventive measures taken..."
              value={resolutionData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className={`mt-1 ${glassmorphismClasses.base} border-white/10 text-white placeholder:text-[#6B7280] focus:border-[#00D4FF]/50 focus:ring-[#00D4FF]/20`}
              required
            />
          </motion.div>

          {/* Resolution Category */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Label htmlFor="category" className="flex items-center gap-2 text-[#B8BCC8]">
              <Settings className={`h-4 w-4 ${neonClasses.text.warning}`} />
              Resolution Category
            </Label>
            <Select
              value={resolutionData.resolution_category}
              onValueChange={(value) => handleInputChange('resolution_category', value)}
            >
              <SelectTrigger className={`mt-1 ${glassmorphismClasses.base} border-white/10 text-white hover:border-[#FFB800]/30`}>
                <SelectValue placeholder="Select resolution category" />
              </SelectTrigger>
              <SelectContent className={`${glassmorphismClasses.elevated} border-white/10 bg-[#1A1D29]`}>
                <SelectItem value="code-fix" className="text-[#00FF88] hover:bg-[#00FF88]/10">Code Fix</SelectItem>
                <SelectItem value="configuration" className="text-[#00D4FF] hover:bg-[#00D4FF]/10">Configuration Change</SelectItem>
                <SelectItem value="infrastructure" className="text-[#A55EEA] hover:bg-[#A55EEA]/10">Infrastructure Issue</SelectItem>
                <SelectItem value="external-service" className="text-[#FF6B35] hover:bg-[#FF6B35]/10">External Service Issue</SelectItem>
                <SelectItem value="user-error" className="text-[#FFB800] hover:bg-[#FFB800]/10">User Error</SelectItem>
                <SelectItem value="data-issue" className="text-[#5352ED] hover:bg-[#5352ED]/10">Data Issue</SelectItem>
                <SelectItem value="monitoring-alert" className="text-[#00D4FF] hover:bg-[#00D4FF]/10">False Alert</SelectItem>
                <SelectItem value="duplicate" className="text-[#6B7280] hover:bg-white/10">Duplicate Error</SelectItem>
                <SelectItem value="other" className="text-white hover:bg-white/10">Other</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Estimated Fix Time */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Label htmlFor="fix-time" className="flex items-center gap-2 text-[#B8BCC8]">
              <Clock className={`h-4 w-4 ${neonClasses.text.tertiary}`} />
              Estimated Fix Time (minutes)
            </Label>
            <Input
              id="fix-time"
              type="number"
              placeholder="How long did it take to resolve?"
              value={resolutionData.estimated_fix_time || ''}
              onChange={(e) => handleInputChange('estimated_fix_time', 
                e.target.value ? parseInt(e.target.value) : undefined
              )}
              min="1"
              className={`mt-1 ${glassmorphismClasses.base} border-white/10 text-white placeholder:text-[#6B7280] focus:border-[#FF6B35]/50 focus:ring-[#FF6B35]/20`}
            />
          </motion.div>

          {/* Related Ticket ID */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Label htmlFor="ticket-id" className="flex items-center gap-2 text-[#B8BCC8]">
              <ExternalLink className={`h-4 w-4 ${neonClasses.text.info}`} />
              Related Ticket/Issue ID
            </Label>
            <Input
              id="ticket-id"
              placeholder="Link to support ticket, GitHub issue, etc."
              value={resolutionData.related_ticket_id}
              onChange={(e) => handleInputChange('related_ticket_id', e.target.value)}
              className={`mt-1 ${glassmorphismClasses.base} border-white/10 text-white placeholder:text-[#6B7280] focus:border-[#5352ED]/50 focus:ring-[#5352ED]/20 font-mono`}
            />
          </motion.div>

          {/* Additional Options */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <motion.div 
              className="flex items-center justify-between"
              whileHover={{ scale: 1.01 }}
            >
              <div>
                <Label className="font-medium text-white">Requires Deployment</Label>
                <p className="text-sm text-[#B8BCC8]">
                  Does this fix require a code deployment?
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={resolutionData.requires_deployment}
                  onCheckedChange={(checked) => handleInputChange('requires_deployment', checked)}
                  className="data-[state=checked]:bg-[#FFB800] data-[state=unchecked]:bg-white/20"
                />
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between"
              whileHover={{ scale: 1.01 }}
            >
              <div>
                <Label className="font-medium text-white">Follow-up Required</Label>
                <p className="text-sm text-[#B8BCC8]">
                  Should this error be monitored for recurrence?
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Switch
                  checked={resolutionData.follow_up_required}
                  onCheckedChange={(checked) => handleInputChange('follow_up_required', checked)}
                  className="data-[state=checked]:bg-[#A55EEA] data-[state=unchecked]:bg-white/20"
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Submit Error */}
          <AnimatePresence>
            {submitError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Alert className={`${glassmorphismClasses.base} border-[#FF4757]/30 bg-[#FF4757]/10 ${neonClasses.glow.danger}`}>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <AlertTriangle className={`h-4 w-4 ${neonClasses.text.danger}`} />
                  </motion.div>
                  <AlertDescription className="text-[#FF4757]">{submitError}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>

        <DialogFooter>
          <motion.div 
            className="flex gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className={`${glassmorphismClasses.base} border-white/20 text-[#B8BCC8] hover:border-[#6B7280]/50 hover:text-white`}
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: isSubmitting || !resolutionData.notes?.trim() ? 1 : 1.05 }} whileTap={{ scale: isSubmitting || !resolutionData.notes?.trim() ? 1 : 0.95 }}>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting || !resolutionData.notes?.trim()}
                className={`${
                  isSubmitting || !resolutionData.notes?.trim()
                    ? 'bg-[#6B7280]/20 border border-[#6B7280]/30 text-[#6B7280] cursor-not-allowed'
                    : `bg-[#00FF88]/20 border border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/30 ${neonClasses.glow.secondary}`
                }`}
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                    </motion.div>
                    Resolving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve Error
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </DialogFooter>
      </motion.div>
    </DialogContent>
  </Dialog>
)}
</AnimatePresence>
);
};

export default ErrorResolutionDialog;