import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Check if user was redirected due to session expiry
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('expired') === 'true') {
      setSessionExpired(true);
    }
  }, [location]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'ایمیل الزامی است';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'فرمت ایمیل صحیح نیست';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'رمز عبور الزامی است';
    } else if (formData.password.length < 6) {
      newErrors.password = 'رمز عبور باید حداقل ۶ کاراکتر باشد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear specific field error when user starts typing
    if (errors[name as keyof LoginFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await login(formData.email, formData.password);
      // Navigation will be handled by the useEffect above
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'خطا در ورود به سیستم';
      
      if (error.response?.status === 401) {
        errorMessage = 'ایمیل یا رمز عبور اشتباه است';
      } else if (error.response?.status === 403) {
        errorMessage = 'شما دسترسی به پنل مدیریت ندارید';
      } else if (error.response?.status >= 500) {
        errorMessage = 'خطا در سرور. لطفاً بعداً تلاش کنید';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" dir="rtl">
        <div className="relative">
          <div className="absolute inset-0 blur-md bg-emerald-500/30 rounded-full animate-pulse"></div>
          <div className="relative animate-spin rounded-full h-10 w-10 border-2 border-emerald-400 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100 overflow-hidden" dir="rtl">
      {/* Animated background grid + glow */}
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

      <div className="relative w-full max-w-md">
        {/* Session expired alert */}
        <AnimatePresence>
          {sessionExpired && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <Alert className="mb-6 border-amber-400/30 bg-amber-500/10 text-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-300" />
                <AlertDescription className="text-amber-200">
                  جلسه شما منقضی شده است. لطفاً مجدداً وارد شوید.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border border-emerald-500/20 bg-slate-900/60 backdrop-blur-xl shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_20px_60px_-20px_rgba(16,185,129,0.25)]">
            <CardHeader className="text-center pb-2">
              {/* Logo/Icon */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 140, damping: 14 }}
                className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.35)] bg-gradient-to-br from-emerald-500 to-teal-600"
              >
                <Shield className="w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
              </motion.div>
              
              <CardTitle className="text-2xl font-bold">
                <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(45,212,191,0.25)]">
                  پنل مدیریت سوپر ادمین
                </span>
              </CardTitle>
              <p className="text-slate-300 mt-2">برای ورود به سیستم مدیریت، اطلاعات خود را وارد کنید</p>
            </CardHeader>

            <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* General error */}
              <AnimatePresence>
                {errors.general && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <Alert className="border-red-500/30 bg-red-500/10 text-red-200">
                      <AlertCircle className="h-4 w-4 text-red-300" />
                      <AlertDescription className="text-red-200">
                        {errors.general}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-200">
                  ایمیل
                </Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="admin@example.com"
                    className={cn(
                      "pr-10 h-12 bg-slate-900/40 border-slate-700 text-slate-100 placeholder:text-slate-400",
                      "focus:border-emerald-400 focus:ring-emerald-400/20",
                      errors.email && "border-red-500/60 focus:border-red-400 focus:ring-red-400/20"
                    )}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-300">
                    {errors.email}
                  </motion.p>
                )}
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-200">
                  رمز عبور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="رمز عبور خود را وارد کنید"
                    className={cn(
                      "pr-10 pl-10 h-12 bg-slate-900/40 border-slate-700 text-slate-100 placeholder:text-slate-400",
                      "focus:border-emerald-400 focus:ring-emerald-400/20",
                      errors.password && "border-red-500/60 focus:border-red-400 focus:ring-red-400/20"
                    )}
                    disabled={isSubmitting}
                  />
                  <motion.button
                    type="button"
                    onClick={togglePasswordVisibility}
                    whileTap={{ scale: 0.95 }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    disabled={isSubmitting}
                    aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                  >
                    <motion.span animate={{ rotate: showPassword ? 180 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </motion.span>
                  </motion.button>
                </div>
                {errors.password && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-300">
                    {errors.password}
                  </motion.p>
                )}
              </div>

              {/* Submit button */}
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  type="submit"
                  variant="gradient-green"
                  size="lg"
                  className="relative w-full h-12 text-base font-medium shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      در حال ورود...
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

            {/* Security notice */}
              <div className="mt-6 p-4 rounded-lg border border-emerald-500/20 bg-emerald-400/5">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-emerald-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-200">اطلاعات امنیتی</p>
                    <p className="text-xs text-emerald-300/80 mt-1">
                      این صفحه فقط برای مدیران سیستم است. تمام فعالیت‌ها ثبت و نظارت می‌شوند.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;