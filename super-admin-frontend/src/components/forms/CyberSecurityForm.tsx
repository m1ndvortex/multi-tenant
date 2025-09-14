/**
 * Cybersecurity-themed Form Demo Component
 * Demonstrates all form enhancements with validation, accessibility, and animations
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Form, 
  FormField, 
  FormLabel, 
  FormMessage, 
  FormDescription,
  FormGroup,
  FormActions,
  useFormValidation 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ScanningLoader, 
  ButtonLoader 
} from '@/components/ui/loading';
import { SecurityValidation } from '@/lib/form-validation';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface CyberSecurityFormProps {
  rtl?: boolean;
  onSubmit?: (data: any) => Promise<void>;
}

const CyberSecurityForm: React.FC<CyberSecurityFormProps> = ({ 
  rtl = false, 
  onSubmit 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [securityLevel, setSecurityLevel] = useState([3]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    values,
    errors,
    setValue,
    setTouched,
    validate,
    reset,
    isValid,
  } = useFormValidation({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    domain: '',
    description: '',
    agreeToTerms: false,
    enableNotifications: true,
    userRole: '',
    securityLevel: 3,
  });

  const handleFormSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (onSubmit) {
        await onSubmit(formData);
      }
      
      console.log('Form submitted:', formData);
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!values.password) return null;
    return SecurityValidation.checkPasswordStrength(values.password);
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <motion.div
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(0,212,255,0.4)",
                "0 0 40px rgba(0,212,255,0.6)",
                "0 0 20px rgba(0,212,255,0.4)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-3 rounded-full bg-[#00D4FF]/20 border border-[#00D4FF]/30"
          >
            <Shield className="h-8 w-8 text-[#00D4FF]" />
          </motion.div>
          <h1 className={`text-3xl font-bold text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] ${rtl ? 'font-[Vazirmatn]' : ''}`}>
            {rtl ? 'فرم امنیت سایبری' : 'Cybersecurity Form Demo'}
          </h1>
        </div>
        <p className={`text-white/70 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
          {rtl 
            ? 'نمایش قابلیت‌های پیشرفته فرم با تم امنیت سایبری، اعتبارسنجی و انیمیشن‌ها'
            : 'Demonstrating advanced form capabilities with cybersecurity theming, validation, and animations'
          }
        </p>
      </motion.div>

      <Form 
        variant="cyber" 
        rtl={rtl} 
        animated={true}
        onSubmit={async (e) => {
          e.preventDefault();
          const validationRules = {
            username: (value: string) => {
              if (!value || value.trim() === '') return 'Username is required';
              if (value.length < 3) return 'Username must be at least 3 characters';
              if (value.length > 20) return 'Username must not exceed 20 characters';
              if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username must be alphanumeric and underscore only';
              return null;
            },
            email: (value: string) => {
              if (!value || value.trim() === '') return 'Email is required';
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
              return null;
            },
            password: (value: string) => {
              if (!value || value.trim() === '') return 'Password is required';
              const xssCheck = SecurityValidation.checkXSS(value);
              if (xssCheck) return xssCheck;
              
              const strength = SecurityValidation.checkPasswordStrength(value);
              if (!strength.isStrong) {
                return `Password is too weak. ${strength.feedback.join(', ')}`;
              }
              return null;
            },
            confirmPassword: (value: string) => {
              if (!value || value.trim() === '') return 'Please confirm your password';
              if (value !== values.password) return 'Passwords do not match';
              return null;
            },
            agreeToTerms: (value: boolean) => {
              if (!value) return 'You must agree to the terms and conditions';
              return null;
            },
          };
          
          if (validate(validationRules)) {
            await handleFormSubmit(values);
          }
        }}
      >
        {/* User Information Group */}
        <FormGroup 
          title={rtl ? 'اطلاعات کاربر' : 'User Information'}
          description={rtl ? 'اطلاعات اساسی حساب کاربری' : 'Basic account information'}
          rtl={rtl}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField rtl={rtl}>
              <FormLabel 
                variant="cyber" 
                required 
                rtl={rtl}
                htmlFor="username"
              >
                {rtl ? 'نام کاربری' : 'Username'}
              </FormLabel>
              <Input
                id="username"
                variant="cyber-glass"
                value={values.username}
                onChange={(e) => setValue('username', e.target.value)}
                onBlur={() => {
                  setTouched('username');
                }}
                placeholder={rtl ? 'نام کاربری خود را وارد کنید' : 'Enter your username'}
                className={rtl ? 'font-[Vazirmatn] text-right' : ''}
              />
              <FormMessage 
                variant={errors.username ? 'danger' : 'default'}
                rtl={rtl}
              >
                {errors.username}
              </FormMessage>
            </FormField>

            <FormField rtl={rtl}>
              <FormLabel 
                variant="success" 
                required 
                rtl={rtl}
                htmlFor="email"
              >
                {rtl ? 'ایمیل' : 'Email'}
              </FormLabel>
              <Input
                id="email"
                type="email"
                variant="cyber-success"
                value={values.email}
                onChange={(e) => setValue('email', e.target.value)}
                onBlur={() => {
                  setTouched('email');
                }}
                placeholder={rtl ? 'ایمیل خود را وارد کنید' : 'Enter your email'}
                className={rtl ? 'font-[Vazirmatn] text-right' : ''}
              />
              <FormMessage 
                variant={errors.email ? 'danger' : 'default'}
                rtl={rtl}
              >
                {errors.email}
              </FormMessage>
            </FormField>
          </div>
        </FormGroup>

        {/* Security Group */}
        <FormGroup 
          title={rtl ? 'تنظیمات امنیتی' : 'Security Settings'}
          description={rtl ? 'رمز عبور و تنظیمات امنیتی' : 'Password and security configuration'}
          rtl={rtl}
        >
          <div className="space-y-6">
            <FormField rtl={rtl}>
              <FormLabel 
                variant="warning" 
                required 
                rtl={rtl}
                htmlFor="password"
              >
                {rtl ? 'رمز عبور' : 'Password'}
              </FormLabel>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  variant="cyber-warning"
                  value={values.password}
                  onChange={(e) => setValue('password', e.target.value)}
                  onBlur={() => {
                    setTouched('password');
                  }}
                  placeholder={rtl ? 'رمز عبور قوی وارد کنید' : 'Enter a strong password'}
                  className={rtl ? 'font-[Vazirmatn] text-right pr-12' : 'pl-12'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 transform -translate-y-1/2 text-white/60 hover:text-[#FFB800] transition-colors ${rtl ? 'left-3' : 'right-3'}`}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {passwordStrength && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${rtl ? 'font-[Vazirmatn]' : ''}`}>
                      {rtl ? 'قدرت رمز عبور:' : 'Password Strength:'}
                    </span>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          passwordStrength.score >= 5 ? 'bg-[#00FF88]' :
                          passwordStrength.score >= 3 ? 'bg-[#FFB800]' : 'bg-[#FF4757]'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className={`text-xs ${
                      passwordStrength.score >= 5 ? 'text-[#00FF88]' :
                      passwordStrength.score >= 3 ? 'text-[#FFB800]' : 'text-[#FF4757]'
                    }`}>
                      {passwordStrength.score >= 5 ? (rtl ? 'قوی' : 'Strong') :
                       passwordStrength.score >= 3 ? (rtl ? 'متوسط' : 'Medium') : (rtl ? 'ضعیف' : 'Weak')}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-white/60 space-y-1">
                      {passwordStrength.feedback.map((feedback, index) => (
                        <div key={index} className={`flex items-center gap-2 ${rtl ? 'flex-row-reverse font-[Vazirmatn]' : ''}`}>
                          <AlertTriangle className="h-3 w-3 text-[#FFB800]" />
                          <span>{feedback}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
              
              <FormMessage 
                variant={errors.password ? 'danger' : 'default'}
                rtl={rtl}
              >
                {errors.password}
              </FormMessage>
            </FormField>

            <FormField rtl={rtl}>
              <FormLabel 
                variant="danger" 
                required 
                rtl={rtl}
                htmlFor="confirmPassword"
              >
                {rtl ? 'تأیید رمز عبور' : 'Confirm Password'}
              </FormLabel>
              <Input
                id="confirmPassword"
                type="password"
                variant="cyber-danger"
                value={values.confirmPassword}
                onChange={(e) => setValue('confirmPassword', e.target.value)}
                onBlur={() => {
                  setTouched('confirmPassword');
                }}
                placeholder={rtl ? 'رمز عبور را مجدداً وارد کنید' : 'Confirm your password'}
                className={rtl ? 'font-[Vazirmatn] text-right' : ''}
              />
              <FormMessage 
                variant={errors.confirmPassword ? 'danger' : values.confirmPassword && values.password === values.confirmPassword ? 'success' : 'default'}
                rtl={rtl}
              >
                {errors.confirmPassword || (values.confirmPassword && values.password === values.confirmPassword ? (rtl ? 'رمز عبور مطابقت دارد' : 'Passwords match') : '')}
              </FormMessage>
            </FormField>

            <FormField rtl={rtl}>
              <FormLabel 
                variant="cyber" 
                rtl={rtl}
                htmlFor="securityLevel"
              >
                {rtl ? 'سطح امنیتی' : 'Security Level'}
              </FormLabel>
              <div className="space-y-3">
                <Slider
                  variant="cyber-glass"
                  value={securityLevel}
                  onValueChange={(value) => {
                    setSecurityLevel(value);
                    setValue('securityLevel', value[0]);
                  }}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                  showValue={true}
                />
                <div className={`flex justify-between text-xs text-white/60 ${rtl ? 'font-[Vazirmatn]' : ''}`}>
                  <span>{rtl ? 'پایین' : 'Low'}</span>
                  <span>{rtl ? 'متوسط' : 'Medium'}</span>
                  <span>{rtl ? 'بالا' : 'High'}</span>
                </div>
              </div>
              <FormDescription rtl={rtl}>
                {rtl ? 'سطح امنیتی بالاتر محدودیت‌های بیشتری اعمال می‌کند' : 'Higher security levels apply stricter restrictions'}
              </FormDescription>
            </FormField>
          </div>
        </FormGroup>

        {/* Additional Information Group */}
        <FormGroup 
          title={rtl ? 'اطلاعات تکمیلی' : 'Additional Information'}
          rtl={rtl}
        >
          <div className="space-y-6">
            <FormField rtl={rtl}>
              <FormLabel 
                variant="default" 
                rtl={rtl}
                htmlFor="domain"
              >
                {rtl ? 'دامنه (اختیاری)' : 'Domain (Optional)'}
              </FormLabel>
              <Input
                id="domain"
                variant="cyber-search"
                value={values.domain}
                onChange={(e) => setValue('domain', e.target.value)}
                onBlur={() => {
                  setTouched('domain');
                }}
                placeholder={rtl ? 'example.com' : 'example.com'}
                className={rtl ? 'font-[Vazirmatn] text-right' : ''}
              />
              <FormMessage 
                variant={errors.domain ? 'danger' : 'default'}
                rtl={rtl}
              >
                {errors.domain}
              </FormMessage>
            </FormField>

            <FormField rtl={rtl}>
              <FormLabel 
                variant="default" 
                rtl={rtl}
                htmlFor="userRole"
              >
                {rtl ? 'نقش کاربر' : 'User Role'}
              </FormLabel>
              <Select
                value={values.userRole}
                onValueChange={(value) => setValue('userRole', value)}
              >
                <SelectTrigger id="userRole">
                  <SelectValue placeholder={rtl ? 'انتخاب نقش' : 'Select role'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{rtl ? 'مدیر' : 'Admin'}</SelectItem>
                  <SelectItem value="manager">{rtl ? 'مدیر کل' : 'Manager'}</SelectItem>
                  <SelectItem value="user">{rtl ? 'کاربر' : 'User'}</SelectItem>
                  <SelectItem value="viewer">{rtl ? 'بیننده' : 'Viewer'}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage 
                variant={errors.userRole ? 'danger' : 'default'}
                rtl={rtl}
              >
                {errors.userRole}
              </FormMessage>
            </FormField>

            <FormField rtl={rtl}>
              <FormLabel 
                variant="default" 
                rtl={rtl}
                htmlFor="description"
              >
                {rtl ? 'توضیحات' : 'Description'}
              </FormLabel>
              <Textarea
                id="description"
                variant="cyber-glass"
                textareaSize="lg"
                value={values.description}
                onChange={(e) => setValue('description', e.target.value)}
                onBlur={() => {
                  setTouched('description');
                }}
                placeholder={rtl ? 'توضیحات اضافی...' : 'Additional description...'}
                rtl={rtl}
                loading={isLoading}
              />
              <FormMessage 
                variant={errors.description ? 'danger' : 'default'}
                rtl={rtl}
              >
                {errors.description}
              </FormMessage>
            </FormField>
          </div>
        </FormGroup>

        {/* Preferences Group */}
        <FormGroup 
          title={rtl ? 'تنظیمات' : 'Preferences'}
          rtl={rtl}
        >
          <div className="space-y-6">
            <FormField rtl={rtl}>
              <div className={`flex items-center gap-3 ${rtl ? 'flex-row-reverse' : ''}`}>
                <Checkbox
                  id="agreeToTerms"
                  variant="cyber-glass"
                  checked={values.agreeToTerms}
                  onCheckedChange={(checked) => setValue('agreeToTerms', checked)}
                  animated={true}
                  rtl={rtl}
                />
                <Label 
                  htmlFor="agreeToTerms"
                  variant="cyber"
                  required
                  rtl={rtl}
                >
                  {rtl ? 'با شرایط و قوانین موافقم' : 'I agree to the terms and conditions'}
                </Label>
              </div>
              <FormMessage 
                variant={errors.agreeToTerms ? 'danger' : 'default'}
                rtl={rtl}
              >
                {errors.agreeToTerms}
              </FormMessage>
            </FormField>

            <FormField rtl={rtl}>
              <div className={`flex items-center justify-between ${rtl ? 'flex-row-reverse' : ''}`}>
                <div className={rtl ? 'text-right' : ''}>
                  <Label 
                    htmlFor="enableNotifications"
                    variant="success"
                    rtl={rtl}
                  >
                    {rtl ? 'فعال‌سازی اعلان‌ها' : 'Enable Notifications'}
                  </Label>
                  <FormDescription rtl={rtl}>
                    {rtl ? 'دریافت اعلان‌های امنیتی و به‌روزرسانی‌ها' : 'Receive security alerts and updates'}
                  </FormDescription>
                </div>
                <Switch
                  id="enableNotifications"
                  variant="cyber-success"
                  checked={values.enableNotifications}
                  onCheckedChange={(checked) => setValue('enableNotifications', checked)}
                  animated={true}
                  rtl={rtl}
                />
              </div>
            </FormField>
          </div>
        </FormGroup>

        {/* Loading State Demo */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <div className={`text-center ${rtl ? 'font-[Vazirmatn]' : ''}`}>
              <p className="text-white/90 mb-4">
                {rtl ? 'در حال پردازش اطلاعات...' : 'Processing information...'}
              </p>
              <ScanningLoader rtl={rtl} />
            </div>
          </motion.div>
        )}

        {/* Form Actions */}
        <FormActions rtl={rtl}>
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            disabled={isLoading}
            className="backdrop-blur-[16px] bg-white/[0.03] border border-[#FF4757]/30 text-[#FF4757] hover:bg-[#FF4757]/10 hover:border-[#FF4757]/50 hover:shadow-[0_0_15px_rgba(255,71,87,0.2)]"
          >
            <ButtonLoader loading={false} variant="danger" rtl={rtl}>
              {rtl ? 'پاک کردن' : 'Reset'}
            </ButtonLoader>
          </Button>
          
          <Button
            type="submit"
            variant="default"
            disabled={!isValid || isLoading}
            className="bg-gradient-to-r from-[#00D4FF]/20 to-[#00FF88]/20 border-[#00D4FF]/30 text-white hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] disabled:opacity-50"
          >
            <ButtonLoader loading={isLoading} variant="cyber" rtl={rtl}>
              {rtl ? 'ارسال فرم' : 'Submit Form'}
            </ButtonLoader>
          </Button>
        </FormActions>
      </Form>
    </div>
  );
};

export default CyberSecurityForm;