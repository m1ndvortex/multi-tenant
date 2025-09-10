/**
 * Tenant Credentials Update Dialog
 * Dialog for updating tenant owner credentials (email and password)
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Mail, Lock, AlertTriangle } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantCredentialsUpdateRequest } from '@/types/enhancedTenant';
import { useUpdateTenantCredentials } from '@/hooks/useEnhancedTenants';

interface TenantCredentialsDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
}

const TenantCredentialsDialog: React.FC<TenantCredentialsDialogProps> = ({
  tenant,
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState<TenantCredentialsUpdateRequest>({
    email: '',
    password: '',
    reason: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string[];
  }>({ score: 0, feedback: [] });

  const updateCredentialsMutation = useUpdateTenantCredentials();

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (isOpen && tenant) {
      setFormData({
        email: tenant.email || '',
        password: '',
        reason: '',
      });
      setPasswordStrength({ score: 0, feedback: [] });
    } else if (!isOpen) {
      setFormData({ email: '', password: '', reason: '' });
      setPasswordStrength({ score: 0, feedback: [] });
    }
  }, [isOpen, tenant]);

  // Password strength validation
  const validatePasswordStrength = (password: string) => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('حداقل 8 کاراکتر');
    }

    if (/[A-Za-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('حداقل یک حرف');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('حداقل یک عدد');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
      feedback.push('عالی! شامل کاراکتر خاص');
    } else {
      feedback.push('کاراکتر خاص برای امنیت بیشتر');
    }

    return { score, feedback };
  };

  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, password }));
    if (password) {
      setPasswordStrength(validatePasswordStrength(password));
    } else {
      setPasswordStrength({ score: 0, feedback: [] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant) return;

    // Prepare update data (only include fields that have values)
    const updateData: TenantCredentialsUpdateRequest = {};
    
    if (formData.email && formData.email !== tenant.email) {
      updateData.email = formData.email;
    }
    
    if (formData.password && formData.password.trim()) {
      updateData.password = formData.password;
    }
    
    if (formData.reason && formData.reason.trim()) {
      updateData.reason = formData.reason;
    }

    // Validate that at least one field is being updated
    if (!updateData.email && !updateData.password) {
      return;
    }

    updateCredentialsMutation.mutate(
      { tenantId: tenant.id, data: updateData },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 1) return 'bg-red-500';
    if (score === 2) return 'bg-orange-500';
    if (score === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (score: number) => {
    if (score <= 1) return 'ضعیف';
    if (score === 2) return 'متوسط';
    if (score === 3) return 'خوب';
    return 'عالی';
  };

  if (!tenant) return null;

  const hasChanges = 
    (formData.email && formData.email !== tenant.email) ||
    (formData.password && formData.password.trim());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            به‌روزرسانی اطلاعات ورود تنانت
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Info */}
          <Card variant="gradient-blue">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">{tenant.name}</h3>
                  <p className="text-sm text-blue-700">
                    ایمیل فعلی: {tenant.email || 'تعریف نشده'}
                  </p>
                </div>
                <Badge variant="gradient-blue">
                  {tenant.subscription_type === 'pro' ? 'حرفه‌ای' : 'رایگان'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Email Update */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              ایمیل جدید (اختیاری)
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="example@domain.com"
              className="text-right"
            />
            {formData.email && formData.email !== tenant.email && (
              <p className="text-sm text-blue-600">
                ایمیل از "{tenant.email}" به "{formData.email}" تغییر خواهد کرد
              </p>
            )}
          </div>

          {/* Password Update */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              رمز عبور جدید (اختیاری)
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="رمز عبور جدید"
                className="text-right pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                      style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {getPasswordStrengthText(passwordStrength.score)}
                  </span>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <div className="text-xs text-gray-600">
                    {passwordStrength.feedback.join(' • ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">دلیل تغییر (اختیاری)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="دلیل این تغییر را بنویسید..."
              rows={3}
              className="text-right"
            />
          </div>

          {/* Warning */}
          {hasChanges && (
            <Card variant="professional">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800 mb-1">هشدار امنیتی</p>
                    <p className="text-orange-700">
                      تغییر اطلاعات ورود تنانت باعث قطع جلسات فعلی کاربر خواهد شد.
                      این عملیات در لاگ‌های سیستم ثبت می‌شود.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateCredentialsMutation.isPending}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="gradient-blue"
              disabled={!hasChanges || updateCredentialsMutation.isPending}
            >
              {updateCredentialsMutation.isPending ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TenantCredentialsDialog;