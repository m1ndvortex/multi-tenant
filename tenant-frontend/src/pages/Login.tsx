import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Persian validation messages
// Treat empty tenant_id as undefined so the field remains truly optional
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'ایمیل الزامی است')
    .email('فرمت ایمیل صحیح نیست'),
  password: z
    .string()
    .min(1, 'رمز عبور الزامی است')
    .min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
  tenant_id: z
    .preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
      z.string().uuid('شناسه مستاجر نامعتبر است').optional()
    ),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
  await login(data.email, data.password, data.tenant_id || tenant?.id);
  onLoginSuccess?.();
  navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Persian error messages
      if (err.response?.status === 401) {
        setError('ایمیل یا رمز عبور اشتباه است');
      } else if (err.response?.status === 403) {
        setError('حساب کاربری شما غیرفعال است');
      } else if (err.response?.status === 429) {
        setError('تعداد تلاش‌های ورود بیش از حد مجاز. لطفاً بعداً تلاش کنید');
      } else {
        setError('خطا در ورود به سیستم. لطفاً دوباره تلاش کنید');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getSubscriptionBadge = () => {
    if (!tenant) return null;

    const isExpired = tenant.subscription_expires_at && 
      new Date(tenant.subscription_expires_at) < new Date();

    if (tenant.subscription_type === 'pro' && !isExpired) {
      return (
        <Badge className="bg-gradient-to-r from-purple-500 to-violet-600 text-white border-0">
          <Crown className="w-3 h-3 ml-1" />
          اشتراک طلایی
        </Badge>
      );
    } else if (tenant.subscription_type === 'pro' && isExpired) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 ml-1" />
          اشتراک منقضی شده
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gradient-to-r from-green-500 to-teal-600 text-white border-0">
          <Zap className="w-3 h-3 ml-1" />
          اشتراک رایگان
        </Badge>
      );
    }
  };

  const showUpgradePrompt = () => {
    if (!tenant) return false;
    
    const isExpired = tenant.subscription_expires_at && 
      new Date(tenant.subscription_expires_at) < new Date();
    
    return tenant.subscription_type === 'free' || isExpired;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-white font-bold text-3xl">ح</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-700 bg-clip-text text-transparent mb-2">
            حساب پلاس
          </h1>
          <p className="text-slate-600 text-lg">سیستم مدیریت کسب و کار</p>
          
          {/* Subscription Status */}
          {tenant && (
            <div className="mt-4 flex justify-center">
              {getSubscriptionBadge()}
            </div>
          )}
        </div>

        {/* Upgrade Prompt */}
        {showUpgradePrompt() && (
          <Card variant="gradient-purple" className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">ارتقاء به اشتراک طلایی</h3>
                  <p className="text-sm text-slate-600">
                    دسترسی به امکانات پیشرفته و گزارش‌های تحلیلی
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Login Form */}
        <Card variant="professional" className="border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-slate-800">ورود به حساب کاربری</CardTitle>
            <CardDescription className="text-slate-600">
              برای ادامه، لطفاً اطلاعات خود را وارد کنید
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">
                  آدرس ایمیل
                </Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@domain.com"
                    className={cn(
                      "pr-10 transition-all duration-300",
                      "focus:ring-2 focus:ring-green-500/20 focus:border-green-500",
                      errors.email && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  رمز عبور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="رمز عبور خود را وارد کنید"
                    className={cn(
                      "pr-10 pl-10 transition-all duration-300",
                      "focus:ring-2 focus:ring-green-500/20 focus:border-green-500",
                      errors.password && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Optional Tenant ID Field for multi-tenant login */}
              <div className="space-y-2">
                <Label htmlFor="tenant_id" className="text-slate-700 font-medium">
                  شناسه مستاجر (اختیاری)
                </Label>
                <Input
                  id="tenant_id"
                  type="text"
                  placeholder={tenant?.id || 'مثال: 716e5d59-1a31-43f7-ab22-3ef14ca18e26'}
                  className={cn(
                    "transition-all duration-300",
                    "focus:ring-2 focus:ring-green-500/20 focus:border-green-500",
                    errors.tenant_id && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                  {...register('tenant_id')}
                />
                {errors.tenant_id && (
                  <p className="text-sm text-red-600">{errors.tenant_id.message}</p>
                )}
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                variant="gradient-green"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>در حال ورود...</span>
                  </div>
                ) : (
                  'ورود به سیستم'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500">
          <p>© ۱۴۰۳ حساب پلاس. تمامی حقوق محفوظ است.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;