import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Save, User, Building, Crown, Phone, Tag, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { customerService, Customer, CustomerCreate, CustomerUpdate } from '@/services/customerService';
import { useToast } from '@/hooks/use-toast';

const customerSchema = z.object({
  name: z.string().min(1, 'نام الزامی است'),
  email: z.string().email('ایمیل معتبر وارد کنید').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('ایران'),
  customer_type: z.enum(['INDIVIDUAL', 'BUSINESS', 'VIP']).default('INDIVIDUAL'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).default('ACTIVE'),
  credit_limit: z.number().min(0).default(0),
  notes: z.string().optional(),
  preferred_contact_method: z.enum(['phone', 'email', 'sms']).default('phone'),
  email_notifications: z.boolean().default(true),
  sms_notifications: z.boolean().default(true),
  business_name: z.string().optional(),
  tax_id: z.string().optional(),
  business_type: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onSave: (customer: Customer) => void;
  onCancel: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>(customer?.tags || []);
  const [newTag, setNewTag] = useState('');
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer ? {
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      mobile: customer.mobile || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      postal_code: customer.postal_code || '',
      country: customer.country || 'ایران',
      customer_type: customer.customer_type,
      status: customer.status,
      credit_limit: customer.credit_limit,
      notes: customer.notes || '',
      preferred_contact_method: customer.preferred_contact_method,
      email_notifications: customer.email_notifications,
      sms_notifications: customer.sms_notifications,
      business_name: customer.business_name || '',
      tax_id: customer.tax_id || '',
      business_type: customer.business_type || '',
    } : {
      name: '',
      email: '',
      phone: '',
      mobile: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'ایران',
      customer_type: 'INDIVIDUAL',
      status: 'ACTIVE',
      credit_limit: 0,
      notes: '',
      preferred_contact_method: 'phone',
      email_notifications: true,
      sms_notifications: true,
      business_name: '',
      tax_id: '',
      business_type: '',
    },
  });

  const customerType = watch('customer_type');

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setLoading(true);
      
      const customerData = {
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
        mobile: data.mobile || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        postal_code: data.postal_code || undefined,
        notes: data.notes || undefined,
        business_name: data.business_name || undefined,
        tax_id: data.tax_id || undefined,
        business_type: data.business_type || undefined,
        tags,
      };

      let savedCustomer: Customer;
      if (customer) {
        savedCustomer = await customerService.updateCustomer(customer.id, customerData as CustomerUpdate);
        toast({
          title: 'موفقیت',
          description: 'اطلاعات مشتری با موفقیت به‌روزرسانی شد',
        });
      } else {
        savedCustomer = await customerService.createCustomer(customerData as CustomerCreate);
        toast({
          title: 'موفقیت',
          description: 'مشتری جدید با موفقیت ایجاد شد',
        });
      }

      onSave(savedCustomer);
    } catch (error) {
      toast({
        title: 'خطا',
        description: error instanceof Error ? error.message : 'خطا در ذخیره اطلاعات مشتری',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INDIVIDUAL':
        return <User className="h-4 w-4" />;
      case 'BUSINESS':
        return <Building className="h-4 w-4" />;
      case 'VIP':
        return <Crown className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
            {getTypeIcon(customerType)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {customer ? 'ویرایش مشتری' : 'مشتری جدید'}
            </h1>
            <p className="text-sm text-gray-500">
              {customer ? 'ویرایش اطلاعات مشتری' : 'ایجاد مشتری جدید'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 ml-2" />
            انصراف
          </Button>
          <Button 
            variant="gradient-green" 
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
          >
            <Save className="h-4 w-4 ml-2" />
            {loading ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">اطلاعات پایه</TabsTrigger>
            <TabsTrigger value="contact">اطلاعات تماس</TabsTrigger>
            <TabsTrigger value="business">اطلاعات تجاری</TabsTrigger>
            <TabsTrigger value="settings">تنظیمات</TabsTrigger>
          </TabsList>

          {/* Basic Information */}
          <TabsContent value="basic" className="space-y-6">
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  اطلاعات پایه
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">نام مشتری *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="نام کامل مشتری"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_type">نوع مشتری</Label>
                    <Select
                      value={customerType}
                      onValueChange={(value) => setValue('customer_type', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INDIVIDUAL">شخصی</SelectItem>
                        <SelectItem value="BUSINESS">تجاری</SelectItem>
                        <SelectItem value="VIP">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">وضعیت</Label>
                    <Select
                      value={watch('status')}
                      onValueChange={(value) => setValue('status', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">فعال</SelectItem>
                        <SelectItem value="INACTIVE">غیرفعال</SelectItem>
                        <SelectItem value="BLOCKED">مسدود</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="credit_limit">سقف اعتبار (تومان)</Label>
                    <Input
                      id="credit_limit"
                      type="number"
                      {...register('credit_limit', { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>برچسب‌ها</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="برچسب جدید"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">یادداشت‌ها</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="یادداشت‌های مربوط به مشتری"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Information */}
          <TabsContent value="contact" className="space-y-6">
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  اطلاعات تماس
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">ایمیل</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="example@email.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">تلفن ثابت</Label>
                    <Input
                      id="phone"
                      {...register('phone')}
                      placeholder="021-12345678"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile">تلفن همراه</Label>
                    <Input
                      id="mobile"
                      {...register('mobile')}
                      placeholder="09123456789"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferred_contact_method">روش ارتباط ترجیحی</Label>
                    <Select
                      value={watch('preferred_contact_method')}
                      onValueChange={(value) => setValue('preferred_contact_method', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">تلفن</SelectItem>
                        <SelectItem value="email">ایمیل</SelectItem>
                        <SelectItem value="sms">پیامک</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">آدرس</Label>
                  <Textarea
                    id="address"
                    {...register('address')}
                    placeholder="آدرس کامل"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">شهر</Label>
                    <Input
                      id="city"
                      {...register('city')}
                      placeholder="تهران"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">استان</Label>
                    <Input
                      id="state"
                      {...register('state')}
                      placeholder="تهران"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code">کد پستی</Label>
                    <Input
                      id="postal_code"
                      {...register('postal_code')}
                      placeholder="1234567890"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">کشور</Label>
                  <Input
                    id="country"
                    {...register('country')}
                    placeholder="ایران"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Information */}
          <TabsContent value="business" className="space-y-6">
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  اطلاعات تجاری
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customerType === 'BUSINESS' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_name">نام تجاری</Label>
                      <Input
                        id="business_name"
                        {...register('business_name')}
                        placeholder="نام شرکت یا کسب‌وکار"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tax_id">شناسه مالیاتی</Label>
                      <Input
                        id="tax_id"
                        {...register('tax_id')}
                        placeholder="شناسه مالیاتی"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="business_type">نوع کسب‌وکار</Label>
                      <Input
                        id="business_type"
                        {...register('business_type')}
                        placeholder="نوع فعالیت تجاری"
                      />
                    </div>
                  </div>
                )}

                {customerType !== 'BUSINESS' && (
                  <div className="text-center py-8 text-gray-500">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>اطلاعات تجاری فقط برای مشتریان تجاری قابل تنظیم است</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  تنظیمات اعلان‌ها
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email_notifications">اعلان‌های ایمیل</Label>
                    <p className="text-sm text-gray-500">دریافت اعلان‌ها از طریق ایمیل</p>
                  </div>
                  <input
                    id="email_notifications"
                    type="checkbox"
                    {...register('email_notifications')}
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sms_notifications">اعلان‌های پیامکی</Label>
                    <p className="text-sm text-gray-500">دریافت اعلان‌ها از طریق پیامک</p>
                  </div>
                  <input
                    id="sms_notifications"
                    type="checkbox"
                    {...register('sms_notifications')}
                    className="h-4 w-4"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
};

export default CustomerForm;