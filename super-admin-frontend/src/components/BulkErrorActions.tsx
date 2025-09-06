import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useBulkErrorAction } from '@/hooks/useErrorLogging';

interface BulkErrorActionsProps {
  selectedErrorIds: string[];
  onActionComplete: () => void;
}

export const BulkErrorActions: React.FC<BulkErrorActionsProps> = ({
  selectedErrorIds,
  onActionComplete,
}) => {
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  const bulkActionMutation = useBulkErrorAction();

  const handleBulkResolve = async () => {
    try {
      await bulkActionMutation.mutateAsync({
        error_ids: selectedErrorIds,
        action: 'resolve',
        notes: resolutionNotes || undefined,
      });
      
      setIsResolveDialogOpen(false);
      setResolutionNotes('');
      onActionComplete();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkActionMutation.mutateAsync({
        error_ids: selectedErrorIds,
        action: 'delete',
      });
      
      setIsDeleteDialogOpen(false);
      onActionComplete();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  if (selectedErrorIds.length === 0) {
    return null;
  }

  return (
    <Card variant="filter" className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-800">
                عملیات گروهی
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {selectedErrorIds.length} خطا انتخاب شده
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Bulk Resolve Dialog */}
            <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="gradient-green" size="sm">
                  حل گروهی
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>حل گروهی خطاها</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      آیا مطمئن هستید که می‌خواهید {selectedErrorIds.length} خطای انتخاب شده را به عنوان حل شده علامت‌گذاری کنید؟
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600 block mb-2">
                      یادداشت‌های حل مسئله (اختیاری)
                    </label>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="توضیحات مربوط به نحوه حل این خطاها..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsResolveDialogOpen(false)}
                      disabled={bulkActionMutation.isPending}
                    >
                      انصراف
                    </Button>
                    <Button
                      variant="gradient-green"
                      onClick={handleBulkResolve}
                      disabled={bulkActionMutation.isPending}
                    >
                      {bulkActionMutation.isPending ? 'در حال حل...' : 'تأیید حل'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Bulk Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  حذف گروهی
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>حذف گروهی خطاها</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-800 mb-1">هشدار: این عملیات غیرقابل بازگشت است</p>
                        <p className="text-sm text-red-700">
                          آیا مطمئن هستید که می‌خواهید {selectedErrorIds.length} خطای انتخاب شده را به طور کامل حذف کنید؟
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteDialogOpen(false)}
                      disabled={bulkActionMutation.isPending}
                    >
                      انصراف
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleBulkDelete}
                      disabled={bulkActionMutation.isPending}
                    >
                      {bulkActionMutation.isPending ? 'در حال حذف...' : 'تأیید حذف'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={onActionComplete}
            >
              لغو انتخاب
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};