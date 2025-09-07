import React, { useState, useEffect } from 'react';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50 flex items-center justify-center p-4" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-teal-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Session expired alert */}
        {sessionExpired && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              جلسه شما منقضی شده است. لطفاً مجدداً وارد شوید.
            </AlertDescription>
          </Alert>
        )}

        <Card variant="professional" className="shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            {/* Logo/Icon */}
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              پنل مدیریت سوپر ادمین
            </CardTitle>
            <p className="text-slate-600 mt-2">
              برای ورود به سیستم مدیریت، اطلاعات خود را وارد کنید
            </p>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* General error */}
              {errors.general && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {errors.general}
                  </AlertDescription>
                </Alert>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  ایمیل
                </Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="admin@example.com"
                    className={cn(
                      "pr-10 h-12 border-slate-200 focus:border-green-500 focus:ring-green-500/20",
                      errors.email && "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                    )}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  رمز عبور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="رمز عبور خود را وارد کنید"
                    className={cn(
                      "pr-10 pl-10 h-12 border-slate-200 focus:border-green-500 focus:ring-green-500/20",
                      errors.password && "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                    )}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                variant="gradient-green"
                size="lg"
                className="w-full h-12 text-base font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    در حال ورود...
                  </div>
                ) : (
                  'ورود به سیستم'
                )}
              </Button>
            </form>

            {/* Security notice */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">اطلاعات امنیتی</p>
                  <p className="text-xs text-blue-700 mt-1">
                    این صفحه فقط برای مدیران سیستم است. تمام فعالیت‌ها ثبت و نظارت می‌شوند.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;