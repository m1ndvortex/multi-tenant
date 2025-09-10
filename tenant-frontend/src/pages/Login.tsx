import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-hidden" dir="rtl">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-700/10 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 opacity-[0.08]" style={{backgroundImage:"linear-gradient(to right, rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.12) 1px, transparent 1px)", backgroundSize:"24px 24px"}} />
        <motion.div
          aria-hidden
          className="absolute -inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"
          initial={{ y: -200, opacity: 0 }}
          animate={{ y: [0, 800], opacity: [0, 1, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 140, damping: 14 }}
            className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
          >
            <span className="text-white font-bold text-3xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">ح</span>
          </motion.div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(45,212,191,0.25)]">حساب پلاس</span>
          </h1>
          <p className="text-slate-300 text-lg">سیستم مدیریت کسب و کار</p>
          
          {/* Subscription Status */}
          {tenant && (
            <div className="mt-4 flex justify-center">
              {getSubscriptionBadge()}
            </div>
          )}
        </div>

        {/* Upgrade Prompt */}
        {showUpgradePrompt() && (
          <Card className="border border-emerald-500/20 bg-emerald-400/5 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.35)]">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-200">ارتقاء به اشتراک طلایی</h3>
                  <p className="text-sm text-emerald-300/80">
                    دسترسی به امکانات پیشرفته و گزارش‌های تحلیلی
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Login Form */}
        <Card className="border border-emerald-500/20 bg-slate-900/60 backdrop-blur-xl shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_20px_60px_-20px_rgba(16,185,129,0.25)]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">ورود به حساب کاربری</span>
            </CardTitle>
            <CardDescription className="text-slate-300">
              برای ادامه، لطفاً اطلاعات خود را وارد کنید
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Error Alert */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <Alert className="border-red-500/30 bg-red-500/10 text-red-200">
                      <AlertCircle className="h-4 w-4 text-red-300" />
                      <AlertDescription className="text-red-200">{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200 font-medium">
                  آدرس ایمیل
                </Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@domain.com"
                    className={cn(
                      "pr-10 transition-all duration-300 bg-slate-900/40 border-slate-700 text-slate-100 placeholder:text-slate-400",
                      "focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400",
                      errors.email && "border-red-500/60 focus:border-red-400 focus:ring-red-400/20"
                    )}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-300">{errors.email.message}</motion.p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200 font-medium">
                  رمز عبور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="رمز عبور خود را وارد کنید"
                    className={cn(
                      "pr-10 pl-10 transition-all duration-300 bg-slate-900/40 border-slate-700 text-slate-100 placeholder:text-slate-400",
                      "focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400",
                      errors.password && "border-red-500/60 focus:border-red-400 focus:ring-red-400/20"
                    )}
                    {...register('password')}
                  />
                  <motion.button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    whileTap={{ scale: 0.95 }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                  >
                    <motion.span animate={{ rotate: showPassword ? 180 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </motion.span>
                  </motion.button>
                </div>
                {errors.password && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-300">{errors.password.message}</motion.p>
                )}
              </div>

              {/* Optional Tenant ID Field for multi-tenant login */}
              <div className="space-y-2">
                <Label htmlFor="tenant_id" className="text-slate-200 font-medium">
                  شناسه مستاجر (اختیاری)
                </Label>
                <Input
                  id="tenant_id"
                  type="text"
                  placeholder={tenant?.id || 'مثال: 716e5d59-1a31-43f7-ab22-3ef14ca18e26'}
                  className={cn(
                    "transition-all duration-300 bg-slate-900/40 border-slate-700 text-slate-100 placeholder:text-slate-400",
                    "focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400",
                    errors.tenant_id && "border-red-500/60 focus:border-red-400 focus:ring-red-400/20"
                  )}
                  {...register('tenant_id')}
                />
                {errors.tenant_id && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-300">{errors.tenant_id.message}</motion.p>
                )}
              </div>

              {/* Login Button */}
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  type="submit"
                  variant="gradient-green"
                  size="lg"
                  className="relative w-full shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ورود...</span>
                    </div>
                  ) : (
                    <>
                      <span>ورود به سیستم</span>
                      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg [mask-image:linear-gradient(0deg,transparent,black,transparent)]">
                        <motion.div
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                          className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                        />
                      </span>
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-slate-400">
          <p>© ۱۴۰۳ حساب پلاس. تمامی حقوق محفوظ است.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;