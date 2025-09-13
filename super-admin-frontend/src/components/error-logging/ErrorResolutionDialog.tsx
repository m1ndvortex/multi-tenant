/**
 * Error Resolution Dialog Component
 * Provides interface for resolving errors with admin tracking
 */

import React, { useState, useEffect } from 'react';
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
  errorId: _errorId,
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
   * Get severity color
   */
  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Resolve Error
          </DialogTitle>
          <DialogDescription>
            Provide resolution details and mark this error as resolved.
          </DialogDescription>
        </DialogHeader>

        {/* Error Details Summary */}
        {error && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Error Details</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={copyErrorDetails}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-xs text-gray-500">Error Type</Label>
                <p className="font-medium">{error.error_type}</p>
              </div>
              
              <div>
                <Label className="text-xs text-gray-500">Severity</Label>
                <Badge className={cn('capitalize', getSeverityColor(error.severity))}>
                  {error.severity}
                </Badge>
              </div>
              
              <div className="md:col-span-2">
                <Label className="text-xs text-gray-500">Error Message</Label>
                <p className="font-medium text-gray-900">{error.error_message}</p>
              </div>
              
              <div>
                <Label className="text-xs text-gray-500">Endpoint</Label>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {error.method} {error.endpoint}
                </code>
              </div>
              
              <div>
                <Label className="text-xs text-gray-500">Occurrences</Label>
                <p className="font-medium">{error.occurrence_count}</p>
              </div>
              
              <div>
                <Label className="text-xs text-gray-500">Last Occurrence</Label>
                <p className="font-medium">
                  {new Date(error.last_occurrence).toLocaleString()}
                </p>
              </div>
              
              <div>
                <Label className="text-xs text-gray-500">First Occurrence</Label>
                <p className="font-medium">
                  {new Date(error.first_occurrence).toLocaleString()}
                </p>
              </div>
            </div>

            {error.stack_trace && (
              <div>
                <Label className="text-xs text-gray-500">Stack Trace (Preview)</Label>
                <pre className="text-xs bg-gray-100 p-2 rounded max-h-20 overflow-y-auto">
                  {error.stack_trace.split('\n').slice(0, 3).join('\n')}
                  {error.stack_trace.split('\n').length > 3 && '\n...'}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Resolution Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resolution Notes */}
          <div>
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resolution Notes *
            </Label>
            <Textarea
              id="notes"
              placeholder="Describe how this error was resolved, what caused it, and any preventive measures taken..."
              value={resolutionData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className="mt-1"
              required
            />
          </div>

          {/* Resolution Category */}
          <div>
            <Label htmlFor="category" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Resolution Category
            </Label>
            <Select
              value={resolutionData.resolution_category}
              onValueChange={(value) => handleInputChange('resolution_category', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select resolution category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code-fix">Code Fix</SelectItem>
                <SelectItem value="configuration">Configuration Change</SelectItem>
                <SelectItem value="infrastructure">Infrastructure Issue</SelectItem>
                <SelectItem value="external-service">External Service Issue</SelectItem>
                <SelectItem value="user-error">User Error</SelectItem>
                <SelectItem value="data-issue">Data Issue</SelectItem>
                <SelectItem value="monitoring-alert">False Alert</SelectItem>
                <SelectItem value="duplicate">Duplicate Error</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Fix Time */}
          <div>
            <Label htmlFor="fix-time" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
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
              className="mt-1"
            />
          </div>

          {/* Related Ticket ID */}
          <div>
            <Label htmlFor="ticket-id" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Related Ticket/Issue ID
            </Label>
            <Input
              id="ticket-id"
              placeholder="Link to support ticket, GitHub issue, etc."
              value={resolutionData.related_ticket_id}
              onChange={(e) => handleInputChange('related_ticket_id', e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Requires Deployment</Label>
                <p className="text-sm text-gray-500">
                  Does this fix require a code deployment?
                </p>
              </div>
              <Switch
                checked={resolutionData.requires_deployment}
                onCheckedChange={(checked) => handleInputChange('requires_deployment', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Follow-up Required</Label>
                <p className="text-sm text-gray-500">
                  Should this error be monitored for recurrence?
                </p>
              </div>
              <Switch
                checked={resolutionData.follow_up_required}
                onCheckedChange={(checked) => handleInputChange('follow_up_required', checked)}
              />
            </div>
          </div>

          {/* Submit Error */}
          {submitError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !resolutionData.notes?.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Resolving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolve Error
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorResolutionDialog;