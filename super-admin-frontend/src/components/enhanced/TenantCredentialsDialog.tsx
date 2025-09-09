import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/enhanced-input';
import { Card, CardContent } from '@/components/ui/enhanced-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Key, Mail, AlertTriangle, CheckCircle } from 'lucide-react';
import { Tenant } from '@/types/tenant';

interface TenantCredentialsDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCredentials: (tenantId: string, credentials: TenantCredentialsData) => void;
  isLoading?: boolean;
}

export interface TenantCredentialsData {
  email?: string;
  password?: string;
}

const TenantCredentialsDialog: React.FC<TenantCredentialsDialogProps> = ({
  tenant,
  isOpen,
  onClose,
  onUpdateCredentials,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<TenantCredentialsData>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string[];
  }>({ score: 0, feedback: [] });

  React.useEffect(() => {
    if (tenant && isOpen) {
      setFormData({
        email: '',
        password: '',
      });
      setPasswordStrength({ score: 0, feedback: [] });
    }
  }, [tenant, isOpen]);

  const validatePassword = (password: string) => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('حداقل ۸ کاراکتر');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('حداقل یک حرف بزرگ انگلیسی');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('حداقل یک حرف کوچک انگلیسی');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('حداقل یک عدد');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('حداقل یک کاراکتر خاص');
    }

    return { score, feedback };
  };

  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, password }));
    if (password) {
      setPasswordStrength(validatePassword(password));
    } else {
      setPasswordStrength({ score: 0, feedback: [] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant) return;

    // Validate that at least one field is provided
    if (!formData.email?.trim() && !formData.password?.trim()) {
      return;
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return;
    }

    // Validate password strength if provided
    if (formData.password && passwordStrength.score < 3) {
      return;
    }

    const updateData: TenantCredentialsData = {};
    if (formData.email?.trim()) {
      updateData.email = formData.email.trim();
    }
    if (formData.password?.trim()) {
      updateData.password = formData.password.trim();
    }

    onUpdateCredentials(tenant.id, updateData);
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score < 2) return 'text-red-600';
    if (score < 4) return 'text-orange-600';
    return 'text-green-600';
  };

  const getPasswordStrengthText = (score: number) => {
    if (score < 2) return 'ضعیف';
    if (score < 4) return 'متوسط';
    return 'قوی';
  };

  const isFormValid = () => {
    const hasEmail = formData.email?.trim();
    const hasPassword = formData.password?.trim();
    
    if (!hasEmail && !hasPassword) return false;
    
    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email!)) return false;
    
    if (hasPassword && passwordStrength.score < 3) return false;
    
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-purple-600" />
            تغییر اطلاعات ورود تنانت
          </DialogTitle>
        </DialogHeader>

        {tenant && (
          <Card variant="gradient-super-admin">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-700 font-bold text-sm">
                    {tenant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{tenant.name}</h3>
                  <p className="text-sm text-slate-600">ID: {tenant.id.slice(0, 8)}...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            تغییر اطلاعات ورود تنانت تأثیر مستقیم بر دسترسی کاربران خواهد داشت. 
            فقط فیلدهایی که می‌خواهید تغییر دهید را پر کنید.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              ایمیل جدید (اختیاری)
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="example@domain.com"
              className="text-left"
              dir="ltr"
            />
            {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
              <p className="text-sm text-red-600">فرمت ایمیل صحیح نیست</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Key className="h-4 w-4" />
              رمز عبور جدید (اختیاری)
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="رمز عبور قوی وارد کنید"
                className="text-left pr-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">قدرت رمز عبور:</span>
                  <span className={`text-sm font-medium ${getPasswordStrengthColor(passwordStrength.score)}`}>
                    {getPasswordStrengthText(passwordStrength.score)}
                  </span>
                </div>
                
                {/* Strength Bar */}
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength.score < 2 
                        ? 'bg-red-500' 
                        : passwordStrength.score < 4 
                        ? 'bg-orange-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>

                {/* Feedback */}
                {passwordStrength.feedback.length > 0 && (
                  <div className="text-sm text-slate-600">
                    <p className="font-medium mb-1">برای بهبود رمز عبور:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {passwordStrength.feedback.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Success Message */}
          {formData.password && passwordStrength.score >= 4 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                رمز عبور قوی است و آماده استفاده می‌باشد.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="gradient"
              disabled={isLoading || !isFormValid()}
              className="flex-1"
            >
              {isLoading ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی اطلاعات ورود'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              انصراف
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TenantCredentialsDialog;